import type { Metadata } from "next";
import { SettingsForm } from "@/components/teacher/forms";
import { Card, PageHeader } from "@/components/ui/misc";
import { requireTeacher } from "@/lib/auth/session";
import { getSettings } from "@/lib/storage/assets";

export const metadata: Metadata = { title: "Ajustes" };

export default async function SettingsPage() {
  const { supabase } = await requireTeacher();
  const s = await getSettings(supabase);
  return (
    <>
      <PageHeader title="Ajustes" description="Límites de almacenamiento, aviso sobre imágenes y aviso de privacidad de la escuela." />
      <Card className="max-w-3xl p-6">
        <SettingsForm
          settings={{
            school_name: s.school_name,
            max_image_mb: Number(s.max_image_mb),
            user_quota_mb: s.user_quota_mb,
            total_quota_mb: s.total_quota_mb,
            privacy_policy: s.privacy_policy,
            image_notice: s.image_notice,
          }}
        />
      </Card>
    </>
  );
}
