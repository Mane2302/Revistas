import type { Metadata } from "next";
import { MediaManager } from "@/components/student/media-manager";
import { PageHeader } from "@/components/ui/misc";
import { listMyMediaAction } from "@/lib/actions/media";
import { requireStudent } from "@/lib/auth/session";
import { getSettings } from "@/lib/storage/assets";

export const metadata: Metadata = { title: "Mis imágenes" };

export default async function StudentImagesPage() {
  const { supabase } = await requireStudent();
  const [items, settings, { data: usage }] = await Promise.all([listMyMediaAction(), getSettings(supabase), supabase.rpc("storage_usage")]);
  return (
    <>
      <PageHeader title="Mis imágenes" description="Tus fotografías son privadas: solo tú y tu profesor pueden verlas. Se publican solo si el profesor lo autoriza." />
      <MediaManager
        initial={items}
        maxImageMb={Number(settings.max_image_mb)}
        notice={settings.image_notice}
        usedBytes={Number(usage?.[0]?.user_bytes ?? 0)}
        quotaBytes={settings.user_quota_mb * 1024 * 1024}
      />
    </>
  );
}
