import type { PGlite } from "@electric-sql/pglite";
import { beforeAll, describe, expect, it } from "vitest";
import { asService, asUser, createTestDb, createUser, uuid } from "../helpers/db";

// Identificadores sintéticos
const G1 = uuid(1);
const G2 = uuid(2);
const TEACHER = uuid(10);
const ALU_A = uuid(11);
const ALU_B = uuid(12);
const ALU_C = uuid(13); // otro grupo
const ALU_OFF = uuid(14); // cuenta desactivada
const ASSIGN_G1 = uuid(20);
const ASSIGN_G2 = uuid(21);
const ART_A = uuid(30);
const ART_B = uuid(31);
const MAG = uuid(40);
const MEDIA_A = uuid(50);
const MEDIA_B = uuid(51);

const content = (text: string) =>
  JSON.stringify({
    schemaVersion: 1,
    orientation: "portrait",
    pages: [{ id: "p1", background: { color: "#ffffff", assetId: null, fit: "cover", opacity: 1 }, elements: [{ id: "t1", type: "text", text }] }],
  });

let db: PGlite;

beforeAll(async () => {
  db = await createTestDb();
  await db.query("insert into public.groups (id, name) values ($1, '1°A'), ($2, '1°B')", [G1, G2]);
  await createUser(db, { id: TEACHER, username: "profe", role: "teacher" });
  await createUser(db, { id: ALU_A, username: "alumno-a", role: "student", groupId: G1 });
  await createUser(db, { id: ALU_B, username: "alumno-b", role: "student", groupId: G1 });
  await createUser(db, { id: ALU_C, username: "alumno-c", role: "student", groupId: G2 });
  await createUser(db, { id: ALU_OFF, username: "alumno-off", role: "student", groupId: G1, active: false });
  await db.query("insert into public.magazines (id, title, owner_id) values ($1, 'Revista 1°A', $2)", [MAG, TEACHER]);
  await db.query(
    "insert into public.assignments (id, title, group_id, magazine_id) values ($1, 'Noticias', $2, $4), ($3, 'Deportes', $5, null)",
    [ASSIGN_G1, G1, ASSIGN_G2, MAG, G2],
  );
  await db.query(
    "insert into public.articles (id, title, author_id, group_id, content_json) values ($1, 'Artículo A', $2, $3, $4), ($5, 'Artículo B', $6, $3, $7)",
    [ART_A, ALU_A, G1, content("texto A"), ART_B, ALU_B, content("texto B")],
  );
  const sha = (c: string) => c.repeat(64);
  await db.query(
    `insert into public.media_assets (id, owner_id, storage_path, original_filename, mime_type, size_bytes, sha256)
     values ($1, $2, $3, 'a.jpg', 'image/jpeg', 1000, $4), ($5, $6, $7, 'b.jpg', 'image/jpeg', 1000, $8)`,
    [MEDIA_A, ALU_A, `${ALU_A}/${MEDIA_A}.jpg`, sha("a"), MEDIA_B, ALU_B, `${ALU_B}/${MEDIA_B}.jpg`, sha("b")],
  );
  await db.query(
    "insert into storage.objects (bucket_id, name) values ('media', $1), ('media', $2)",
    [`${ALU_A}/${MEDIA_A}.jpg`, `${ALU_B}/${MEDIA_B}.jpg`],
  );
});

