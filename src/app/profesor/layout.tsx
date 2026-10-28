import type { ReactNode } from "react";
import { TeacherShell } from "@/components/layout/app-shell";
import { requireTeacher } from "@/lib/auth/session";

export default async function TeacherLayout({ children }: { children: ReactNode }) {
  // Cada página y cada Server Action vuelven a comprobar el rol; esto solo decide la navegación.
  const { profile } = await requireTeacher();
  return <TeacherShell name={profile.display_name}>{children}</TeacherShell>;
}
