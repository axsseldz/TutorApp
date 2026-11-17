/**
 * Datos fijos de la demo, copiados de prisma/seed.ts de la app principal.
 * Todos los nombres, correos y reseñas son ficticios.
 *
 * Las fechas se guardan como "días desde hoy + hora en Tijuana" (igual que el seed)
 * y se calculan en cada petición, para que los horarios siempre se vean vigentes.
 */
import { addDays, now, toZonedDateKey, zonedDateTimeToUtc } from "./dates";
import { sessionPriceCents, splitPayment } from "./money";

export type Role = "STUDENT" | "TUTOR" | "ADMIN";
export type Modality = "PRESENCIAL" | "EN_LINEA";
export type SessionStatus = "PAGADA" | "COMPLETADA" | "CANCELADA";
export type NotificationType =
  | "RESERVA_NUEVA"
  | "CANCELACION"
  | "TUTOR_APROBADO"
  | "TUTOR_RECHAZADO"
  | "RESENA_NUEVA"
  | "SESION_COMPLETADA";

// ---------------------------------------------------------------------------
// Materias, tutores y estudiantes
// ---------------------------------------------------------------------------

export type Subject = { id: string; slug: string; name: string };

const SUBJECT_DATA = [
  ["Cálculo Diferencial", "calculo-diferencial"],
  ["Cálculo Integral", "calculo-integral"],
  ["Álgebra Lineal", "algebra-lineal"],
  ["Física", "fisica"],
  ["Probabilidad y Estadística", "probabilidad-y-estadistica"],
  ["Programación", "programacion"],
] as const;

type SubjectSlug = (typeof SUBJECT_DATA)[number][1];

/** Mismo orden que `orderBy: { name: "asc" }` en SQLite (comparación binaria). */
function byName<T extends { name: string }>(a: T, b: T) {
  return a.name < b.name ? -1 : a.name > b.name ? 1 : 0;
}

export const SUBJECTS: Subject[] = SUBJECT_DATA.map(([name, slug]) => ({ id: slug, slug, name })).sort(byName);

const SUBJECT_BY_SLUG = new Map(SUBJECTS.map((s) => [s.slug, s]));
function subject(slug: SubjectSlug): Subject {
  return SUBJECT_BY_SLUG.get(slug)!;
}

type TutorKey = "maria" | "diego" | "ana" | "luis";
type StudentKey = "juan" | "valeria" | "kevin";

export type Tutor = {
  id: TutorKey;
  email: string;
  name: string;
  career: string;
  semester: number;
  hourlyRateCents: number;
  bio: string;
  subjects: Subject[];
};

function tutor(t: Omit<Tutor, "subjects" | "hourlyRateCents"> & { rate: number; subjects: SubjectSlug[] }): Tutor {
  const { rate, subjects, ...rest } = t;
  return { ...rest, hourlyRateCents: rate * 100, subjects: subjects.map(subject).sort(byName) };
}

export const TUTORS: Tutor[] = [
  tutor({
    id: "maria",
    email: "maria.castro@uabc.edu.mx",
    name: "María Fernanda Castro",
    career: "Ing. en Computación",
    semester: 7,
    rate: 180,
    subjects: ["calculo-diferencial", "calculo-integral", "algebra-lineal"],
    bio: "Voy en 7.º semestre y he sido monitora de Cálculo en la facultad. Me gusta explicar con ejercicios tipo examen y dejarte una guía para practicar después de la sesión.",
  }),
  tutor({
    id: "diego",
    email: "diego.ramirez@uabc.edu.mx",
    name: "Diego Ramírez Soto",
    career: "Lic. en Física",
    semester: 8,
    rate: 150,
    subjects: ["fisica", "calculo-diferencial"],
    bio: "Estudiante de Física con experiencia en laboratorio. Te ayudo a entender cinemática, dinámica y energía desde la intuición antes de las fórmulas.",
  }),
  tutor({
    id: "ana",
    email: "ana.torres@uabc.edu.mx",
    name: "Ana Lucía Torres",
    career: "Lic. en Matemáticas Aplicadas",
    semester: 6,
    rate: 160,
    subjects: ["probabilidad-y-estadistica", "algebra-lineal"],
    bio: "Me encanta la estadística. Repasamos teoría con ejemplos reales, resolvemos problemas paso a paso y te enseño a usar la calculadora o Excel para comprobar resultados.",
  }),
  tutor({
    id: "luis",
    email: "luis.mendez@uabc.edu.mx",
    name: "Luis Ángel Méndez",
    career: "Ing. en Software y Tecnologías Emergentes",
    semester: 9,
    rate: 200,
    subjects: ["programacion", "calculo-integral"],
    bio: "Programo en C, Python y JavaScript. Te ayudo a entender lógica, ciclos, arreglos y funciones, y a depurar tus prácticas sin hacerte la tarea.",
  }),
];

