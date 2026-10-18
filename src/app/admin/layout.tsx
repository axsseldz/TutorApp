import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { AdminTabs } from "@/components/admin-tabs";

// Todo /admin/* es solo para administradores (además de la verificación en cada action).
export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  await requireRole(["ADMIN"], "/admin");
  const pending = await prisma.tutorApplication.count({ where: { status: "PENDING" } });
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-orange-600">Administración</p>
      <AdminTabs pending={pending} />
      {children}
    </div>
  );
}
