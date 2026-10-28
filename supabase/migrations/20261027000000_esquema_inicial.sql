-- =====================================================================
-- Revista Escolar Digital — esquema inicial
-- Todas las tablas tienen Row Level Security. Las transiciones de estado
-- (enviar, revisar, publicar) solo ocurren dentro de funciones SECURITY
-- DEFINER que comprueban el rol y el estado actual.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Tipos enumerados
-- ---------------------------------------------------------------------
create type public.app_role as enum ('teacher', 'student');
create type public.work_kind as enum ('article', 'cover');
create type public.work_status as enum ('draft', 'submitted', 'changes_requested', 'approved', 'rejected', 'published');
create type public.review_decision as enum ('approved', 'changes_requested', 'rejected', 'reopened');
create type public.magazine_status as enum ('draft', 'published', 'unpublished');
create type public.visibility as enum ('private', 'public');
create type public.page_type as enum ('cover', 'index', 'editorial', 'article', 'credits', 'back_cover', 'thanks', 'custom');
create type public.template_kind as enum ('cover', 'article', 'extra');
create type public.orientation as enum ('portrait', 'landscape');

-- ---------------------------------------------------------------------
-- Utilidades
-- ---------------------------------------------------------------------
create function public.set_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Identificador público difícil de adivinar (80 bits aleatorios).
create function public.random_public_id() returns text
language sql volatile set search_path = '' as $$
  select substr(replace(gen_random_uuid()::text, '-', ''), 1, 20);
$$;

-- Verdadero cuando la operación la ejecuta el servidor con la clave secreta
-- o una función SECURITY DEFINER (propiedad de postgres).
create function public.is_privileged_context() returns boolean
language sql stable set search_path = '' as $$
  select current_user in ('postgres', 'service_role', 'supabase_admin');
$$;

-- ---------------------------------------------------------------------
-- Grupos
-- ---------------------------------------------------------------------
create table public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 80),
  description text check (description is null or char_length(description) <= 500),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index groups_name_unique on public.groups (lower(btrim(name)));
create trigger groups_updated_at before update on public.groups
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- Perfiles (1:1 con auth.users). Sin correo, teléfono ni fecha de nacimiento.
-- ---------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null unique check (username ~ '^[a-z0-9][a-z0-9._-]{2,31}$'),
  display_name text not null check (char_length(btrim(display_name)) between 1 and 80),
  -- Seudónimo o nombre editorial que puede aparecer en publicaciones.
  editorial_name text check (editorial_name is null or char_length(btrim(editorial_name)) between 1 and 60),
  role public.app_role not null default 'student',
  group_id uuid references public.groups (id) on delete set null,
  is_active boolean not null default true,
  must_change_password boolean not null default true,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index profiles_group_idx on public.profiles (group_id);
create index profiles_role_idx on public.profiles (role);
create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- Funciones auxiliares para las políticas. SECURITY DEFINER evita la
-- recursión de RLS al consultar profiles desde sus propias políticas.
create function public.is_teacher() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.role = 'teacher' and p.is_active
  );
$$;

create function public.is_active_user() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.is_active
  );
$$;

create function public.my_group_id() returns uuid
language sql stable security definer set search_path = '' as $$
  select p.group_id from public.profiles p
  where p.id = (select auth.uid()) and p.is_active;
$$;

-- Un cliente nunca puede cambiar usuario, rol, estado de la cuenta ni la
-- marca de cambio de contraseña: eso solo lo hace el servidor.
create function public.profiles_guard() returns trigger
language plpgsql set search_path = '' as $$
begin
  if public.is_privileged_context() then
    return new;
  end if;
  if new.id <> old.id
     or new.username <> old.username
     or new.role <> old.role
     or new.is_active <> old.is_active
     or new.must_change_password <> old.must_change_password
     or new.created_by is distinct from old.created_by
     or new.created_at <> old.created_at then
    raise exception 'No tienes permiso para modificar estos datos de la cuenta'
      using errcode = '42501';
  end if;
  return new;
end;
$$;
create trigger profiles_guard before update on public.profiles
  for each row execute function public.profiles_guard();

