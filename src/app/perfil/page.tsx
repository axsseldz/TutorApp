import type { Metadata } from "next";
import { BadgeCheck, FileText, Hourglass } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { formatDateTime } from "@/lib/dates";
import { formatMXN } from "@/lib/money";
import { ApplicationStatusBadge, RoleBadge } from "@/components/labels";
import { ProfileForm, TutorApplicationForm } from "@/components/forms/profile-forms";
import { Alert, ButtonLink, Card, PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "Mi perfil" };

export default async function ProfilePage({ searchParams }: PageProps<"/perfil">) {
  const session = await requireUser("/perfil");
  const { solicitud } = await searchParams;
  const [user, subjects, applications] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: session.id } }),
    prisma.subject.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.tutorApplication.findMany({
      where: { userId: session.id },
      orderBy: { createdAt: "desc" },
      include: { subjects: { select: { name: true }, orderBy: { name: "asc" } } },
    }),
  ]);
  const latest = applications[0];

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <PageHeader
        title="Mi perfil"
        description={
          <span className="inline-flex items-center gap-2">
            Tipo de cuenta: <RoleBadge role={user.role} />
          </span>
        }
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <Card className="h-fit p-6">
          <h2 className="mb-4 text-lg font-semibold">Mis datos</h2>
          <ProfileForm
            defaults={{
              name: user.name,
              email: user.email,
              career: user.career ?? "",
              semester: user.semester ? String(user.semester) : "",
              phone: user.phone ?? "",
            }}
          />
        </Card>

        {user.role !== "ADMIN" ? (
          <section id="ser-tutor" className="scroll-mt-24">
            <Card className="p-6">
              <h2 className="mb-1 text-lg font-semibold">Ser tutor</h2>
              {user.role === "TUTOR" ? (
                <div className="space-y-4">
                  <Alert tone="success">
                    <span className="inline-flex items-center gap-1 font-semibold">
                      <BadgeCheck className="size-4" aria-hidden /> Eres tutor verificado.
                    </span>{" "}
                    Administra tus materias, tarifa y horarios desde tu panel.
                  </Alert>
                  <div className="flex flex-wrap gap-2">
                    <ButtonLink href="/tutor">Ir al panel del tutor</ButtonLink>
                    <ButtonLink href={`/tutores/${user.id}`} variant="secondary">
                      Ver mi perfil público
                    </ButtonLink>
                  </div>
                </div>
              ) : latest?.status === "PENDING" ? (
                <div className="space-y-4">
                  {solicitud === "enviada" ? (
                    <Alert tone="success">
                      <strong>¡Solicitud enviada!</strong> Un administrador revisará tu documento.
                    </Alert>
                  ) : null}
                  <Alert tone="info">
                    <span className="inline-flex items-center gap-1 font-semibold">
                      <Hourglass className="size-4" aria-hidden /> Tu solicitud está en revisión.
                    </span>{" "}
                    Te avisaremos con una notificación cuando un administrador la apruebe o rechace.
                  </Alert>
                  <ApplicationSummary app={latest} />
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm text-slate-600">
                    ¿Vas en semestres avanzados y dominas alguna materia básica? Sube tu kárdex o constancia,
                    elige tus materias y tu tarifa. Un administrador revisará tu solicitud.
                  </p>
                  {latest?.status === "REJECTED" ? (
                    <Alert tone="error">
                      <strong>Tu última solicitud fue rechazada.</strong> Motivo: {latest.rejectionReason}. Puedes
                      corregirla y enviar una nueva.
                    </Alert>
                  ) : null}
                  <TutorApplicationForm subjects={subjects} />
                </div>
              )}
            </Card>

            {applications.length > 0 ? (
              <div className="mt-6">
                <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
                  Historial de solicitudes
                </h3>
                <ul className="space-y-2">
                  {applications.map((a) => (
                    <li key={a.id}>
                      <Card className="flex flex-wrap items-center justify-between gap-2 p-4 text-sm">
                        <span>Enviada el {formatDateTime(a.createdAt)}</span>
                        <ApplicationStatusBadge status={a.status} />
                      </Card>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </section>
        ) : null}
      </div>
    </div>
  );
}

function ApplicationSummary({
  app,
}: {
  app: {
    id: string;
    hourlyRateCents: number;
    bio: string;
    documentName: string;
    subjects: { name: string }[];
  };
}) {
  return (
    <dl className="space-y-3 text-sm">
      <div>
        <dt className="font-medium text-slate-500">Materias</dt>
        <dd>{app.subjects.map((s) => s.name).join(", ")}</dd>
      </div>
      <div>
        <dt className="font-medium text-slate-500">Tarifa</dt>
        <dd>{formatMXN(app.hourlyRateCents)} por hora</dd>
      </div>
      <div>
        <dt className="font-medium text-slate-500">Presentación</dt>
        <dd className="whitespace-pre-line">{app.bio}</dd>
      </div>
      <div>
        <dt className="font-medium text-slate-500">Documento</dt>
        <dd>
          <a
            href={`/api/documentos/${app.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 font-medium text-blue-700 hover:underline"
          >
            <FileText className="size-4" aria-hidden /> {app.documentName}
          </a>
        </dd>
      </div>
    </dl>
  );
}