export function getTutor(id: string): Tutor | undefined {
  return TUTORS.find((t) => t.id === id);
}

export type Student = { id: StudentKey; email: string; name: string; career: string; semester: number };

const STUDENTS: Record<StudentKey, Student> = {
  juan: { id: "juan", email: "estudiante@uabc.edu.mx", name: "Juan Pablo Ortega", career: "Ing. Civil", semester: 2 },
  valeria: { id: "valeria", email: "valeria.gomez@uabc.edu.mx", name: "Valeria Gómez Ruiz", career: "Ing. Industrial", semester: 1 },
  kevin: { id: "kevin", email: "kevin.lopez@uabc.edu.mx", name: "Kevin López Araiza", career: "Ing. en Electrónica", semester: 6 },
};

/** Usuario con el que "inicia sesión" la demo: el estudiante de ejemplo del seed. */
export const DEMO_USER = { ...STUDENTS.juan, role: "STUDENT" as Role, phone: "" };

export function tutorCountBySubject(slug: string): number {
  return TUTORS.filter((t) => t.subjects.some((s) => s.slug === slug)).length;
}

// ---------------------------------------------------------------------------
// Bloques de disponibilidad y sesiones
// ---------------------------------------------------------------------------

const PLACES = [
  "Biblioteca Central, sala de estudio 2",
  "Facultad de Ingeniería, edificio E, cubículo 4",
  "Facultad de Ciencias, área común planta baja",
];

type BlockSpec = {
  days: number;
  start: string;
  end: string;
  modality: Modality;
  place?: number;
  /** Si se indica, el bloque empieza en N horas (redondeado a la hora) y dura 1 h. */
  hoursFromNow?: number;
};

const P = (days: number, start: string, end: string, place = 0): BlockSpec => ({
  days,
  start,
  end,
  modality: "PRESENCIAL",
  place,
});
const L = (days: number, start: string, end: string): BlockSpec => ({ days, start, end, modality: "EN_LINEA" });

export type Block = {
  id: string;
  tutorId: TutorKey;
  startsAt: Date;
  endsAt: Date;
  modality: Modality;
  location: string | null;
  meetingUrl: string | null;
};

/** Fecha en Tijuana a `days` días de hoy, a la hora "HH:MM". */
function at(days: number, time: string): Date {
  return zonedDateTimeToUtc(toZonedDateKey(addDays(now(), days)), time)!;
}

function resolveBlock(id: string, tutorId: TutorKey, b: BlockSpec): Block {
  let startsAt = at(b.days, b.start);
  let endsAt = at(b.days, b.end);
  if (b.hoursFromNow !== undefined) {
    const hour = 3600_000;
    startsAt = new Date(Math.ceil((now().getTime() + b.hoursFromNow * hour) / hour) * hour);
    endsAt = new Date(startsAt.getTime() + hour);
  }
  return {
    id,
    tutorId,
    startsAt,
    endsAt,
    modality: b.modality,
    location: b.modality === "PRESENCIAL" ? PLACES[b.place ?? 0] : null,
    meetingUrl: b.modality === "EN_LINEA" ? `https://meet.google.com/tp-${tutorId}-demo` : null,
  };
}

