/**
 * Datos de ejemplo de TutorPar. Ejecuta: npm run db:seed
 * Borra TODO el contenido de la base y lo vuelve a crear (idempotente).
 */
import "dotenv/config";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import bcrypt from "bcryptjs";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient, type Modality } from "../src/generated/prisma/client";
import { addDays, toZonedDateKey, zonedDateTimeToUtc } from "../src/lib/dates";
import { sessionPriceCents, splitPayment } from "../src/lib/money";

const prisma = new PrismaClient({
  adapter: new PrismaBetterSqlite3({ url: process.env.DATABASE_URL ?? "file:./prisma/dev.db" }),
});

const UPLOAD_DIR = path.join(process.cwd(), "uploads");

/** Fecha en Tijuana a `days` días de hoy, a la hora "HH:MM". */
function at(days: number, time: string): Date {
  const key = toZonedDateKey(addDays(new Date(), days));
  const d = zonedDateTimeToUtc(key, time);
  if (!d) throw new Error(`Fecha inválida ${key} ${time}`);
  return d;
}

/** PDF mínimo válido de una página con unas líneas de texto (para kárdex de ejemplo). */
function makePdf(lines: string[]): Buffer {
  const esc = (s: string) => s.replace(/[\\()]/g, (c) => `\\${c}`);
  const text = lines.map((l, i) => `BT /F1 ${i === 0 ? 18 : 12} Tf 60 ${740 - i * 26} Td (${esc(l)}) Tj ET`).join("\n");
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>",
    `<< /Length ${Buffer.byteLength(text, "latin1")} >>\nstream\n${text}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
  ];
  let out = "%PDF-1.4\n";
  const offsets: number[] = [];
  objects.forEach((o, i) => {
    offsets.push(Buffer.byteLength(out, "latin1"));
    out += `${i + 1} 0 obj\n${o}\nendobj\n`;
  });
  const xref = Buffer.byteLength(out, "latin1");
  out += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  out += offsets.map((o) => `${String(o).padStart(10, "0")} 00000 n \n`).join("");
  out += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(out, "latin1");
}

async function writeKardex(slug: string, name: string, career: string): Promise<string> {
  await mkdir(UPLOAD_DIR, { recursive: true });
  const file = `seed-kardex-${slug}.pdf`;
  await writeFile(
    path.join(UPLOAD_DIR, file),
    makePdf([
      "UABC - Kardex de ejemplo (datos ficticios)",
      `Alumno: ${name}`,
      `Programa: ${career}`,
      "Calculo Diferencial ........ 95",
      "Calculo Integral ........... 92",
      "Algebra Lineal ............. 90",
      "Fisica ..................... 88",
      "Probabilidad y Estadistica . 94",
      "Programacion ............... 97",
      "Documento generado por el seed de TutorPar.",
    ]),
  );
  return file;
}

async function main() {
  console.log("Limpiando base de datos…");
  await prisma.notification.deleteMany();
  await prisma.review.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.tutoringSession.deleteMany();
  await prisma.availabilityBlock.deleteMany();
  await prisma.tutorApplication.deleteMany();
  await prisma.tutorProfile.deleteMany();
  await prisma.user.deleteMany();
  await prisma.subject.deleteMany();

  console.log("Materias…");
  const subjectData = [
    ["Cálculo Diferencial", "calculo-diferencial"],
    ["Cálculo Integral", "calculo-integral"],
    ["Álgebra Lineal", "algebra-lineal"],
    ["Física", "fisica"],
    ["Probabilidad y Estadística", "probabilidad-y-estadistica"],
    ["Programación", "programacion"],
  ] as const;
  const subjects: Record<string, string> = {};
  for (const [name, slug] of subjectData) {
    const s = await prisma.subject.create({ data: { name, slug } });
    subjects[slug] = s.id;
  }

  console.log("Usuarios…");
  const [adminHash, tutorHash, studentHash] = await Promise.all([
    bcrypt.hash("Admin123!", 10),
    bcrypt.hash("Tutor123!", 10),
    bcrypt.hash("Estudiante123!", 10),
  ]);

  const admin = await prisma.user.create({
    data: { email: "admin@uabc.edu.mx", name: "Coordinación TutorPar", passwordHash: adminHash, role: "ADMIN" },
  });

  const tutorSeeds = [
    {
      slug: "maria",
      email: "maria.castro@uabc.edu.mx",
      name: "María Fernanda Castro",
      career: "Ing. en Computación",
      semester: 7,
      rate: 180,
      subjects: ["calculo-diferencial", "calculo-integral", "algebra-lineal"],
      bio: "Voy en 7.º semestre y he sido monitora de Cálculo en la facultad. Me gusta explicar con ejercicios tipo examen y dejarte una guía para practicar después de la sesión.",
    },
    {
      slug: "diego",
      email: "diego.ramirez@uabc.edu.mx",
      name: "Diego Ramírez Soto",
      career: "Lic. en Física",
      semester: 8,
      rate: 150,
      subjects: ["fisica", "calculo-diferencial"],
      bio: "Estudiante de Física con experiencia en laboratorio. Te ayudo a entender cinemática, dinámica y energía desde la intuición antes de las fórmulas.",
    },
    {
      slug: "ana",
      email: "ana.torres@uabc.edu.mx",
      name: "Ana Lucía Torres",
      career: "Lic. en Matemáticas Aplicadas",
      semester: 6,
      rate: 160,
      subjects: ["probabilidad-y-estadistica", "algebra-lineal"],
      bio: "Me encanta la estadística. Repasamos teoría con ejemplos reales, resolvemos problemas paso a paso y te enseño a usar la calculadora o Excel para comprobar resultados.",
    },
    {
      slug: "luis",
      email: "luis.mendez@uabc.edu.mx",
      name: "Luis Ángel Méndez",
      career: "Ing. en Software y Tecnologías Emergentes",
      semester: 9,
      rate: 200,
      subjects: ["programacion", "calculo-integral"],
      bio: "Programo en C, Python y JavaScript. Te ayudo a entender lógica, ciclos, arreglos y funciones, y a depurar tus prácticas sin hacerte la tarea.",
    },
  ];

  const tutors: Record<string, { id: string; rate: number; subjects: string[] }> = {};
  for (const t of tutorSeeds) {
    const user = await prisma.user.create({
      data: {
        email: t.email,
        name: t.name,
        career: t.career,
        semester: t.semester,
        passwordHash: tutorHash,
        role: "TUTOR",
        createdAt: addDays(new Date(), -120),
      },
    });
    const doc = await writeKardex(t.slug, t.name, t.career);
    const subjectIds = t.subjects.map((s) => ({ id: subjects[s] }));
    await prisma.tutorApplication.create({
      data: {
        userId: user.id,
        status: "APPROVED",
        documentPath: doc,
        documentName: `kardex-${t.slug}.pdf`,
        documentMime: "application/pdf",
        hourlyRateCents: t.rate * 100,
        bio: t.bio,
        reviewedById: admin.id,
        reviewedAt: addDays(new Date(), -100),
        createdAt: addDays(new Date(), -110),
        subjects: { connect: subjectIds },
      },
    });
    await prisma.tutorProfile.create({
      data: {
        userId: user.id,
        bio: t.bio,
        hourlyRateCents: t.rate * 100,
        approvedAt: addDays(new Date(), -100),
        subjects: { connect: subjectIds },
      },
    });
    tutors[t.slug] = { id: user.id, rate: t.rate * 100, subjects: t.subjects };
  }

  const studentSeeds = [
    { key: "juan", email: "estudiante@uabc.edu.mx", name: "Juan Pablo Ortega", career: "Ing. Civil", semester: 2 },
    { key: "valeria", email: "valeria.gomez@uabc.edu.mx", name: "Valeria Gómez Ruiz", career: "Ing. Industrial", semester: 1 },
    { key: "kevin", email: "kevin.lopez@uabc.edu.mx", name: "Kevin López Araiza", career: "Ing. en Electrónica", semester: 6 },
  ];
  const students: Record<string, string> = {};
  for (const s of studentSeeds) {
    const u = await prisma.user.create({
      data: {
        email: s.email,
        name: s.name,
        career: s.career,
        semester: s.semester,
        passwordHash: studentHash,
        role: "STUDENT",
        createdAt: addDays(new Date(), -90),
      },
    });
    students[s.key] = u.id;
  }

  console.log("Solicitud pendiente…");
  const kevinDoc = await writeKardex("kevin", "Kevin López Araiza", "Ing. en Electrónica");
  await prisma.tutorApplication.create({
    data: {
      userId: students.kevin,
      status: "PENDING",
      documentPath: kevinDoc,
      documentName: "kardex-kevin-lopez.pdf",
      documentMime: "application/pdf",
      hourlyRateCents: 140 * 100,
      bio: "Voy en 6.º semestre de Electrónica y aprobé Física y Cálculo Diferencial con 100. Quiero ayudar a los de primer semestre como a mí me ayudaron.",
      createdAt: addDays(new Date(), -1),
      subjects: { connect: [{ id: subjects["fisica"] }, { id: subjects["calculo-diferencial"] }] },
    },
  });

  // ---- Bloques y sesiones ----
  type BlockSpec = {
    days: number;
    start: string;
    end: string;
    modality: Modality;
    place?: string;
    /** Si se indica, el bloque empieza en N horas (redondeado a la hora) y dura 1 h. */
    hoursFromNow?: number;
  };
  const places = [
    "Biblioteca Central, sala de estudio 2",
    "Facultad de Ingeniería, edificio E, cubículo 4",
    "Facultad de Ciencias, área común planta baja",
  ];
  const meet = (slug: string) => `https://meet.google.com/tp-${slug}-${Math.random().toString(36).slice(2, 6)}`;

  async function createBlock(tutor: string, b: BlockSpec, isBooked = false) {
    let startsAt = at(b.days, b.start);
    let endsAt = at(b.days, b.end);
    if (b.hoursFromNow !== undefined) {
      const hour = 3600_000;
      startsAt = new Date(Math.ceil((Date.now() + b.hoursFromNow * hour) / hour) * hour);
      endsAt = new Date(startsAt.getTime() + hour);
    }
    return prisma.availabilityBlock.create({
      data: {
        tutorId: tutors[tutor].id,
        startsAt,
        endsAt,
        modality: b.modality,
        location: b.modality === "PRESENCIAL" ? (b.place ?? places[0]) : null,
        meetingUrl: b.modality === "EN_LINEA" ? meet(tutor) : null,
        isBooked,
        createdAt: addDays(new Date(), Math.min(b.days, 0) - 3),
      },
    });
  }

  let refCounter = 1000;
  async function createSession(opts: {
    tutor: string;
    student: string;
    subject: string;
    block: BlockSpec;
    status: "PAGADA" | "COMPLETADA" | "CANCELADA";
    review?: { rating: number; comment: string };
    cancelledByTutor?: boolean;
    cancelReason?: string;
    notes?: string;
  }) {
    // Las canceladas liberan el bloque; las demás lo dejan reservado.
    const block = await createBlock(opts.tutor, opts.block, opts.status !== "CANCELADA");
    const minutes = (block.endsAt.getTime() - block.startsAt.getTime()) / 60000;
    const split = splitPayment(sessionPriceCents(tutors[opts.tutor].rate, minutes));
    const bookedAt = addDays(block.startsAt, -4);
    const session = await prisma.tutoringSession.create({
      data: {
        blockId: block.id,
        studentId: students[opts.student],
        tutorId: tutors[opts.tutor].id,
        subjectId: subjects[opts.subject],
        status: opts.status,
        startsAt: block.startsAt,
        endsAt: block.endsAt,
        modality: block.modality,
        location: block.location,
        meetingUrl: block.meetingUrl,
        notes: opts.notes ?? null,
        createdAt: bookedAt,
        completedAt: opts.status === "COMPLETADA" ? block.endsAt : null,
        cancelledAt: opts.status === "CANCELADA" ? addDays(block.startsAt, -2) : null,
        cancelledById:
          opts.status === "CANCELADA"
            ? opts.cancelledByTutor
              ? tutors[opts.tutor].id
              : students[opts.student]
            : null,
        cancellationReason: opts.cancelReason ?? null,
        payment: {
          create: {
            ...split,
            status: opts.status === "CANCELADA" ? "REEMBOLSADO" : "PAGADO",
            reference: `SIM-SEED${refCounter++}`,
            cardLast4: "4242",
            paidAt: bookedAt,
            refundedAt: opts.status === "CANCELADA" ? addDays(block.startsAt, -2) : null,
          },
        },
      },
    });
    if (opts.review) {
      await prisma.review.create({
        data: {
          sessionId: session.id,
          studentId: students[opts.student],
          tutorId: tutors[opts.tutor].id,
          rating: opts.review.rating,
          comment: opts.review.comment,
          createdAt: addDays(block.endsAt, 0.2),
        },
      });
    }
    return session;
  }

  console.log("Sesiones completadas con reseñas…");
  const P = (days: number, start: string, end: string, place = 0): BlockSpec => ({
    days,
    start,
    end,
    modality: "PRESENCIAL",
    place: places[place],
  });
  const L = (days: number, start: string, end: string): BlockSpec => ({ days, start, end, modality: "EN_LINEA" });

  const completed = [
    { tutor: "maria", student: "juan", subject: "calculo-diferencial", block: P(-70, "16:00", "17:00"), review: { rating: 5, comment: "Explica súper claro los límites y me dejó ejercicios para practicar. Saqué 90 en el parcial." } },
    { tutor: "maria", student: "valeria", subject: "calculo-diferencial", block: L(-55, "18:00", "19:30"), review: { rating: 5, comment: "Muy paciente, me explicó derivadas desde cero. ¡Totalmente recomendada!" } },
    { tutor: "maria", student: "juan", subject: "algebra-lineal", block: P(-30, "12:00", "13:00", 1), review: { rating: 4, comment: "Buena sesión de matrices y determinantes, aunque me hubiera gustado más tiempo." } },
    { tutor: "maria", student: "valeria", subject: "calculo-integral", block: L(-9, "17:00", "18:00"), review: { rating: 5, comment: "Por fin entendí integración por partes. Muy buena onda." } },
    { tutor: "diego", student: "juan", subject: "fisica", block: P(-62, "10:00", "11:30", 2), review: { rating: 5, comment: "Diego hace que la física tenga sentido. Los diagramas de cuerpo libre ya no me dan miedo." } },
    { tutor: "diego", student: "valeria", subject: "fisica", block: L(-40, "19:00", "20:00"), review: { rating: 4, comment: "Me ayudó mucho con cinemática, explica con ejemplos de la vida diaria." } },
    { tutor: "diego", student: "kevin", subject: "calculo-diferencial", block: P(-15, "13:00", "14:00"), review: { rating: 4, comment: "Repasamos regla de la cadena, bien explicado y puntual." } },
    { tutor: "ana", student: "valeria", subject: "probabilidad-y-estadistica", block: L(-48, "16:00", "17:00"), review: { rating: 5, comment: "Ana explica la distribución normal mejor que el libro. Súper recomendada." } },
    { tutor: "ana", student: "juan", subject: "probabilidad-y-estadistica", block: P(-20, "11:00", "12:30", 2), review: { rating: 4, comment: "Muy clara con probabilidad condicional. Llegó con ejercicios preparados." } },
    { tutor: "luis", student: "juan", subject: "programacion", block: L(-58, "20:00", "21:00"), review: { rating: 5, comment: "Me ayudó a entender arreglos y funciones en C sin hacerme la tarea. Excelente." } },
    { tutor: "luis", student: "kevin", subject: "programacion", block: P(-25, "15:00", "16:30", 1), review: { rating: 3, comment: "Sabe mucho, pero fue un poco rápido para mi nivel." } },
    { tutor: "luis", student: "valeria", subject: "programacion", block: L(-6, "18:00", "19:00"), review: { rating: 5, comment: "Depuramos mi práctica de ciclos y ahora sí entiendo qué hacía mal." } },
    // Completada sin reseña: estudiante@ puede dejarla.
    { tutor: "maria", student: "juan", subject: "calculo-integral", block: P(-3, "16:00", "17:00") },
    { tutor: "diego", student: "valeria", subject: "fisica", block: L(-2, "18:00", "19:00") },
  ] as const;
  for (const c of completed) await createSession({ ...c, status: "COMPLETADA" });

  console.log("Sesiones pagadas (próximas) y canceladas…");
  const upcomingMaria = await createSession({
    tutor: "maria",
    student: "juan",
    subject: "calculo-integral",
    block: P(3, "16:00", "17:00"),
    status: "PAGADA",
    notes: "Sustitución trigonométrica y fracciones parciales para el segundo parcial.",
  });
  // Menos de 24 h: el estudiante ya no puede cancelar.
  await createSession({
    tutor: "diego",
    student: "juan",
    subject: "fisica",
    block: { ...L(1, "08:00", "09:00"), hoursFromNow: 10 },
    status: "PAGADA",
    notes: "Problemas de tiro parabólico.",
  });
  await createSession({
    tutor: "luis",
    student: "valeria",
    subject: "programacion",
    block: L(5, "19:00", "20:30"),
    status: "PAGADA",
  });
  await createSession({
    tutor: "ana",
    student: "juan",
    subject: "probabilidad-y-estadistica",
    block: P(6, "12:00", "13:00", 2),
    status: "CANCELADA",
    cancelReason: "Me cambiaron la fecha del examen.",
  });
  await createSession({
    tutor: "luis",
    student: "kevin",
    subject: "programacion",
    block: L(-12, "17:00", "18:00"),
    status: "CANCELADA",
    cancelledByTutor: true,
    cancelReason: "Tuve un examen a la misma hora, ¡disculpa!",
  });

  console.log("Bloques futuros disponibles…");
  const freeBlocks: Record<string, BlockSpec[]> = {
    maria: [P(2, "10:00", "11:00"), L(2, "18:00", "19:00"), P(4, "16:00", "17:30", 1), L(7, "17:00", "18:00"), P(9, "12:00", "13:00")],
    diego: [P(2, "13:00", "14:00", 2), L(3, "19:00", "20:00"), P(5, "10:00", "11:30", 2), L(8, "18:00", "19:00")],
    ana: [L(1, "17:00", "18:00"), P(3, "11:00", "12:00", 2), L(4, "18:30", "19:30"), P(10, "12:00", "13:00")],
    luis: [L(2, "20:00", "21:00"), P(3, "15:00", "16:30", 1), L(6, "19:00", "20:00"), L(11, "20:00", "21:00")],
  };
  for (const [tutor, list] of Object.entries(freeBlocks)) {
    for (const b of list) await createBlock(tutor, b);
  }

  console.log("Notificaciones…");
  const ago = (h: number) => new Date(Date.now() - h * 3600_000);
  await prisma.notification.createMany({
    data: [
      {
        userId: tutors.maria.id,
        type: "RESERVA_NUEVA",
        title: "Tienes una reserva nueva",
        message: "Juan Pablo Ortega reservó Cálculo Integral. Revisa los detalles en Mis sesiones.",
        link: "/sesiones?vista=tutor",
        createdAt: ago(20),
      },
      {
        userId: tutors.maria.id,
        type: "RESENA_NUEVA",
        title: "Recibiste una reseña nueva",
        message: "Valeria Gómez Ruiz te calificó con 5 de 5 estrellas en Cálculo Integral.",
        link: `/tutores/${tutors.maria.id}#resenas`,
        createdAt: ago(200),
        readAt: ago(190),
      },
      {
        userId: tutors.ana.id,
        type: "CANCELACION",
        title: "Una sesión fue cancelada",
        message: "Juan Pablo Ortega canceló la sesión de Probabilidad y Estadística. El horario volvió a estar disponible.",
        link: "/sesiones?vista=tutor",
        createdAt: ago(30),
      },
      {
        userId: tutors.luis.id,
        type: "RESERVA_NUEVA",
        title: "Tienes una reserva nueva",
        message: "Valeria Gómez Ruiz reservó Programación. Revisa los detalles en Mis sesiones.",
        link: "/sesiones?vista=tutor",
        createdAt: ago(50),
      },
      {
        userId: students.juan,
        type: "SESION_COMPLETADA",
        title: "¿Cómo te fue en tu sesión?",
        message: "Tu sesión de Cálculo Integral con María Fernanda Castro terminó. Deja una reseña para ayudar a otros estudiantes.",
        link: "/sesiones",
        createdAt: ago(60),
      },
      {
        userId: students.kevin,
        type: "CANCELACION",
        title: "Tu tutor canceló la sesión",
        message: "Luis Ángel Méndez canceló la sesión de Programación. Se reembolsó tu pago completo.",
        link: "/sesiones",
        createdAt: ago(24 * 14),
        readAt: ago(24 * 13),
      },
    ],
  });

  const counts = {
    usuarios: await prisma.user.count(),
    tutores: await prisma.user.count({ where: { role: "TUTOR" } }),
    bloques: await prisma.availabilityBlock.count(),
    sesiones: await prisma.tutoringSession.count(),
    reseñas: await prisma.review.count(),
  };
  console.log("Listo:", counts, "· sesión de ejemplo:", upcomingMaria.id);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
