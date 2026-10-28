-- Funciones de cuotas y referencias de imágenes.

-- Espacio usado por el usuario actual y por toda la escuela (en bytes).
create function public.storage_usage()
returns table (user_bytes bigint, total_bytes bigint)
language sql stable security definer set search_path = '' as $$
  select
    coalesce((select sum(m.size_bytes) from public.media_assets m where m.owner_id = (select auth.uid())), 0)::bigint,
    coalesce((select sum(m.size_bytes) from public.media_assets m), 0)::bigint;
$$;

-- Espacio por usuario (solo profesor).
create function public.storage_usage_by_user()
returns table (owner_id uuid, files bigint, bytes bigint)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_teacher() then
    raise exception 'Solo el profesor puede consultar el almacenamiento' using errcode = '42501';
  end if;
  return query
    select m.owner_id, count(*)::bigint, sum(m.size_bytes)::bigint
      from public.media_assets m
     group by m.owner_id
     order by 3 desc;
end;
$$;

-- Cuántos documentos (trabajos, páginas de revista y publicaciones, incluidas las
-- versiones anteriores) usan una imagen. Solo el dueño o el profesor pueden consultarlo.
create function public.asset_reference_count(p_asset_id uuid) returns integer
language plpgsql stable security definer set search_path = '' as $$
declare
  v_owner uuid;
  v_needle text := p_asset_id::text;
  v_count integer;
begin
  select owner_id into v_owner from public.media_assets where id = p_asset_id;
  if v_owner is null then
    return 0;
  end if;
  -- Nota: aquí NO sirve is_privileged_context(): dentro de SECURITY DEFINER,
  -- current_user siempre es el propietario de la función.
  if v_owner is distinct from (select auth.uid()) and not public.is_teacher() then
    raise exception 'No tienes permiso para consultar esta imagen' using errcode = '42501';
  end if;
  select
    (select count(*) from public.articles a where strpos(a.content_json::text, v_needle) > 0)
    + (select count(*) from public.article_versions v where strpos(v.content_json::text, v_needle) > 0)
    + (select count(*) from public.magazine_pages p where strpos(p.content_json::text, v_needle) > 0)
    + (select count(*) from public.magazine_publications pub where strpos(pub.snapshot::text, v_needle) > 0)
  into v_count;
  return v_count;
end;
$$;

revoke execute on function public.storage_usage() from public, anon;
revoke execute on function public.storage_usage_by_user() from public, anon;
revoke execute on function public.asset_reference_count(uuid) from public, anon;
grant execute on function public.storage_usage() to authenticated;
grant execute on function public.storage_usage_by_user() to authenticated;
grant execute on function public.asset_reference_count(uuid) to authenticated;
