// Tipos de la base de datos, escritos a partir de supabase/migrations.
// Siguen el formato de `supabase gen types typescript`; si modificas el esquema,
// puedes regenerarlos con: npx supabase gen types typescript --project-id <id> > src/types/database.ts

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type Timestamps = { created_at: string; updated_at: string };

export type AppRole = "teacher" | "student";
export type WorkKind = "article" | "cover";
export type WorkStatus = "draft" | "submitted" | "changes_requested" | "approved" | "rejected" | "published";
export type ReviewDecision = "approved" | "changes_requested" | "rejected" | "reopened";
export type MagazineStatus = "draft" | "published" | "unpublished";
export type Visibility = "private" | "public";
export type PageTypeDb = "cover" | "index" | "editorial" | "article" | "credits" | "back_cover" | "thanks" | "custom";
export type TemplateKind = "cover" | "article" | "extra";
export type OrientationDb = "portrait" | "landscape";

type GroupRow = Timestamps & { id: string; name: string; description: string | null; is_active: boolean };
type ProfileRow = Timestamps & {
  id: string;
  username: string;
  display_name: string;
  editorial_name: string | null;
  role: AppRole;
  group_id: string | null;
  is_active: boolean;
  must_change_password: boolean;
  created_by: string | null;
};
type TemplateRow = Timestamps & {
  id: string;
  name: string;
  description: string;
  category: string;
  kind: TemplateKind;
  orientation: OrientationDb;
  preview_image: string | null;
  template_schema: Json;
  is_active: boolean;
  is_builtin: boolean;
  sort_order: number;
};
type MagazineRow = Timestamps & {
  id: string;
  public_id: string;
  title: string;
  description: string | null;
  group_id: string | null;
  owner_id: string;
  status: MagazineStatus;
  visibility: Visibility;
  allow_pdf_download: boolean;
  orientation: OrientationDb;
  edition_label: string | null;
  school_cycle: string | null;
  content_version: number;
  published_at: string | null;
};
type AssignmentRow = Timestamps & {
  id: string;
  title: string;
  description: string | null;
  group_id: string;
  magazine_id: string | null;
  work_kind: WorkKind | null;
  due_date: string | null;
  allowed_template_ids: string[];
  is_active: boolean;
  created_by: string | null;
};
type ArticleRow = Timestamps & {
  id: string;
  kind: WorkKind;
  title: string;
  author_id: string;
  group_id: string | null;
  assignment_id: string | null;
  magazine_id: string | null;
  template_id: string | null;
  content_json: Json;
  status: WorkStatus;
  version: number;
  submitted_at: string | null;
  approved_at: string | null;
};
type ArticleVersionRow = {
  id: string;
  article_id: string;
  version: number;
  title: string;
  content_json: Json;
  reason: "submitted" | "before_reopen";
  created_by: string | null;
  created_at: string;
};
type ArticleReviewRow = {
  id: string;
  article_id: string;
  reviewer_id: string | null;
  decision: ReviewDecision;
  comments: string | null;
  article_version: number;
  created_at: string;
};
type MagazinePageRow = Timestamps & {
  id: string;
  magazine_id: string;
  page_order: number;
  page_type: PageTypeDb;
  template_id: string | null;
  source_article_id: string | null;
  content_json: Json;
};
type PublicationRow = {
  id: string;
  magazine_id: string;
  public_id: string;
  version_number: number;
  title: string;
  visibility: Visibility;
  allow_pdf_download: boolean;
  orientation: OrientationDb;
  snapshot: Json;
  published_by: string | null;
  published_at: string;
  unpublished_at: string | null;
  is_current: boolean;
};
type MediaAssetRow = {
  id: string;
  owner_id: string;
  magazine_id: string | null;
  storage_path: string;
  original_filename: string;
  mime_type: string;
  size_bytes: number;
  width: number | null;
  height: number | null;
  sha256: string;
  credit_author: string | null;
  credit_source: string | null;
  credit_license: string | null;
  description: string | null;
  publication_approved: boolean;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
};
type AuditLogRow = {
  id: number;
  actor_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  details: Json;
  created_at: string;
};
type LoginAttemptRow = { id: number; username: string; ip_hash: string | null; success: boolean; created_at: string };
type AppSettingsRow = {
  id: number;
  school_name: string;
  max_image_mb: number;
  user_quota_mb: number;
  total_quota_mb: number;
  privacy_policy: string;
  image_notice: string;
  updated_by: string | null;
  updated_at: string;
};

type Rel<Name extends string, Col extends string, Ref extends string> = {
  foreignKeyName: Name;
  columns: [Col];
  isOneToOne: false;
  referencedRelation: Ref;
  referencedColumns: ["id"];
};