type SessionSpec = {
  tutor: TutorKey;
  student: StudentKey;
  subject: SubjectSlug;
  block: BlockSpec;
  status: SessionStatus;
  review?: { rating: number; comment: string };
  cancelledByTutor?: boolean;
  cancelReason?: string;
  notes?: string;
};

const SESSION_SPECS: SessionSpec[] = [
  // Completadas con reseña
  { tutor: "maria", student: "juan", subject: "calculo-diferencial", block: P(-70, "16:00", "17:00"), status: "COMPLETADA", review: { rating: 5, comment: "Explica súper claro los límites y me dejó ejercicios para practicar. Saqué 90 en el parcial." } },
  { tutor: "maria", student: "valeria", subject: "calculo-diferencial", block: L(-55, "18:00", "19:30"), status: "COMPLETADA", review: { rating: 5, comment: "Muy paciente, me explicó derivadas desde cero. ¡Totalmente recomendada!" } },
  { tutor: "maria", student: "juan", subject: "algebra-lineal", block: P(-30, "12:00", "13:00", 1), status: "COMPLETADA", review: { rating: 4, comment: "Buena sesión de matrices y determinantes, aunque me hubiera gustado más tiempo." } },
  { tutor: "maria", student: "valeria", subject: "calculo-integral", block: L(-9, "17:00", "18:00"), status: "COMPLETADA", review: { rating: 5, comment: "Por fin entendí integración por partes. Muy buena onda." } },
  { tutor: "diego", student: "juan", subject: "fisica", block: P(-62, "10:00", "11:30", 2), status: "COMPLETADA", review: { rating: 5, comment: "Diego hace que la física tenga sentido. Los diagramas de cuerpo libre ya no me dan miedo." } },
  { tutor: "diego", student: "valeria", subject: "fisica", block: L(-40, "19:00", "20:00"), status: "COMPLETADA", review: { rating: 4, comment: "Me ayudó mucho con cinemática, explica con ejemplos de la vida diaria." } },
  { tutor: "diego", student: "kevin", subject: "calculo-diferencial", block: P(-15, "13:00", "14:00"), status: "COMPLETADA", review: { rating: 4, comment: "Repasamos regla de la cadena, bien explicado y puntual." } },
  { tutor: "ana", student: "valeria", subject: "probabilidad-y-estadistica", block: L(-48, "16:00", "17:00"), status: "COMPLETADA", review: { rating: 5, comment: "Ana explica la distribución normal mejor que el libro. Súper recomendada." } },
  { tutor: "ana", student: "juan", subject: "probabilidad-y-estadistica", block: P(-20, "11:00", "12:30", 2), status: "COMPLETADA", review: { rating: 4, comment: "Muy clara con probabilidad condicional. Llegó con ejercicios preparados." } },
  { tutor: "luis", student: "juan", subject: "programacion", block: L(-58, "20:00", "21:00"), status: "COMPLETADA", review: { rating: 5, comment: "Me ayudó a entender arreglos y funciones en C sin hacerme la tarea. Excelente." } },
  { tutor: "luis", student: "kevin", subject: "programacion", block: P(-25, "15:00", "16:30", 1), status: "COMPLETADA", review: { rating: 3, comment: "Sabe mucho, pero fue un poco rápido para mi nivel." } },
  { tutor: "luis", student: "valeria", subject: "programacion", block: L(-6, "18:00", "19:00"), status: "COMPLETADA", review: { rating: 5, comment: "Depuramos mi práctica de ciclos y ahora sí entiendo qué hacía mal." } },
  // Completadas sin reseña
  { tutor: "maria", student: "juan", subject: "calculo-integral", block: P(-3, "16:00", "17:00"), status: "COMPLETADA" },
  { tutor: "diego", student: "valeria", subject: "fisica", block: L(-2, "18:00", "19:00"), status: "COMPLETADA" },
  // Pagadas (próximas) y canceladas
  { tutor: "maria", student: "juan", subject: "calculo-integral", block: P(3, "16:00", "17:00"), status: "PAGADA", notes: "Sustitución trigonométrica y fracciones parciales para el segundo parcial." },
  { tutor: "diego", student: "juan", subject: "fisica", block: { ...L(1, "08:00", "09:00"), hoursFromNow: 10 }, status: "PAGADA", notes: "Problemas de tiro parabólico." },
  { tutor: "luis", student: "valeria", subject: "programacion", block: L(5, "19:00", "20:30"), status: "PAGADA" },
  { tutor: "ana", student: "juan", subject: "probabilidad-y-estadistica", block: P(6, "12:00", "13:00", 2), status: "CANCELADA", cancelReason: "Me cambiaron la fecha del examen." },
  { tutor: "luis", student: "kevin", subject: "programacion", block: L(-12, "17:00", "18:00"), status: "CANCELADA", cancelledByTutor: true, cancelReason: "Tuve un examen a la misma hora, ¡disculpa!" },
];