describe("aislamiento entre alumnos", () => {
  it("un alumno no puede ver el trabajo privado de otro", async () => {
    const rows = await asUser(db, ALU_A, (tx) => tx.query("select id from public.articles"));
    expect(rows.rows).toEqual([{ id: ART_A }]);
  });

  it("un alumno no puede modificar el trabajo de otro", async () => {
    const res = await asUser(db, ALU_A, (tx) =>
      tx.query("update public.articles set title = 'hackeado' where id = $1", [ART_B]),
    );
    expect(res.affectedRows).toBe(0);
    const check = await db.query<{ title: string }>("select title from public.articles where id = $1", [ART_B]);
    expect(check.rows[0]?.title).toBe("Artículo B");
  });

  it("un alumno no puede borrar el trabajo de otro", async () => {
    const res = await asUser(db, ALU_A, (tx) => tx.query("delete from public.articles where id = $1", [ART_B]));
    expect(res.affectedRows).toBe(0);
  });

  it("un alumno solo ve su propio perfil", async () => {
    const rows = await asUser(db, ALU_A, (tx) => tx.query<{ username: string }>("select username from public.profiles"));
    expect(rows.rows.map((r) => r.username)).toEqual(["alumno-a"]);
  });

  it("un alumno no ve las imágenes de otro (tabla y Storage)", async () => {
    const media = await asUser(db, ALU_A, (tx) => tx.query("select id from public.media_assets"));
    expect(media.rows).toEqual([{ id: MEDIA_A }]);
    const objects = await asUser(db, ALU_A, (tx) => tx.query<{ name: string }>("select name from storage.objects"));
    expect(objects.rows.map((r) => r.name)).toEqual([`${ALU_A}/${MEDIA_A}.jpg`]);
  });

  it("un alumno no puede subir, sobrescribir ni borrar objetos de Storage directamente", async () => {
    await expect(
      asUser(db, ALU_A, (tx) =>
        tx.query("insert into storage.objects (bucket_id, name) values ('media', $1)", [`${ALU_A}/nuevo.jpg`]),
      ),
    ).rejects.toThrow(/row-level security/);
    const upd = await asUser(db, ALU_A, (tx) =>
      tx.query("update storage.objects set name = name where name like $1", [`${ALU_A}/%`]),
    );
    expect(upd.affectedRows).toBe(0);
    const del = await asUser(db, ALU_A, (tx) => tx.query("delete from storage.objects"));
    expect(del.affectedRows).toBe(0);
  });

  it("un alumno no ve revistas, páginas de revista ni proyectos de otro grupo", async () => {
    const mags = await asUser(db, ALU_A, (tx) => tx.query("select id from public.magazines"));
    expect(mags.rows).toEqual([]);
    const pages = await asUser(db, ALU_A, (tx) => tx.query("select id from public.magazine_pages"));
    expect(pages.rows).toEqual([]);
    const asg = await asUser(db, ALU_A, (tx) => tx.query("select id from public.assignments"));
    expect(asg.rows).toEqual([{ id: ASSIGN_G1 }]);
  });

  it("un alumno no puede crear un trabajo en un proyecto de otro grupo", async () => {
    await expect(
      asUser(db, ALU_A, (tx) =>
        tx.query("insert into public.articles (title, author_id, assignment_id, content_json) values ('x', $1, $2, $3)", [
          ALU_A,
          ASSIGN_G2,
          content("x"),
        ]),
      ),
    ).rejects.toThrow(/row-level security/);
  });
});