/** Insert: obligatorias las columnas sin valor por defecto; Update: todo opcional. */
type Table<Row, Required extends keyof Row, Relationships extends unknown[] = []> = {
  Row: Row;
  Insert: Pick<Row, Required> & Partial<Omit<Row, Required>>;
  Update: Partial<Row>;
  Relationships: Relationships;
};

export type Database = {
  public: {
    Tables: {
      groups: Table<GroupRow, "name">;
      profiles: Table<ProfileRow, "id" | "username" | "display_name", [Rel<"profiles_group_id_fkey", "group_id", "groups">]>;
      templates: Table<TemplateRow, "id" | "name" | "category" | "kind" | "template_schema">;
      magazines: Table<MagazineRow, "title" | "owner_id", [Rel<"magazines_group_id_fkey", "group_id", "groups">]>;
      assignments: Table<
        AssignmentRow,
        "title" | "group_id",
        [Rel<"assignments_group_id_fkey", "group_id", "groups">, Rel<"assignments_magazine_id_fkey", "magazine_id", "magazines">]
      >;
      articles: Table<
        ArticleRow,
        "title" | "author_id" | "content_json",
        [
          Rel<"articles_author_id_fkey", "author_id", "profiles">,
          Rel<"articles_group_id_fkey", "group_id", "groups">,
          Rel<"articles_assignment_id_fkey", "assignment_id", "assignments">,
          Rel<"articles_magazine_id_fkey", "magazine_id", "magazines">,
        ]
      >;
      article_versions: Table<ArticleVersionRow, "article_id" | "version" | "title" | "content_json" | "reason", [Rel<"article_versions_article_id_fkey", "article_id", "articles">]>;
      article_reviews: Table<ArticleReviewRow, "article_id" | "decision" | "article_version", [Rel<"article_reviews_article_id_fkey", "article_id", "articles">, Rel<"article_reviews_reviewer_id_fkey", "reviewer_id", "profiles">]>;
      magazine_pages: Table<MagazinePageRow, "magazine_id" | "page_order" | "content_json", [Rel<"magazine_pages_magazine_id_fkey", "magazine_id", "magazines">]>;
      magazine_publications: Table<
        PublicationRow,
        "magazine_id" | "public_id" | "version_number" | "title" | "visibility" | "allow_pdf_download" | "orientation" | "snapshot",
        [Rel<"magazine_publications_magazine_id_fkey", "magazine_id", "magazines">]
      >;
      media_assets: Table<MediaAssetRow, "owner_id" | "storage_path" | "original_filename" | "mime_type" | "size_bytes" | "sha256", [Rel<"media_assets_owner_id_fkey", "owner_id", "profiles">, Rel<"media_assets_approved_by_fkey", "approved_by", "profiles">]>;
      audit_logs: Table<AuditLogRow, "action" | "entity_type", [Rel<"audit_logs_actor_id_fkey", "actor_id", "profiles">]>;
      login_attempts: Table<LoginAttemptRow, "username" | "success">;
      app_settings: Table<AppSettingsRow, never>;
    };
    Views: { [_ in never]: never };
    Functions: {
      submit_work: { Args: { p_work_id: string }; Returns: ArticleRow };
      review_work: { Args: { p_work_id: string; p_decision: ReviewDecision; p_comment: string | null }; Returns: ArticleRow };
      save_magazine_pages: { Args: { p_magazine_id: string; p_expected_version: number; p_pages: Json }; Returns: number };
      publish_magazine: { Args: { p_magazine_id: string }; Returns: PublicationRow };
      unpublish_magazine: { Args: { p_magazine_id: string }; Returns: undefined };
      is_teacher: { Args: Record<string, never>; Returns: boolean };
      storage_usage: { Args: Record<string, never>; Returns: { user_bytes: number; total_bytes: number }[] };
      storage_usage_by_user: { Args: Record<string, never>; Returns: { owner_id: string; files: number; bytes: number }[] };
      asset_reference_count: { Args: { p_asset_id: string }; Returns: number };
    };
    Enums: {
      app_role: AppRole;
      work_kind: WorkKind;
      work_status: WorkStatus;
      review_decision: ReviewDecision;
      magazine_status: MagazineStatus;
      visibility: Visibility;
      page_type: PageTypeDb;
      template_kind: TemplateKind;
      orientation: OrientationDb;
    };
    CompositeTypes: { [_ in never]: never };
  };
};

export type Tables<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Row"];
export type TablesInsert<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Insert"];
export type TablesUpdate<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Update"];
