import { Search, Users } from "lucide-react";
import type { Metadata } from "next";
import { ImportCsvButton, NewAccountButton, StudentActions } from "@/components/teacher/students";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/field";
import { Badge, Card, EmptyState, PageHeader, Pagination } from "@/components/ui/misc";
import { requireTeacher } from "@/lib/auth/session";
import { escapeSearch, formatDate, pageParam, textParam } from "@/lib/utils";

export const metadata: Metadata = { title: "Alumnos" };

const PAGE_SIZE = 25;
const SORTS = {
  nombre: { column: "display_name", ascending: true },
  usuario: { column: "username", ascending: true },
  reciente: { column: "created_at", ascending: false },
} as const;

export default async function StudentsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { supabase } = await requireTeacher();
  const params = await searchParams;
  const q = textParam(params.q);
  const group = textParam(params.grupo);
  const estado = textParam(params.estado) || "activos";
  const orden = (textParam(params.orden) || "nombre") as keyof typeof SORTS;
  const sort = SORTS[orden] ?? SORTS.nombre;
  const page = pageParam(params.pagina);

  let query = supabase
    .from("profiles")
    .select("id, username, display_name, editorial_name, group_id, is_active, must_change_password, created_at", { count: "exact" })
    .eq("role", "student");
  if (q) query = query.or(`display_name.ilike.%${escapeSearch(q)}%,username.ilike.%${escapeSearch(q)}%`);
  if (/^[0-9a-f-]{36}$/.test(group)) query = query.eq("group_id", group);
  if (group === "sin") query = query.is("group_id", null);
  if (estado === "activos") query = query.eq("is_active", true);
  if (estado === "inactivos") query = query.eq("is_active", false);
  query = query.order(sort.column, { ascending: sort.ascending }).range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

  const [{ data: students, count }, { data: groups }] = await Promise.all([query, supabase.from("groups").select("id, name").eq("is_active", true).order("name")]);
  const ids = (students ?? []).map((s) => s.id);
  const { data: works } = ids.length ? await supabase.from("articles").select("author_id").in("author_id", ids) : { data: [] };
  const workCount = new Map<string, number>();
  for (const w of works ?? []) workCount.set(w.author_id, (workCount.get(w.author_id) ?? 0) + 1);
  const groupName = new Map((groups ?? []).map((g) => [g.id, g.name]));

  const hrefFor = (p: number) => {
    const sp = new URLSearchParams();
    if (q) sp.set("q", q);
    if (group) sp.set("grupo", group);
    if (estado !== "activos") sp.set("estado", estado);
    if (orden !== "nombre") sp.set("orden", orden);
    sp.set("pagina", String(p));
    return `/profesor/alumnos?${sp}`;
  };

  return (
    <>
      <PageHeader
        title="Alumnos"
        description="Las cuentas no necesitan correo electrónico. Tú creas el usuario y una contraseña temporal."
        actions={
          <>
            <ImportCsvButton />
            <NewAccountButton groups={groups ?? []} />
          </>
        }
      />

      <form className="mb-4 grid gap-2 sm:grid-cols-[1fr_auto_auto_auto_auto]" role="search">
        <label className="relative">
          <span className="sr-only">Buscar por nombre o usuario</span>
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-tinta-suave" aria-hidden />
          <Input name="q" defaultValue={q} placeholder="Buscar por nombre o usuario" className="pl-9" />
        </label>
        <Select name="grupo" defaultValue={group} aria-label="Filtrar por grupo">
          <option value="">Todos los grupos</option>
          <option value="sin">Sin grupo</option>
          {(groups ?? []).map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </Select>
        <Select name="estado" defaultValue={estado} aria-label="Filtrar por estado">
          <option value="activos">Activos</option>
          <option value="inactivos">Desactivados</option>
          <option value="todos">Todos</option>
        </Select>
        <Select name="orden" defaultValue={orden} aria-label="Ordenar">
          <option value="nombre">Ordenar por nombre</option>
          <option value="usuario">Ordenar por usuario</option>
          <option value="reciente">Más recientes</option>
        </Select>
        <Button type="submit" variant="secondary">
          Aplicar
        </Button>
      </form>

      {(students ?? []).length === 0 ? (
        <EmptyState icon={Users} title={q || group ? "No hay alumnos con esos filtros" : "Todavía no hay alumnos"}>
          {q || group ? "Prueba con otra búsqueda." : "Registra a tus alumnos uno por uno o importa un archivo CSV."}
        </EmptyState>
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-linea bg-papel/60 text-xs tracking-wide text-tinta-suave uppercase">
              <tr>
                <th scope="col" className="px-4 py-3">Nombre visible</th>
                <th scope="col" className="px-4 py-3">Usuario</th>
                <th scope="col" className="px-4 py-3">Grupo</th>
                <th scope="col" className="px-4 py-3">Estado</th>
                <th scope="col" className="px-4 py-3">Registro</th>
                <th scope="col" className="px-4 py-3 text-right">Trabajos</th>
                <th scope="col" className="px-4 py-3"><span className="sr-only">Acciones</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-linea">
              {(students ?? []).map((s) => (
                <tr key={s.id} className="hover:bg-papel/50">
                  <td className="px-4 py-3">
                    <p className="font-bold">{s.display_name}</p>
                    {s.editorial_name && <p className="text-xs text-tinta-suave">Nombre editorial: {s.editorial_name}</p>}
                  </td>
                  <td className="px-4 py-3 font-mono text-[0.85rem]">{s.username}</td>
                  <td className="px-4 py-3">{s.group_id ? (groupName.get(s.group_id) ?? "Grupo inactivo") : "—"}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {s.is_active ? <Badge tone="green">Activa</Badge> : <Badge tone="red">Desactivada</Badge>}
                      {s.must_change_password && s.is_active && <Badge tone="amber">Contraseña temporal</Badge>}
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">{formatDate(s.created_at)}</td>
                  <td className="px-4 py-3 text-right font-bold tabular-nums">{workCount.get(s.id) ?? 0}</td>
                  <td className="px-2 py-3 text-right">
                    <StudentActions student={s} groups={groups ?? []} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
      <Pagination page={page} pageSize={PAGE_SIZE} total={count ?? 0} hrefFor={hrefFor} />
    </>
  );
}
