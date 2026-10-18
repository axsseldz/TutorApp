import { requireRole } from "@/lib/auth";

// Todo /tutor/* es solo para tutores aprobados (además de la verificación en cada action).
export default async function TutorLayout({ children }: LayoutProps<"/tutor">) {
  await requireRole(["TUTOR"], "/tutor");
  return children;
}
