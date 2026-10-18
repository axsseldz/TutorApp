import type { Metadata } from "next";
import { ExternalLink, FileText, Inbox } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { formatDateTime } from "@/lib/dates";
import { formatMXN } from "@/lib/money";
import { ApplicationStatusBadge } from "@/components/labels";
import { ReviewApplicationActions } from "@/components/forms/admin-forms";
import { Avatar, Badge, Card, EmptyState, PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "Solicitudes de tutor" };

const include = {
  user: { select: { name: true, email: true, career: true, semester: true } },
  subjects: { select: { name: true }, orderBy: { name: "asc" as const } },
  reviewedBy: { select: { name: true } },
};

export default async function ApplicationsPage() {
  await requireRole(["ADMIN"], "/admin/solicitudes");
  const [pending, reviewed] = await Promise.all([
    prisma.tutorApplication.findMany({ where: { status: "PENDING" }, orderBy: { createdAt: "asc" }, include }),
    prisma.tutorApplication.findMany({
      where: { status: { not: "PENDING" } },
      orderBy: { reviewedAt: "desc" },
      take: 30,
      include,
    }),
  ]);

  return (
    <>
      <PageHeader
        title="Solicitudes de tutor"
        description="Revisa el kárdex o constancia antes de aprobar. Solo los tutores aprobados aparecen en las búsquedas."
      />

      <h2 className="mb-3 text-lg font-semibold">Pendientes ({pending.length})</h2>
      {pending.length === 0 ? (
        <EmptyState icon={<Inbox />} title="No hay solicitudes pendientes" description="Cuando un estudiante solicite ser tutor aparecerá aquí." />
      ) : (
        <ul className="space-y-4">
          {pending.map((a) => (
            <li key={a.id}>
              <Card className="p-5">
                <div className="flex flex-col gap-5 lg:flex-row">
                  <div className="min-w-0 flex-1 space-y-3">
                    <div className="flex items-center gap-3">
                      <Avatar name={a.user.name} />
                      <div className="min-w-0">
                        <p className="font-semibold">{a.user.name}</p>
                        <p className="truncate text-sm text-slate-500">
                          {a.user.email}
                          {a.user.career ? ` · ${a.user.career}` : ""}
                          {a.user.semester ? ` · ${a.user.semester}.º semestre` : ""}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {a.subjects.map((s) => (
                        <Badge key={s.name} tone="blue">
                          {s.name}
                        </Badge>
                      ))}
                      <Badge tone="orange">{formatMXN(a.hourlyRateCents)} / hora</Badge>
                    </div>
                    <p className="whitespace-pre-line text-sm text-slate-700">{a.bio}</p>
                    <p className="text-xs text-slate-500">Enviada el {formatDateTime(a.createdAt)}</p>
                  </div>
                  <div className="space-y-3 lg:w-72">
                    <a
                      href={`/api/documentos/${a.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 rounded-xl border border-slate-200 p-3 text-sm hover:border-blue-400 hover:bg-blue-50"
                    >
                      <FileText className="size-6 shrink-0 text-blue-700" aria-hidden />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">{a.documentName}</span>
                        <span className="text-xs text-slate-500">Ver documento</span>
                      </span>
                      <ExternalLink className="size-4 text-slate-400" aria-hidden />
                    </a>
                    <ReviewApplicationActions applicationId={a.id} />
                  </div>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}

      <h2 className="mb-3 mt-10 text-lg font-semibold">Revisadas recientemente</h2>
      {reviewed.length === 0 ? (
        <p className="text-sm text-slate-500">Todavía no se ha revisado ninguna solicitud.</p>
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[40rem] text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-left text-slate-600">
              <tr>
                <th scope="col" className="px-4 py-3 font-semibold">Solicitante</th>
                <th scope="col" className="px-4 py-3 font-semibold">Estado</th>
                <th scope="col" className="px-4 py-3 font-semibold">Revisó</th>
                <th scope="col" className="px-4 py-3 font-semibold">Motivo</th>
                <th scope="col" className="px-4 py-3 font-semibold">Documento</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {reviewed.map((a) => (
                <tr key={a.id}>
                  <td className="px-4 py-3">
                    <p className="font-medium">{a.user.name}</p>
                    <p className="text-xs text-slate-500">{a.user.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    <ApplicationStatusBadge status={a.status} />
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-600">
                    {a.reviewedBy?.name ?? "—"}
                    <br />
                    {a.reviewedAt ? formatDateTime(a.reviewedAt) : ""}
                  </td>
                  <td className="max-w-xs px-4 py-3 text-xs text-slate-600">{a.rejectionReason ?? "—"}</td>
                  <td className="px-4 py-3">
                    <a href={`/api/documentos/${a.id}`} target="_blank" rel="noopener noreferrer" className="text-blue-700 hover:underline">
                      Ver
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </>
  );
}
