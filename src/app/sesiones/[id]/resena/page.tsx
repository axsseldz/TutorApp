import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, MessageSquare } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { formatDay, formatTimeRange } from "@/lib/dates";
import { completeExpiredSessions } from "@/lib/tutoring";
import { ReviewForm } from "@/components/forms/review-form";
import { Avatar, ButtonLink, Card, EmptyState, Stars } from "@/components/ui";

export const metadata: Metadata = { title: "Dejar reseña" };

export default async function ReviewPage({ params }: PageProps<"/sesiones/[id]/resena">) {
  const { id } = await params;
  const user = await requireUser(`/sesiones/${id}/resena`);
  await completeExpiredSessions();

  const session = await prisma.tutoringSession.findUnique({
    where: { id },
    include: {
      tutor: { select: { id: true, name: true } },
      subject: { select: { name: true } },
      review: true,
    },
  });
  if (!session || session.studentId !== user.id) notFound();

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <Link
        href="/sesiones"
        className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-slate-600 hover:text-blue-700"
      >
        <ArrowLeft className="size-4" aria-hidden /> Mis sesiones
      </Link>
      <h1 className="mb-6 text-2xl font-bold tracking-tight sm:text-3xl">Califica tu sesión</h1>

      <Card className="mb-6 flex items-center gap-4 p-5">
        <Avatar name={session.tutor.name} />
        <div>
          <p className="font-semibold">
            {session.subject.name} con {session.tutor.name}
          </p>
          <p className="text-sm text-slate-600">
            {formatDay(session.startsAt)} · {formatTimeRange(session.startsAt, session.endsAt)}
          </p>
        </div>
      </Card>

      {session.review ? (
        <Card className="p-6">
          <p className="mb-2 font-semibold">Ya calificaste esta sesión</p>
          <Stars value={session.review.rating} size="md" />
          <p className="mt-2 text-slate-700">“{session.review.comment}”</p>
        </Card>
      ) : session.status !== "COMPLETADA" ? (
        <EmptyState
          icon={<MessageSquare />}
          title="Aún no puedes calificar esta sesión"
          description={
            session.status === "CANCELADA"
              ? "Las sesiones canceladas no se pueden calificar."
              : "Podrás dejar tu reseña cuando la sesión termine o el tutor la marque como completada."
          }
          action={<ButtonLink href="/sesiones">Volver a mis sesiones</ButtonLink>}
        />
      ) : (
        <Card className="p-6">
          <ReviewForm sessionId={session.id} />
        </Card>
      )}
    </div>
  );
}