const FREE_BLOCK_SPECS: Record<TutorKey, BlockSpec[]> = {
  maria: [P(2, "10:00", "11:00"), L(2, "18:00", "19:00"), P(4, "16:00", "17:30", 1), L(7, "17:00", "18:00"), P(9, "12:00", "13:00")],
  diego: [P(2, "13:00", "14:00", 2), L(3, "19:00", "20:00"), P(5, "10:00", "11:30", 2), L(8, "18:00", "19:00")],
  ana: [L(1, "17:00", "18:00"), P(3, "11:00", "12:00", 2), L(4, "18:30", "19:30"), P(10, "12:00", "13:00")],
  luis: [L(2, "20:00", "21:00"), P(3, "15:00", "16:30", 1), L(6, "19:00", "20:00"), L(11, "20:00", "21:00")],
};

export type Payment = {
  amountCents: number;
  commissionRate: number;
  commissionCents: number;
  tutorPayoutCents: number;
  status: "PAGADO" | "REEMBOLSADO";
  reference: string;
};

export type Review = { rating: number; comment: string; createdAt: Date };

export type Session = {
  id: string;
  block: Block;
  status: SessionStatus;
  startsAt: Date;
  endsAt: Date;
  modality: Modality;
  location: string | null;
  meetingUrl: string | null;
  notes: string | null;
  tutor: Tutor;
  student: Student;
  subject: Subject;
  payment: Payment;
  review: Review | null;
  cancelledByTutor: boolean;
  cancelledAt: Date | null;
  cancellationReason: string | null;
};

function minutesOf(b: Block) {
  return Math.round((b.endsAt.getTime() - b.startsAt.getTime()) / 60000);
}

export function blockPriceCents(b: Block): number {
  return sessionPriceCents(getTutor(b.tutorId)!.hourlyRateCents, minutesOf(b));
}

function allSessions(): Session[] {
  return SESSION_SPECS.map((spec, i) => {
    const block = resolveBlock(`sesion-${i + 1}`, spec.tutor, spec.block);
    const t = getTutor(spec.tutor)!;
    const cancelled = spec.status === "CANCELADA";
    return {
      id: `sesion-${i + 1}`,
      block,
      status: spec.status,
      startsAt: block.startsAt,
      endsAt: block.endsAt,
      modality: block.modality,
      location: block.location,
      meetingUrl: block.meetingUrl,
      notes: spec.notes ?? null,
      tutor: t,
      student: STUDENTS[spec.student],
      subject: subject(spec.subject),
      payment: {
        ...splitPayment(blockPriceCents(block)),
        status: cancelled ? "REEMBOLSADO" : "PAGADO",
        reference: `SIM-SEED${1000 + i}`,
      },
      review: spec.review ? { ...spec.review, createdAt: addDays(block.endsAt, 0.2) } : null,
      cancelledByTutor: !!spec.cancelledByTutor,
      cancelledAt: cancelled ? addDays(block.startsAt, -2) : null,
      cancellationReason: spec.cancelReason ?? null,
    };
  });
}

