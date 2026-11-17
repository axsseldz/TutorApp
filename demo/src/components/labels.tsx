import { Monitor, MapPin } from "lucide-react";
import type { Modality, Role, SessionStatus } from "@/lib/data";
import { Badge } from "./ui";

// Etiquetas en español (mismas que en la app principal).

export const ROLE_LABEL: Record<Role, string> = {
  STUDENT: "Estudiante",
  TUTOR: "Tutor",
  ADMIN: "Administrador",
};

export function RoleBadge({ role }: { role: Role }) {
  const tone = role === "ADMIN" ? "red" : role === "TUTOR" ? "orange" : "blue";
  return <Badge tone={tone}>{ROLE_LABEL[role]}</Badge>;
}

export const SESSION_STATUS_LABEL: Record<SessionStatus, string> = {
  PAGADA: "Pagada",
  COMPLETADA: "Completada",
  CANCELADA: "Cancelada",
};

export function SessionStatusBadge({ status }: { status: SessionStatus }) {
  const tone = status === "PAGADA" ? "blue" : status === "COMPLETADA" ? "green" : "slate";
  return <Badge tone={tone}>{SESSION_STATUS_LABEL[status]}</Badge>;
}

export function ModalityBadge({ modality }: { modality: Modality }) {
  return modality === "PRESENCIAL" ? (
    <Badge tone="orange">
      <MapPin className="size-3" aria-hidden /> Presencial
    </Badge>
  ) : (
    <Badge tone="blue">
      <Monitor className="size-3" aria-hidden /> En línea
    </Badge>
  );
}