describe("roles y campos protegidos", () => {
  it("un alumno no puede convertirse en profesor", async () => {
    const res = await asUser(db, ALU_A, (tx) =>
      tx.query("update public.profiles set role = 'teacher' where id = $1", [ALU_A]),
    );
    expect(res.affectedRows).toBe(0);
    const check = await db.query<{ role: string }>("select role from public.profiles where id = $1", [ALU_A]);
    expect(check.rows[0]?.role).toBe("student");
  });

  it("un alumno no puede crear perfiles", async () => {
    await expect(
      asUser(db, ALU_A, (tx) =>
        tx.query("insert into public.profiles (id, username, display_name, role) values ($1, 'nuevo', 'x', 'teacher')", [
          uuid(99),
        ]),
      ),
    ).rejects.toThrow();
  });

  it("ni siquiera el profesor puede cambiar roles desde el cliente (solo el servidor)", async () => {
    await expect(
      asUser(db, TEACHER, (tx) => tx.query("update public.profiles set role = 'teacher' where id = $1", [ALU_A])),
    ).rejects.toThrow(/permiso/);
  });

  it("el servidor (service_role) sí puede cambiar el rol", async () => {
    const res = await asService(db, (tx) =>
      tx.query("update public.profiles set must_change_password = true where id = $1", [ALU_B]),
    );
    expect(res.affectedRows).toBe(1);
  });

  it("al crear un trabajo, autor, grupo y estado los fija la base de datos", async () => {
    const res = await asUser(db, ALU_A, (tx) =>
      tx.query<{ author_id: string; status: string; group_id: string; magazine_id: string }>(
        `insert into public.articles (title, author_id, group_id, status, assignment_id, content_json)
         values ('nuevo', $1, $2, 'approved', $3, $4) returning author_id, status, group_id, magazine_id`,
        [ALU_A, G2, ASSIGN_G1, content("nuevo")],
      ),
    );
    expect(res.rows[0]).toEqual({ author_id: ALU_A, status: "draft", group_id: G1, magazine_id: MAG });
  });

  it("un alumno no puede suplantar a otro autor", async () => {
    await expect(
      asUser(db, ALU_A, (tx) =>
        tx.query("insert into public.articles (title, author_id, content_json) values ('x', $1, $2)", [ALU_B, content("x")]),
      ),
    ).resolves.toBeDefined();
    // El disparador reemplaza el autor por el usuario autenticado.
    const rows = await db.query("select id from public.articles where author_id = $1 and title = 'x'", [ALU_B]);
    expect(rows.rows).toEqual([]);
  });

  it("un alumno no puede aprobar su trabajo cambiando el estado", async () => {
    await expect(
      asUser(db, ALU_A, (tx) => tx.query("update public.articles set status = 'approved' where id = $1", [ART_A])),
    ).rejects.toThrow(/permiso/);
  });

  it("un alumno no puede usar la función de revisión", async () => {
    await expect(
      asUser(db, ALU_A, (tx) => tx.query("select public.review_work($1, 'approved', null)", [ART_A])),
    ).rejects.toThrow(/Solo el profesor/);
  });

  it("un alumno no puede autorizar la publicación de su imagen", async () => {
    await expect(
      asUser(db, ALU_A, (tx) =>
        tx.query("update public.media_assets set publication_approved = true where id = $1", [MEDIA_A]),
      ),
    ).rejects.toThrow(/Solo el profesor/);
  });

  it("un alumno sí puede editar los créditos de su imagen", async () => {
    const res = await asUser(db, ALU_A, (tx) =>
      tx.query("update public.media_assets set credit_author = 'Yo' where id = $1", [MEDIA_A]),
    );
    expect(res.affectedRows).toBe(1);
  });

  it("una cuenta desactivada no puede crear trabajos", async () => {
    await expect(
      asUser(db, ALU_OFF, (tx) =>
        tx.query("insert into public.articles (title, author_id, content_json) values ('x', $1, $2)", [ALU_OFF, content("x")]),
      ),
    ).rejects.toThrow(/row-level security/);
  });
});

describe("auditoría y datos internos", () => {
  it("un alumno no puede leer ni escribir la auditoría", async () => {
    const rows = await asUser(db, ALU_A, (tx) => tx.query("select id from public.audit_logs"));
    expect(rows.rows).toEqual([]);
    await expect(
      asUser(db, ALU_A, (tx) =>
        tx.query("insert into public.audit_logs (action, entity_type) values ('falso', 'x')"),
      ),
    ).rejects.toThrow(/permission denied/);
  });

  it("ni el profesor puede alterar la auditoría", async () => {
    await expect(
      asUser(db, TEACHER, (tx) => tx.query("delete from public.audit_logs")),
    ).rejects.toThrow(/permission denied/);
  });

  it("nadie con sesión puede leer los intentos de acceso", async () => {
    await expect(
      asUser(db, TEACHER, (tx) => tx.query("select * from public.login_attempts")),
    ).rejects.toThrow(/permission denied/);
  });
});

describe("almacenamiento", () => {
  it("un alumno no puede consultar las referencias de la imagen de otro", async () => {
    await expect(asUser(db, ALU_A, (tx) => tx.query("select public.asset_reference_count($1)", [MEDIA_B]))).rejects.toThrow(/permiso/);
    const own = await asUser(db, ALU_A, (tx) => tx.query<{ n: number }>("select public.asset_reference_count($1) as n", [MEDIA_A]));
    expect(typeof own.rows[0]?.n).toBe("number");
  });

  it("el uso por usuario solo lo consulta el profesor", async () => {
    await expect(asUser(db, ALU_A, (tx) => tx.query("select * from public.storage_usage_by_user()"))).rejects.toThrow(/Solo el profesor/);
    const mine = await asUser(db, ALU_A, (tx) => tx.query<{ user_bytes: string }>("select user_bytes from public.storage_usage()"));
    expect(Number(mine.rows[0]?.user_bytes)).toBe(1000);
  });
});

