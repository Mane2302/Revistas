import type { ReactNode } from "react";
import { StudentShell } from "@/components/layout/app-shell";
import { requireStudent } from "@/lib/auth/session";

export default async function StudentLayout({ children }: { children: ReactNode }) {
  const { profile } = await requireStudent();
  return <StudentShell name={profile.display_name}>{children}</StudentShell>;
}