-- ---------------------------------------------------------------------
-- Plantillas (las predefinidas se cargan en la migración de plantillas)
-- ---------------------------------------------------------------------
create table public.templates (
  id text primary key check (id ~ '^[a-z0-9-]{3,60}$'),
  name text not null check (char_length(name) between 1 and 80),
  description text not null default '' check (char_length(description) <= 300),
  category text not null check (char_length(category) between 1 and 60),
  kind public.template_kind not null,
  orientation public.orientation not null default 'portrait',
  preview_image text,
  template_schema jsonb not null,
  is_active boolean not null default true,
  is_builtin boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger templates_updated_at before update on public.templates
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- Revistas
-- ---------------------------------------------------------------------
create table public.magazines (
  id uuid primary key default gen_random_uuid(),
  public_id text not null unique default public.random_public_id(),
  title text not null check (char_length(btrim(title)) between 1 and 120),
  description text check (description is null or char_length(description) <= 1000),
  group_id uuid references public.groups (id) on delete set null,
  owner_id uuid not null references public.profiles (id) on delete restrict,
  status public.magazine_status not null default 'draft',
  visibility public.visibility not null default 'private',
  allow_pdf_download boolean not null default false,
  orientation public.orientation not null default 'portrait',
  edition_label text check (edition_label is null or char_length(edition_label) <= 60),
  school_cycle text check (school_cycle is null or char_length(school_cycle) <= 60),
  -- Versión de la composición, para detectar conflictos entre pestañas.
  content_version integer not null default 1 check (content_version >= 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz
);
create index magazines_group_idx on public.magazines (group_id);
create trigger magazines_updated_at before update on public.magazines
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- Proyectos asignados
-- ---------------------------------------------------------------------
create table public.assignments (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(btrim(title)) between 1 and 120),
  description text check (description is null or char_length(description) <= 2000),
  group_id uuid not null references public.groups (id) on delete cascade,
  magazine_id uuid references public.magazines (id) on delete set null,
  -- null = el alumno puede crear artículos o portadas
  work_kind public.work_kind,
  due_date date,
  -- vacío = todas las plantillas activas
  allowed_template_ids text[] not null default '{}',
  is_active boolean not null default true,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index assignments_group_idx on public.assignments (group_id) where is_active;
create trigger assignments_updated_at before update on public.assignments
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- Trabajos de los alumnos (artículos y portadas)
-- ---------------------------------------------------------------------
create table public.articles (
  id uuid primary key default gen_random_uuid(),
  kind public.work_kind not null default 'article',
  title text not null check (char_length(btrim(title)) between 1 and 150),
  author_id uuid not null references public.profiles (id) on delete cascade,
  group_id uuid references public.groups (id) on delete set null,
  assignment_id uuid references public.assignments (id) on delete set null,
  magazine_id uuid references public.magazines (id) on delete set null,
  template_id text references public.templates (id) on delete set null,
  content_json jsonb not null check (octet_length(content_json::text) <= 800000),
  status public.work_status not null default 'draft',
  version integer not null default 1 check (version >= 1),
  submitted_at timestamptz,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index articles_author_idx on public.articles (author_id, updated_at desc);
create index articles_status_idx on public.articles (status, submitted_at desc);
create index articles_group_idx on public.articles (group_id);
create index articles_assignment_idx on public.articles (assignment_id);
create trigger articles_updated_at before update on public.articles
  for each row execute function public.set_updated_at();

-- Al crear: el autor, el grupo y el estado los fija la base de datos, no el cliente.
create function public.articles_before_insert() returns trigger
language plpgsql set search_path = '' as $$
begin
  if public.is_privileged_context() then
    return new;
  end if;
  new.author_id := (select auth.uid());
  new.group_id := public.my_group_id();
  new.status := 'draft';
  new.version := 1;
  new.submitted_at := null;
  new.approved_at := null;
  if new.assignment_id is not null then
    select a.magazine_id into new.magazine_id
    from public.assignments a where a.id = new.assignment_id;
  else
    new.magazine_id := null;
  end if;
  return new;
end;
$$;
create trigger articles_before_insert before insert on public.articles
  for each row execute function public.articles_before_insert();

-- Al editar: el alumno solo puede cambiar título, plantilla y contenido.
-- La versión aumenta en la base de datos para detectar conflictos.
create function public.articles_before_update() returns trigger
language plpgsql set search_path = '' as $$
begin
  if public.is_privileged_context() then
    return new;
  end if;
  if new.id <> old.id
     or new.author_id <> old.author_id
     or new.kind <> old.kind
     or new.group_id is distinct from old.group_id
     or new.assignment_id is distinct from old.assignment_id
     or new.magazine_id is distinct from old.magazine_id
     or new.status <> old.status
     or new.submitted_at is distinct from old.submitted_at
     or new.approved_at is distinct from old.approved_at
     or new.created_at <> old.created_at then
    raise exception 'No tienes permiso para modificar estos datos del trabajo'
      using errcode = '42501';
  end if;
  if new.content_json is distinct from old.content_json
     or new.title is distinct from old.title
     or new.template_id is distinct from old.template_id then
    new.version := old.version + 1;
  else
    new.version := old.version;
  end if;
  return new;
end;
$$;
create trigger articles_before_update before update on public.articles
  for each row execute function public.articles_before_update();

-- Versiones guardadas (al enviar a revisión y antes de reabrir).
create table public.article_versions (
  id uuid primary key default gen_random_uuid(),
  article_id uuid not null references public.articles (id) on delete cascade,
  version integer not null,
  title text not null,
  content_json jsonb not null,
  reason text not null check (reason in ('submitted', 'before_reopen')),
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (article_id, version, reason)
);

-- Revisiones del profesor. Los comentarios nunca forman parte de una publicación.
create table public.article_reviews (
  id uuid primary key default gen_random_uuid(),
  article_id uuid not null references public.articles (id) on delete cascade,
  reviewer_id uuid references public.profiles (id) on delete set null,
  decision public.review_decision not null,
  comments text check (comments is null or char_length(comments) <= 2000),
  article_version integer not null,
  created_at timestamptz not null default now()
);
create index article_reviews_article_idx on public.article_reviews (article_id, created_at desc);

-- ---------------------------------------------------------------------
-- Páginas de la revista (composición del profesor). Los artículos se
-- copian aquí: editar la composición nunca modifica el trabajo original.
-- ---------------------------------------------------------------------
create table public.magazine_pages (
  id uuid primary key default gen_random_uuid(),
  magazine_id uuid not null references public.magazines (id) on delete cascade,
  page_order integer not null check (page_order >= 0),
  page_type public.page_type not null default 'custom',
  template_id text references public.templates (id) on delete set null,
  source_article_id uuid references public.articles (id) on delete set null,
  content_json jsonb not null check (octet_length(content_json::text) <= 400000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (magazine_id, page_order)
);
create index magazine_pages_source_idx on public.magazine_pages (source_article_id);

-- Publicaciones: cada publicación es una instantánea inmutable y versionada.
create table public.magazine_publications (
  id uuid primary key default gen_random_uuid(),
  magazine_id uuid not null references public.magazines (id) on delete cascade,
  public_id text not null,
  version_number integer not null check (version_number >= 1),
  title text not null,
  visibility public.visibility not null,
  allow_pdf_download boolean not null,
  orientation public.orientation not null,
  snapshot jsonb not null,
  published_by uuid references public.profiles (id) on delete set null,
  published_at timestamptz not null default now(),
  unpublished_at timestamptz,
  is_current boolean not null default true,
  unique (magazine_id, version_number)
);
create unique index magazine_publications_one_current on public.magazine_publications (magazine_id) where is_current;
create index magazine_publications_public_idx on public.magazine_publications (public_id) where is_current;

-- ---------------------------------------------------------------------
-- Imágenes (los archivos viven en Storage; aquí solo su referencia)
-- ---------------------------------------------------------------------
create table public.media_assets (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  magazine_id uuid references public.magazines (id) on delete set null,
  storage_path text not null unique
    check (storage_path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.(jpg|png|webp)$'),
  original_filename text not null check (char_length(original_filename) between 1 and 200),
  mime_type text not null check (mime_type in ('image/jpeg', 'image/png', 'image/webp')),
  size_bytes integer not null check (size_bytes > 0 and size_bytes <= 52428800),
  width integer check (width is null or width > 0),
  height integer check (height is null or height > 0),
  sha256 text not null check (sha256 ~ '^[0-9a-f]{64}$'),
  credit_author text check (credit_author is null or char_length(credit_author) <= 120),
  credit_source text check (credit_source is null or char_length(credit_source) <= 300),
  credit_license text check (credit_license is null or char_length(credit_license) <= 120),
  description text check (description is null or char_length(description) <= 300),
  publication_approved boolean not null default false,
  approved_by uuid references public.profiles (id) on delete set null,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  unique (owner_id, sha256)
);
create index media_assets_owner_idx on public.media_assets (owner_id, created_at desc);

create function public.media_assets_guard() returns trigger
language plpgsql set search_path = '' as $$
begin
  if public.is_privileged_context() then
    return new;
  end if;
  if new.id <> old.id
     or new.owner_id <> old.owner_id
     or new.storage_path <> old.storage_path
     or new.mime_type <> old.mime_type
     or new.size_bytes <> old.size_bytes
     or new.sha256 <> old.sha256
     or new.width is distinct from old.width
     or new.height is distinct from old.height
     or new.magazine_id is distinct from old.magazine_id
     or new.created_at <> old.created_at then
    raise exception 'No puedes modificar estos datos de la imagen' using errcode = '42501';
  end if;
  if new.publication_approved is distinct from old.publication_approved then
    if not public.is_teacher() then
      raise exception 'Solo el profesor puede autorizar imágenes' using errcode = '42501';
    end if;
    new.approved_by := case when new.publication_approved then (select auth.uid()) else null end;
    new.approved_at := case when new.publication_approved then now() else null end;
  else
    new.approved_by := old.approved_by;
    new.approved_at := old.approved_at;
  end if;
  return new;
end;
$$;
create trigger media_assets_guard before update on public.media_assets
  for each row execute function public.media_assets_guard();

-- ---------------------------------------------------------------------
-- Auditoría (solo lectura para el profesor; nadie la modifica desde el cliente)
-- ---------------------------------------------------------------------
create table public.audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid references public.profiles (id) on delete set null,
  action text not null check (char_length(action) between 1 and 80),
  entity_type text not null check (char_length(entity_type) between 1 and 40),
  entity_id text,
  details jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index audit_logs_created_idx on public.audit_logs (created_at desc);

create function public.audit_row_change() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_id text;
begin
  v_id := case when tg_op = 'DELETE' then old.id::text else new.id::text end;
  insert into public.audit_logs (actor_id, action, entity_type, entity_id)
  values ((select auth.uid()), lower(tg_table_name) || '.' || lower(tg_op), tg_table_name, v_id);
  return coalesce(new, old);
end;
$$;
create trigger groups_audit after insert or update or delete on public.groups
  for each row execute function public.audit_row_change();
create trigger assignments_audit after insert or update or delete on public.assignments
  for each row execute function public.audit_row_change();
create trigger magazines_audit after insert or delete on public.magazines
  for each row execute function public.audit_row_change();
create trigger templates_audit after update on public.templates
  for each row execute function public.audit_row_change();

-- Intentos de acceso (solo servidor). Se guarda un hash de la IP, no la IP.
create table public.login_attempts (
  id bigint generated always as identity primary key,
  username text not null,
  ip_hash text,
  success boolean not null,
  created_at timestamptz not null default now()
);
create index login_attempts_user_idx on public.login_attempts (username, created_at desc);
create index login_attempts_ip_idx on public.login_attempts (ip_hash, created_at desc);

-- ---------------------------------------------------------------------
-- Ajustes de la aplicación (una sola fila; sin datos secretos)
-- ---------------------------------------------------------------------
create table public.app_settings (
  id smallint primary key default 1 check (id = 1),
  school_name text not null default 'Mi escuela' check (char_length(school_name) between 1 and 120),
  max_image_mb numeric(4, 1) not null default 5 check (max_image_mb >= 1 and max_image_mb <= 10),
  user_quota_mb integer not null default 100 check (user_quota_mb between 10 and 2000),
  total_quota_mb integer not null default 900 check (total_quota_mb between 100 and 100000),
  privacy_policy text not null default '' check (char_length(privacy_policy) <= 20000),
  image_notice text not null default 'Usa fotografías propias o imágenes con permiso para reutilizarlas. No publiques fotos en las que se reconozca a otras personas sin su autorización.'
    check (char_length(image_notice) <= 1000),
  updated_by uuid references public.profiles (id) on delete set null,
  updated_at timestamptz not null default now()
);
create trigger app_settings_updated_at before update on public.app_settings
  for each row execute function public.set_updated_at();
insert into public.app_settings (id) values (1);

-- =====================================================================
-- Row Level Security
-- =====================================================================
alter table public.groups enable row level security;
alter table public.profiles enable row level security;
alter table public.templates enable row level security;
alter table public.magazines enable row level security;
alter table public.assignments enable row level security;
alter table public.articles enable row level security;
alter table public.article_versions enable row level security;
alter table public.article_reviews enable row level security;
alter table public.magazine_pages enable row level security;
alter table public.magazine_publications enable row level security;
alter table public.media_assets enable row level security;
alter table public.audit_logs enable row level security;
alter table public.login_attempts enable row level security;
alter table public.app_settings enable row level security;

-- Defensa adicional: el rol anónimo solo puede leer publicaciones y ajustes.
revoke all on all tables in schema public from anon;
grant select (id, public_id, version_number, title, visibility, allow_pdf_download, orientation,
  snapshot, published_at, is_current) on public.magazine_publications to anon;
grant select (id, school_name, privacy_policy, image_notice) on public.app_settings to anon;
-- Tablas que ningún cliente debe escribir directamente.
revoke insert, update, delete on public.audit_logs, public.login_attempts,
  public.article_versions, public.article_reviews, public.magazine_publications
  from authenticated;
revoke select on public.login_attempts from authenticated;

-- groups
create policy groups_teacher_all on public.groups for all to authenticated
  using (public.is_teacher()) with check (public.is_teacher());
create policy groups_student_select on public.groups for select to authenticated
  using (id = public.my_group_id());

-- profiles: cada quien ve el suyo; el profesor ve y edita nombres y grupo.
create policy profiles_select on public.profiles for select to authenticated
  using (id = (select auth.uid()) or public.is_teacher());
create policy profiles_teacher_update on public.profiles for update to authenticated
  using (public.is_teacher()) with check (public.is_teacher());

-- templates
create policy templates_select on public.templates for select to authenticated
  using ((is_active and public.is_active_user()) or public.is_teacher());
create policy templates_teacher_update on public.templates for update to authenticated
  using (public.is_teacher()) with check (public.is_teacher());

-- magazines y su composición: solo el profesor.
create policy magazines_teacher_all on public.magazines for all to authenticated
  using (public.is_teacher()) with check (public.is_teacher());
create policy magazine_pages_teacher_all on public.magazine_pages for all to authenticated
  using (public.is_teacher()) with check (public.is_teacher());

-- assignments
create policy assignments_teacher_all on public.assignments for all to authenticated
  using (public.is_teacher()) with check (public.is_teacher());
create policy assignments_student_select on public.assignments for select to authenticated
  using (is_active and group_id = public.my_group_id());

-- articles
create policy articles_select on public.articles for select to authenticated
  using (author_id = (select auth.uid()) or public.is_teacher());
create policy articles_student_insert on public.articles for insert to authenticated
  with check (
    author_id = (select auth.uid())
    and public.is_active_user()
    and not public.is_teacher()
    and (
      assignment_id is null
      or exists (
        select 1 from public.assignments a
        where a.id = assignment_id and a.is_active and a.group_id = public.my_group_id()
      )
    )
  );
create policy articles_student_update on public.articles for update to authenticated
  using (
    author_id = (select auth.uid())
    and status in ('draft', 'changes_requested')
    and public.is_active_user()
  )
  with check (
    author_id = (select auth.uid())
    and status in ('draft', 'changes_requested')
  );
create policy articles_student_delete on public.articles for delete to authenticated
  using (author_id = (select auth.uid()) and status = 'draft' and public.is_active_user());

-- versiones y revisiones: lectura para el autor y el profesor.
create policy article_versions_select on public.article_versions for select to authenticated
  using (
    public.is_teacher()
    or exists (select 1 from public.articles a where a.id = article_id and a.author_id = (select auth.uid()))
  );
create policy article_reviews_select on public.article_reviews for select to authenticated
  using (
    public.is_teacher()
    or exists (select 1 from public.articles a where a.id = article_id and a.author_id = (select auth.uid()))
  );

-- publicaciones: públicas para todos; privadas solo para usuarios activos.
create policy publications_public_select on public.magazine_publications for select to anon, authenticated
  using (is_current and visibility = 'public');
create policy publications_private_select on public.magazine_publications for select to authenticated
  using ((is_current and public.is_active_user()) or public.is_teacher());

-- media_assets
create policy media_select on public.media_assets for select to authenticated
  using (owner_id = (select auth.uid()) or public.is_teacher());
create policy media_update on public.media_assets for update to authenticated
  using (owner_id = (select auth.uid()) or public.is_teacher())
  with check (owner_id = (select auth.uid()) or public.is_teacher());

-- auditoría
create policy audit_teacher_select on public.audit_logs for select to authenticated
  using (public.is_teacher());

-- ajustes
create policy settings_select on public.app_settings for select to anon, authenticated
  using (true);
create policy settings_teacher_update on public.app_settings for update to authenticated
  using (public.is_teacher()) with check (public.is_teacher());

-- login_attempts: sin políticas => solo accesible con la clave secreta del servidor.

-- =====================================================================
-- Funciones de flujo editorial (únicas que cambian estados)
-- =====================================================================

-- El alumno envía su trabajo a revisión.
create function public.submit_work(p_work_id uuid) returns public.articles
language plpgsql security definer set search_path = '' as $$
declare
  v public.articles;
begin
  select * into v from public.articles where id = p_work_id for update;
  if v.id is null or v.author_id <> (select auth.uid()) then
    raise exception 'No encontramos este trabajo' using errcode = 'P0002';
  end if;
  if not public.is_active_user() then
    raise exception 'Tu cuenta está desactivada' using errcode = '42501';
  end if;
  if v.status not in ('draft', 'changes_requested') then
    raise exception 'Este trabajo ya fue enviado' using errcode = 'PT409';
  end if;
  insert into public.article_versions (article_id, version, title, content_json, reason, created_by)
  values (v.id, v.version, v.title, v.content_json, 'submitted', (select auth.uid()))
  on conflict (article_id, version, reason) do nothing;
  update public.articles
     set status = 'submitted', submitted_at = now()
   where id = v.id
  returning * into v;
  insert into public.audit_logs (actor_id, action, entity_type, entity_id, details)
  values ((select auth.uid()), 'work.submitted', 'article', v.id::text, jsonb_build_object('version', v.version));
  return v;
end;
$$;

-- El profesor aprueba, rechaza, solicita correcciones o reabre un trabajo.
create function public.review_work(p_work_id uuid, p_decision public.review_decision, p_comment text)
returns public.articles
language plpgsql security definer set search_path = '' as $$
declare
  v public.articles;
  v_comment text := nullif(btrim(coalesce(p_comment, '')), '');
  v_new_status public.work_status;
begin
  if not public.is_teacher() then
    raise exception 'Solo el profesor puede revisar trabajos' using errcode = '42501';
  end if;
  if v_comment is not null and char_length(v_comment) > 2000 then
    raise exception 'El comentario es demasiado largo' using errcode = '22001';
  end if;
  select * into v from public.articles where id = p_work_id for update;
  if v.id is null then
    raise exception 'No encontramos este trabajo' using errcode = 'P0002';
  end if;

  if p_decision in ('approved', 'changes_requested', 'rejected') then
    if v.status <> 'submitted' then
      raise exception 'Solo se pueden revisar trabajos que están en revisión' using errcode = 'PT409';
    end if;
    if p_decision = 'changes_requested' and v_comment is null then
      raise exception 'Escribe qué debe corregir el alumno' using errcode = '22023';
    end if;
    v_new_status := case p_decision
      when 'approved' then 'approved'::public.work_status
      when 'rejected' then 'rejected'::public.work_status
      else 'changes_requested'::public.work_status end;
  else
    if v.status = 'draft' then
      raise exception 'El trabajo ya está abierto para edición' using errcode = 'PT409';
    end if;
    insert into public.article_versions (article_id, version, title, content_json, reason, created_by)
    values (v.id, v.version, v.title, v.content_json, 'before_reopen', (select auth.uid()))
    on conflict (article_id, version, reason) do nothing;
    v_new_status := 'draft';
  end if;

  insert into public.article_reviews (article_id, reviewer_id, decision, comments, article_version)
  values (v.id, (select auth.uid()), p_decision, v_comment, v.version);

  update public.articles
     set status = v_new_status,
         approved_at = case when v_new_status = 'approved' then now() else null end
   where id = v.id
  returning * into v;

  insert into public.audit_logs (actor_id, action, entity_type, entity_id, details)
  values ((select auth.uid()), 'work.' || p_decision::text, 'article', v.id::text,
          jsonb_build_object('version', v.version));
  return v;
end;
$$;

-- Guarda la composición completa de una revista con control de conflictos.
create function public.save_magazine_pages(p_magazine_id uuid, p_expected_version integer, p_pages jsonb)
returns integer
language plpgsql security definer set search_path = '' as $$
declare
  v_version integer;
begin
  if not public.is_teacher() then
    raise exception 'Solo el profesor puede editar revistas' using errcode = '42501';
  end if;
  if jsonb_typeof(p_pages) <> 'array' or jsonb_array_length(p_pages) > 80 then
    raise exception 'La revista tiene un formato no válido' using errcode = '22023';
  end if;
  select content_version into v_version from public.magazines where id = p_magazine_id for update;
  if v_version is null then
    raise exception 'No encontramos esta revista' using errcode = 'P0002';
  end if;
  if v_version <> p_expected_version then
    raise exception 'La revista se modificó en otra pestaña' using errcode = 'PT409';
  end if;

  delete from public.magazine_pages where magazine_id = p_magazine_id;
  insert into public.magazine_pages (magazine_id, page_order, page_type, template_id, source_article_id, content_json)
  select p_magazine_id,
         (t.ord - 1)::integer,
         coalesce(nullif(t.elem ->> 'pageType', '')::public.page_type, 'custom'),
         (select tp.id from public.templates tp where tp.id = t.elem ->> 'templateId'),
         (select a.id from public.articles a where a.id::text = t.elem ->> 'sourceArticleId'),
         t.elem
    from jsonb_array_elements(p_pages) with ordinality as t (elem, ord);

  update public.magazines
     set content_version = content_version + 1
   where id = p_magazine_id
  returning content_version into v_version;
  return v_version;
end;
$$;

-- Identificadores de imágenes referenciadas en un documento JSON.
create function public.referenced_asset_ids(p_doc jsonb) returns setof uuid
language sql immutable set search_path = '' as $$
  select distinct (x #>> '{}')::uuid
    from jsonb_path_query(p_doc, 'lax $.**.assetId') as x
   where jsonb_typeof(x) = 'string'
     and (x #>> '{}') ~ '^[0-9a-f-]{36}$';
$$;

-- Publica (o vuelve a publicar) una revista creando una nueva versión.
create function public.publish_magazine(p_magazine_id uuid) returns public.magazine_publications
language plpgsql security definer set search_path = '' as $$
declare
  v_mag public.magazines;
  v_pages jsonb;
  v_unapproved integer;
  v_number integer;
  v_pub public.magazine_publications;
begin
  if not public.is_teacher() then
    raise exception 'Solo el profesor puede publicar revistas' using errcode = '42501';
  end if;
  select * into v_mag from public.magazines where id = p_magazine_id for update;
  if v_mag.id is null then
    raise exception 'No encontramos esta revista' using errcode = 'P0002';
  end if;
  select jsonb_agg(mp.content_json order by mp.page_order) into v_pages
    from public.magazine_pages mp where mp.magazine_id = p_magazine_id;
  if v_pages is null then
    raise exception 'La revista no tiene páginas' using errcode = '22023';
  end if;

  select count(*) into v_unapproved
    from public.referenced_asset_ids(v_pages) as r (id)
    left join public.media_assets m on m.id = r.id
   where m.id is null or not m.publication_approved;
  if v_unapproved > 0 then
    raise exception 'UNAPPROVED_IMAGES:%', v_unapproved using errcode = 'PT422';
  end if;

  update public.magazine_publications
     set is_current = false, unpublished_at = coalesce(unpublished_at, now())
   where magazine_id = p_magazine_id and is_current;

  select coalesce(max(version_number), 0) + 1 into v_number
    from public.magazine_publications where magazine_id = p_magazine_id;

  insert into public.magazine_publications
    (magazine_id, public_id, version_number, title, visibility, allow_pdf_download, orientation, snapshot, published_by)
  values
    (v_mag.id, v_mag.public_id, v_number, v_mag.title, v_mag.visibility, v_mag.allow_pdf_download, v_mag.orientation,
     jsonb_build_object(
       'title', v_mag.title,
       'description', v_mag.description,
       'editionLabel', v_mag.edition_label,
       'schoolCycle', v_mag.school_cycle,
       'orientation', v_mag.orientation,
       'pages', v_pages),
     (select auth.uid()))
  returning * into v_pub;

  update public.magazines set status = 'published', published_at = now() where id = v_mag.id;

  update public.articles a
     set status = 'published'
   where a.status = 'approved'
     and a.id in (select mp.source_article_id from public.magazine_pages mp
                   where mp.magazine_id = p_magazine_id and mp.source_article_id is not null);

  insert into public.audit_logs (actor_id, action, entity_type, entity_id, details)
  values ((select auth.uid()), 'magazine.published', 'magazine', v_mag.id::text,
          jsonb_build_object('version', v_number));
  return v_pub;
end;
$$;

-- Retira la publicación vigente (se conserva el historial).
create function public.unpublish_magazine(p_magazine_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_teacher() then
    raise exception 'Solo el profesor puede retirar publicaciones' using errcode = '42501';
  end if;
  update public.magazine_publications
     set is_current = false, unpublished_at = now()
   where magazine_id = p_magazine_id and is_current;
  if not found then
    raise exception 'La revista no está publicada' using errcode = 'PT409';
  end if;
  update public.magazines set status = 'unpublished' where id = p_magazine_id;

  -- Los artículos vuelven a «aprobado» si ya no están en ninguna publicación vigente.
  update public.articles a
     set status = 'approved'
   where a.status = 'published'
     and a.id in (select mp.source_article_id from public.magazine_pages mp where mp.magazine_id = p_magazine_id)
     and not exists (
       select 1 from public.magazine_pages mp2
         join public.magazines m2 on m2.id = mp2.magazine_id and m2.status = 'published'
        where mp2.source_article_id = a.id);

  insert into public.audit_logs (actor_id, action, entity_type, entity_id)
  values ((select auth.uid()), 'magazine.unpublished', 'magazine', p_magazine_id::text);
end;
$$;

-- Permisos de ejecución: nada para anónimos; los usuarios con sesión pueden
-- llamar a las funciones, que comprueban el rol internamente.
revoke execute on function public.submit_work(uuid) from public, anon;
revoke execute on function public.review_work(uuid, public.review_decision, text) from public, anon;
revoke execute on function public.save_magazine_pages(uuid, integer, jsonb) from public, anon;
revoke execute on function public.publish_magazine(uuid) from public, anon;
revoke execute on function public.unpublish_magazine(uuid) from public, anon;
revoke execute on function public.audit_row_change() from public, anon, authenticated;
grant execute on function public.submit_work(uuid) to authenticated;
grant execute on function public.review_work(uuid, public.review_decision, text) to authenticated;
grant execute on function public.save_magazine_pages(uuid, integer, jsonb) to authenticated;
grant execute on function public.publish_magazine(uuid) to authenticated;
grant execute on function public.unpublish_magazine(uuid) to authenticated;

-- =====================================================================
-- Storage: bucket privado para imágenes
-- =====================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('media', 'media', false, 10485760, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Lectura: el dueño (primera carpeta = su id) o el profesor.
-- No hay políticas de INSERT/UPDATE/DELETE: las subidas usan URLs firmadas
-- que genera el servidor y los borrados los hace el servidor tras verificar referencias.
create policy media_objects_select on storage.objects for select to authenticated
  using (
    bucket_id = 'media'
    and (
      (storage.foldername(name))[1] = (select auth.uid())::text
      or public.is_teacher()
    )
  );