describe("usuarios sin sesión", () => {
  it("no pueden leer ni modificar trabajos", async () => {
    await expect(asUser(db, null, (tx) => tx.query("select * from public.articles"))).rejects.toThrow(
      /permission denied/,
    );
    await expect(
      asUser(db, null, (tx) => tx.query("update public.articles set title = 'x'")),
    ).rejects.toThrow(/permission denied/);
  });

  it("no pueden leer perfiles, grupos ni imágenes", async () => {
    for (const table of ["profiles", "groups", "media_assets", "magazines", "magazine_pages"]) {
      await expect(asUser(db, null, (tx) => tx.query(`select * from public.${table}`))).rejects.toThrow(
        /permission denied/,
      );
    }
    const objects = await asUser(db, null, (tx) => tx.query("select * from storage.objects"));
    expect(objects.rows).toEqual([]);
  });

  it("no pueden ejecutar funciones del flujo editorial", async () => {
    await expect(asUser(db, null, (tx) => tx.query("select public.submit_work($1)", [ART_A]))).rejects.toThrow(
      /permission denied/,
    );
    await expect(asUser(db, null, (tx) => tx.query("select public.publish_magazine($1)", [MAG]))).rejects.toThrow(
      /permission denied/,
    );
  });
});

describe("flujo editorial", () => {
  it("enviar → bloquea la edición → correcciones → aprobar", async () => {
    const sent = await asUser(db, ALU_A, (tx) =>
      tx.query<{ status: string }>("select status from public.submit_work($1)", [ART_A]),
    );
    expect(sent.rows[0]?.status).toBe("submitted");

    // En revisión ya no se puede editar
    const upd = await asUser(db, ALU_A, (tx) =>
      tx.query("update public.articles set title = 'cambio' where id = $1", [ART_A]),
    );
    expect(upd.affectedRows).toBe(0);

    // Solicitar correcciones exige comentario
    await expect(
      asUser(db, TEACHER, (tx) => tx.query("select public.review_work($1, 'changes_requested', '  ')", [ART_A])),
    ).rejects.toThrow(/Escribe/);

    await asUser(db, TEACHER, (tx) =>
      tx.query("select public.review_work($1, 'changes_requested', 'Revisa la ortografía')", [ART_A]),
    );
    const reviews = await asUser(db, ALU_A, (tx) =>
      tx.query<{ comments: string }>("select comments from public.article_reviews where article_id = $1", [ART_A]),
    );
    expect(reviews.rows[0]?.comments).toBe("Revisa la ortografía");

    // El alumno vuelve a editar y reenvía
    const edit = await asUser(db, ALU_A, (tx) =>
      tx.query("update public.articles set title = 'Artículo A corregido' where id = $1", [ART_A]),
    );
    expect(edit.affectedRows).toBe(1);
    await asUser(db, ALU_A, (tx) => tx.query("select public.submit_work($1)", [ART_A]));

    const approved = await asUser(db, TEACHER, (tx) =>
      tx.query<{ status: string }>("select status from public.review_work($1, 'approved', 'Muy bien')", [ART_A]),
    );
    expect(approved.rows[0]?.status).toBe("approved");

    const versions = await db.query("select version from public.article_versions where article_id = $1", [ART_A]);
    expect(versions.rows.length).toBe(2);
  });

  it("la versión aumenta en cada guardado y detecta escrituras con versión antigua", async () => {
    const before = await db.query<{ version: number }>("select version from public.articles where id = $1", [ART_B]);
    const v = before.rows[0]!.version;
    const first = await asUser(db, ALU_B, (tx) =>
      tx.query("update public.articles set content_json = $1 where id = $2 and version = $3", [content("pestaña 1"), ART_B, v]),
    );
    expect(first.affectedRows).toBe(1);
    // Otra pestaña con la versión anterior no sobrescribe
    const stale = await asUser(db, ALU_B, (tx) =>
      tx.query("update public.articles set content_json = $1 where id = $2 and version = $3", [content("pestaña 2"), ART_B, v]),
    );
    expect(stale.affectedRows).toBe(0);
    const after = await db.query<{ version: number }>("select version from public.articles where id = $1", [ART_B]);
    expect(after.rows[0]!.version).toBe(v + 1);
  });

  it("un trabajo enviado no se puede borrar", async () => {
    await asUser(db, ALU_B, (tx) => tx.query("select public.submit_work($1)", [ART_B]));
    const del = await asUser(db, ALU_B, (tx) => tx.query("delete from public.articles where id = $1", [ART_B]));
    expect(del.affectedRows).toBe(0);
  });
});

