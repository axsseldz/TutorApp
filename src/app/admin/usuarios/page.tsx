import type { Metadata } from "next";
import Link from "next/link";
import { Users } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { formatShortDay } from "@/lib/dates";
import { formatMXN } from "@/lib/money";
import { ROLE_LABEL, RoleBadge } from "@/components/labels";
import { Card, EmptyState, PageHeader, cn, inputClass } from "@/components/ui";
import type { Role } from "@/generated/prisma/enums";

export const metadata: Metadata = { title: "Usuarios" };

const ROLES: Role[] = ["STUDENT", "TUTOR", "ADMIN"];

export default async function UsersPage({ searchParams }: PageProps<"/admin/usuarios">) {
  await requireRole(["ADMIN"], "/admin/usuarios");
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const role = ROLES.includes(sp.rol as Role) ? (sp.rol as Role) : undefined;

  const users = await prisma.user.findMany({
    where: {
      ...(role ? { role } : {}),
      ...(q ? { OR: [{ name: { contains: q } }, { email: { contains: q } }] } : {}),
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      career: true,
      semester: true,
      createdAt: true,
      tutorProfile: { select: { hourlyRateCents: true } },
      _count: { select: { sessionsAsStudent: true, sessionsAsTutor: true } },
    },
  });

  const roleHref = (r?: Role) => {
    const p = new URLSearchParams();
    if (r) p.set("rol", r);
    if (q) p.set("q", q);
    const s = p.toString();
    return s ? `/admin/usuarios?${s}` : "/admin/usuarios";
  };

  return (
    <>
      <PageHeader title="Usuarios" description={`${users.length} ${users.length === 1 ? "usuario" : "usuarios"}`} />
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <form className="flex-1" role="search">
          {role ? <input type="hidden" name="rol" value={role} /> : null}
          <label htmlFor="q" className="sr-only">
            Buscar por nombre o correo
          </label>
          <input id="q" name="q" defaultValue={q} placeholder="Buscar por nombre o correo…" className={inputClass} />
        </form>
        <div className="flex flex-wrap gap-1 text-sm">
          {[undefined, ...ROLES].map((r) => (
            <Link
              key={r ?? "all"}
              href={roleHref(r)}
              className={cn(
                "rounded-lg px-3 py-1.5 font-medium",
                role === r ? "bg-blue-100 text-blue-800" : "text-slate-600 hover:bg-slate-100",
              )}
            >
              {r ? ROLE_LABEL[r] : "Todos"}
            </Link>
          ))}
        </div>
      </div>

      {users.length === 0 ? (
        <EmptyState icon={<Users />} title="Sin resultados" description="Ningún usuario coincide con la búsqueda." />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[44rem] text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-left text-slate-600">
              <tr>
                <th scope="col" className="px-4 py-3 font-semibold">Nombre</th>
                <th scope="col" className="px-4 py-3 font-semibold">Rol</th>
                <th scope="col" className="px-4 py-3 font-semibold">Carrera</th>
                <th scope="col" className="px-4 py-3 text-right font-semibold">Sesiones (est. / tutor)</th>
                <th scope="col" className="px-4 py-3 font-semibold">Registro</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((u) => (
                <tr key={u.id}>
                  <td className="px-4 py-3">
                    {u.role === "TUTOR" ? (
                      <Link href={`/tutores/${u.id}`} className="font-medium text-blue-700 hover:underline">
                        {u.name}
                      </Link>
                    ) : (
                      <p className="font-medium">{u.name}</p>
                    )}
                    <p className="text-xs text-slate-500">{u.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    <RoleBadge role={u.role} />
                    {u.tutorProfile ? (
                      <p className="mt-1 text-xs text-slate-500">{formatMXN(u.tutorProfile.hourlyRateCents)}/h</p>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {u.career ?? "—"}
                    {u.semester ? ` · ${u.semester}.º` : ""}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {u._count.sessionsAsStudent} / {u._count.sessionsAsTutor}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-600">{formatShortDay(u.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </>
  );
}