/** Sesiones del estudiante de ejemplo, ordenadas por fecha de inicio. */
export function getDemoUserSessions(): Session[] {
  return allSessions()
    .filter((s) => s.student.id === DEMO_USER.id)
    .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
}

/** Bloques libres y futuros (de un tutor o de todos), ordenados por fecha. */
export function getFreeBlocks(tutorId?: string): Block[] {
  const current = now();
  const free: Block[] = [];
  for (const [key, specs] of Object.entries(FREE_BLOCK_SPECS) as [TutorKey, BlockSpec[]][]) {
    specs.forEach((spec, i) => free.push(resolveBlock(`${key}-${i + 1}`, key, spec)));
  }
  // Las sesiones canceladas liberan su bloque (como en el seed).
  SESSION_SPECS.forEach((spec, i) => {
    if (spec.status === "CANCELADA") free.push(resolveBlock(`${spec.tutor}-liberado-${i + 1}`, spec.tutor, spec.block));
  });
  return free
    .filter((b) => (!tutorId || b.tutorId === tutorId) && b.startsAt > current)
    .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
}

export function getFreeBlock(id: string): Block | undefined {
  return getFreeBlocks().find((b) => b.id === id);
}

export type RatingSummary = { average: number | null; count: number };

export function ratingFor(tutorId: string): RatingSummary {
  const ratings = allSessions()
    .filter((s) => s.tutor.id === tutorId && s.review)
    .map((s) => s.review!.rating);
  if (!ratings.length) return { average: null, count: 0 };
  return { average: ratings.reduce((a, b) => a + b, 0) / ratings.length, count: ratings.length };
}

export function getReviews(tutorId: string) {
  return allSessions()
    .filter((s) => s.tutor.id === tutorId && s.review)
    .map((s) => ({ id: s.id, ...s.review!, studentName: s.student.name, subjectName: s.subject.name }))
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export function completedCount(tutorId?: string): number {
  return allSessions().filter((s) => s.status === "COMPLETADA" && (!tutorId || s.tutor.id === tutorId)).length;
}

export function averageRating(): number | null {
  const ratings = allSessions().flatMap((s) => (s.review ? [s.review.rating] : []));
  return ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null;
}

/** Fecha de aprobación de los tutores en el seed (hace 100 días). */
export function tutorApprovedAt(): Date {
  return addDays(now(), -100);
}

// ---------------------------------------------------------------------------
// Notificaciones del estudiante de ejemplo
// ---------------------------------------------------------------------------

export type Notification = {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  link: string;
  createdAt: Date;
  read: boolean;
};

export function getNotifications(): Notification[] {
  const ago = (h: number) => new Date(now().getTime() - h * 3600_000);
  return [
    {
      id: "n1",
      type: "SESION_COMPLETADA",
      title: "¿Cómo te fue en tu sesión?",
      message:
        "Tu sesión de Cálculo Integral con María Fernanda Castro terminó. Deja una reseña para ayudar a otros estudiantes.",
      link: "/sesiones",
      createdAt: ago(60),
      read: false,
    },
    {
      id: "n2",
      type: "SESION_COMPLETADA",
      title: "¿Cómo te fue en tu sesión?",
      message:
        "Tu sesión de Probabilidad y Estadística con Ana Lucía Torres terminó. Deja una reseña para ayudar a otros estudiantes.",
      link: "/sesiones",
      createdAt: ago(24 * 20 - 2),
      read: true,
    },
    {
      id: "n3",
      type: "SESION_COMPLETADA",
      title: "¿Cómo te fue en tu sesión?",
      message:
        "Tu sesión de Álgebra Lineal con María Fernanda Castro terminó. Deja una reseña para ayudar a otros estudiantes.",
      link: "/sesiones",
      createdAt: ago(24 * 30 - 4),
      read: true,
    },
  ];
}

export function unreadNotifications(): number {
  return getNotifications().filter((n) => !n.read).length;
}