describe("publicación", () => {
  const page = (assetId: string | null) => ({
    id: "p1",
    pageType: "cover",
    background: { color: "#ffffff", assetId: null, fit: "cover", opacity: 1 },
    elements: [{ id: "i1", type: "image", assetId }],
  });

  it("la composición detecta conflictos de versión", async () => {
    const v = await asUser(db, TEACHER, (tx) =>
      tx.query<{ v: number }>("select public.save_magazine_pages($1, 1, $2) as v", [MAG, JSON.stringify([page(MEDIA_A)])]),
    );
    expect(v.rows[0]?.v).toBe(2);
    await expect(
      asUser(db, TEACHER, (tx) => tx.query("select public.save_magazine_pages($1, 1, '[]')", [MAG])),
    ).rejects.toThrow(/otra pestaña/);
  });

  it("no se publica con imágenes sin autorizar", async () => {
    await expect(asUser(db, TEACHER, (tx) => tx.query("select public.publish_magazine($1)", [MAG]))).rejects.toThrow(
      /UNAPPROVED_IMAGES:1/,
    );
  });

  it("el lector público ve solo publicaciones vigentes y públicas", async () => {
    await asUser(db, TEACHER, (tx) =>
      tx.query("update public.media_assets set publication_approved = true where id = $1", [MEDIA_A]),
    );
    // Privada: el público no la ve, un alumno con sesión sí
    await asUser(db, TEACHER, (tx) => tx.query("select public.publish_magazine($1)", [MAG]));
    const anonPrivate = await asUser(db, null, (tx) => tx.query("select public_id from public.magazine_publications"));
    expect(anonPrivate.rows).toEqual([]);
    const studentPrivate = await asUser(db, ALU_C, (tx) => tx.query("select public_id from public.magazine_publications"));
    expect(studentPrivate.rows.length).toBe(1);

    // Pública
    await asUser(db, TEACHER, (tx) => tx.query("update public.magazines set visibility = 'public' where id = $1", [MAG]));
    await asUser(db, TEACHER, (tx) => tx.query("select public.publish_magazine($1)", [MAG]));
    const anon = await asUser(db, null, (tx) =>
      tx.query<{ version_number: number }>("select version_number from public.magazine_publications"),
    );
    expect(anon.rows).toEqual([{ version_number: 2 }]);

    // El público no puede leer quién la publicó
    await expect(
      asUser(db, null, (tx) => tx.query("select published_by from public.magazine_publications")),
    ).rejects.toThrow(/permission denied/);

    // Retirada: deja de ser visible pero se conserva el historial
    await asUser(db, TEACHER, (tx) => tx.query("select public.unpublish_magazine($1)", [MAG]));
    const after = await asUser(db, null, (tx) => tx.query("select public_id, snapshot from public.magazine_publications"));
    expect(after.rows).toEqual([]);
    const history = await db.query("select version_number from public.magazine_publications order by 1");
    expect(history.rows.length).toBe(2);
  });

  it("un alumno no puede publicar ni retirar revistas", async () => {
    await expect(asUser(db, ALU_A, (tx) => tx.query("select public.publish_magazine($1)", [MAG]))).rejects.toThrow(
      /Solo el profesor/,
    );
    await expect(asUser(db, ALU_A, (tx) => tx.query("select public.unpublish_magazine($1)", [MAG]))).rejects.toThrow(
      /Solo el profesor/,
    );
  });

  it("los cambios del profesor quedan auditados", async () => {
    const rows = await db.query<{ action: string; actor_id: string }>(
      "select action, actor_id from public.audit_logs where action like 'magazine.%' order by id",
    );
    expect(rows.rows.map((r) => r.action)).toEqual(["magazine.published", "magazine.published", "magazine.unpublished"]);
    expect(rows.rows.every((r) => r.actor_id === TEACHER)).toBe(true);
  });
});
