-- Réplica mínima del entorno de Supabase para ejecutar las migraciones en PGlite.
-- Reproduce: roles anon/authenticated/service_role, auth.uid() leído del JWT,
-- la tabla auth.users, el esquema storage y los permisos por defecto de Supabase.

create role anon nologin noinherit;
create role authenticated nologin noinherit;
create role service_role nologin noinherit bypassrls;

create schema auth;
create schema storage;
grant usage on schema public, auth, storage to anon, authenticated, service_role;

create table auth.users (
  id uuid primary key,
  email text unique,
  created_at timestamptz not null default now()
);

create function auth.uid() returns uuid language sql stable as $$
  select nullif(
    coalesce(
      current_setting('request.jwt.claim.sub', true),
      current_setting('request.jwt.claims', true)::jsonb ->> 'sub'
    ), '')::uuid;
$$;

create function auth.role() returns text language sql stable as $$
  select coalesce(
    current_setting('request.jwt.claim.role', true),
    current_setting('request.jwt.claims', true)::jsonb ->> 'role'
  );
$$;
grant execute on function auth.uid(), auth.role() to anon, authenticated, service_role;

create table storage.buckets (
  id text primary key,
  name text not null,
  public boolean default false,
  file_size_limit bigint,
  allowed_mime_types text[],
  created_at timestamptz default now()
);

create table storage.objects (
  id uuid primary key default gen_random_uuid(),
  bucket_id text references storage.buckets (id),
  name text not null,
  owner uuid,
  metadata jsonb,
  created_at timestamptz default now(),
  unique (bucket_id, name)
);
alter table storage.objects enable row level security;
grant select, insert, update, delete on storage.buckets, storage.objects to anon, authenticated, service_role;

create function storage.foldername(name text) returns text[] language sql immutable as $$
  select (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1) - 1];
$$;
grant execute on function storage.foldername(text) to anon, authenticated, service_role;

-- Supabase concede por defecto todos los privilegios del esquema public a estos roles;
-- la seguridad depende de RLS. Se replica para que las pruebas sean realistas.
grant all on all tables in schema public to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public grant execute on functions to anon, authenticated, service_role;
