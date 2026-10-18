import Database from "better-sqlite3";
import { expect, test, type Page } from "@playwright/test";

// Recorre el flujo principal de TutorPar v1:
// registro → solicitar ser tutor → aprobar como admin → publicar bloque →
// reservar como estudiante → completar → reseñar → ver ganancias.
// Además prueba reglas clave: dominio @uabc, traslapes, autoreserva,
// cancelación con 24 h y protección de rutas por rol.

const stamp = Date.now().toString(36);
const NEW_USER = {
  name: `Paola Prueba ${stamp}`,
  email: `paola.${stamp}@uabc.edu.mx`,
  password: "Prueba1234",
};
const ADMIN = { email: "admin@uabc.edu.mx", password: "Admin123!" };
const STUDENT = { email: "estudiante@uabc.edu.mx", password: "Estudiante123!" };

/** Fecha y hora actuales en Tijuana (lo que capturaría el tutor). */
function tijuanaParts(d: Date) {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Tijuana",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(d)
      .map((x) => [x.type, x.value]),
  );
  return { date: `${p.year}-${p.month}-${p.day}`, time: `${p.hour}:${p.minute}` };
}

async function login(page: Page, email: string, password: string) {
  await page.context().clearCookies();
  await page.goto("/iniciar-sesion");
  await page.getByLabel("Correo institucional").fill(email);
  await page.getByLabel("Contraseña").fill(password);
  await page.locator("main form").getByRole("button", { name: "Iniciar sesión" }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/iniciar-sesion"));
}

test.describe.serial("Flujo completo de TutorPar", () => {
  let blockStart: Date;
  let tutorId: string;

  test("1. Registro: rechaza correos fuera de @uabc.edu.mx y crea la cuenta", async ({ page }) => {
    await page.goto("/registro");
    await page.getByLabel("Nombre completo").fill(NEW_USER.name);
    await page.getByLabel("Correo institucional").fill(`paola.${stamp}@gmail.com`);
    await page.getByLabel("Contraseña", { exact: true }).fill(NEW_USER.password);
    await page.getByLabel("Confirma tu contraseña").fill(NEW_USER.password);
    await page.getByRole("button", { name: "Crear cuenta" }).last().click();
    await expect(page.getByText("Solo se aceptan correos institucionales @uabc.edu.mx.")).toBeVisible();

    await page.getByLabel("Correo institucional").fill(NEW_USER.email);
    await page.getByLabel("Carrera (opcional)").fill("Ing. Aeroespacial");
    await page.getByLabel("Semestre").fill("7");
    await page.getByLabel("Contraseña", { exact: true }).fill(NEW_USER.password);
    await page.getByLabel("Confirma tu contraseña").fill(NEW_USER.password);
    await page.getByRole("button", { name: "Crear cuenta" }).last().click();
    await page.waitForURL(/\/tutores\?bienvenida=1/);
    await expect(page.getByText("¡Bienvenido a TutorPar!")).toBeVisible();

    // Un estudiante no puede entrar al panel de tutor ni al de admin.
    await page.goto("/tutor");
    await expect(page).toHaveURL(/\/sin-acceso/);
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/sin-acceso/);

    // Cerrar sesión desde el encabezado.
    await page.getByRole("button", { name: "Cerrar sesión" }).first().click();
    await page.waitForURL("/");
    await page.goto("/sesiones");
    await expect(page).toHaveURL(/\/iniciar-sesion\?next=%2Fsesiones/);
  });

  test("2. Solicitar ser tutor con kárdex", async ({ page }) => {
    await login(page, NEW_USER.email, NEW_USER.password);
    await page.goto("/perfil");
    await page.getByLabel("Cálculo Diferencial").check();
    await page.getByLabel("Física").check();
    await page.getByLabel("Tarifa por hora (MXN)").fill("170");
    await page
      .getByLabel("Preséntate con los estudiantes")
      .fill("Voy en 7.º semestre, aprobé Cálculo Diferencial con 100 y me gusta explicar con ejemplos.");

    // Un archivo que no es PDF/imagen se rechaza.
    await page.getByLabel("Kárdex o constancia de estudios").setInputFiles({
      name: "notas.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("no soy un pdf"),
    });
    await page.getByRole("button", { name: "Enviar solicitud" }).click();
    await expect(page.getByText("Formato no permitido. Usa PDF, JPG, PNG o WEBP.")).toBeVisible();

    await page.getByLabel("Cálculo Diferencial").check();
    await page.getByLabel("Física").check();
    await page.getByLabel("Kárdex o constancia de estudios").setInputFiles({
      name: "kardex-paola.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n"),
    });
    await page.getByRole("button", { name: "Enviar solicitud" }).click();
    await expect(page.getByText("¡Solicitud enviada!")).toBeVisible();
    await page.reload();
    await expect(page.getByText("Tu solicitud está en revisión.")).toBeVisible();
  });

  test("3. El admin ve el documento y aprueba la solicitud", async ({ page }) => {
    await login(page, ADMIN.email, ADMIN.password);
    await expect(page).toHaveURL(/\/admin$/);
    await expect(page.getByText(/solicitudes? de tutor pendientes?/)).toBeVisible();
    await page.goto("/admin/solicitudes");
    const card = page.locator("li", { hasText: NEW_USER.email });
    await expect(card).toBeVisible();

    const docHref = await card.getByRole("link", { name: /kardex-paola\.pdf/ }).getAttribute("href");
    const doc = await page.request.get(docHref!);
    expect(doc.status()).toBe(200);
    expect(doc.headers()["content-type"]).toBe("application/pdf");

    await card.getByRole("button", { name: "Aprobar" }).click();
    await expect(page.getByText(/Solicitud aprobada\./)).toBeVisible();
    await expect(page.locator("li", { hasText: NEW_USER.email })).toHaveCount(0);
  });

  test("4. El tutor aprobado recibe la notificación y publica un bloque", async ({ page }) => {
    await login(page, NEW_USER.email, NEW_USER.password);
    await expect(page).toHaveURL(/\/tutor$/);
    await expect(page.getByRole("link", { name: /Notificaciones: \d+ sin leer/ })).toBeVisible();
    await page.goto("/notificaciones");
    await expect(page.getByText("¡Ya eres tutor de TutorPar!")).toBeVisible();

    await page.goto("/tutor");
    // Bloque que empieza en ~2 minutos (para poder completarlo en esta prueba).
    const start = new Date(Date.now() + 2 * 60_000);
    start.setSeconds(0, 0);
    if (start.getTime() - Date.now() < 75_000) start.setMinutes(start.getMinutes() + 1);
    const end = new Date(start.getTime() + 30 * 60_000);
    const s = tijuanaParts(start);
    const e = tijuanaParts(end);
    blockStart = start;

    await page.getByLabel("Fecha", { exact: true }).fill(s.date);
    await page.getByLabel("Inicio", { exact: true }).fill(s.time);
    await page.getByLabel("Fin", { exact: true }).fill(e.time);
    await page.getByText("En línea", { exact: true }).click();
    await page.getByLabel("Enlace de Meet o Zoom").fill("https://meet.google.com/abc-defg-hij");
    await page.getByRole("button", { name: "Publicar bloque" }).click();
    await expect(page.getByText("Bloque publicado.")).toBeVisible();

    // El mismo horario otra vez se rechaza por traslape.
    await page.getByLabel("Fecha", { exact: true }).fill(s.date);
    await page.getByLabel("Inicio", { exact: true }).fill(s.time);
    await page.getByLabel("Fin", { exact: true }).fill(e.time);
    await page.getByText("Presencial", { exact: true }).click();
    await page.getByLabel("Lugar en el campus").fill("Biblioteca Central");
    await page.getByRole("button", { name: "Publicar bloque" }).click();
    await expect(page.getByText(/Se traslapa con otro de tus bloques/)).toBeVisible();

    // No puede reservarse a sí mismo.
    await page.getByRole("link", { name: "Ver mi perfil público" }).click();
    await page.waitForURL(/\/tutores\/[^/?#]+$/);
    tutorId = new URL(page.url()).pathname.split("/").pop()!;
    await expect(page.getByText("No puedes reservarte a ti mismo")).toBeVisible();
    await expect(page.getByRole("link", { name: "Reservar" })).toHaveCount(0);
  });

  test("5. El estudiante busca por materia, reserva y paga (simulado)", async ({ page }) => {
    await login(page, STUDENT.email, STUDENT.password);
    await page.goto("/tutores?materia=calculo-diferencial");
    await expect(page.getByRole("heading", { name: "Tutores de Cálculo Diferencial" })).toBeVisible();
    await page.getByRole("link", { name: NEW_USER.name }).click();
    await expect(page).toHaveURL(new RegExp(`/tutores/${tutorId}`));

    await page.getByRole("link", { name: "Reservar" }).first().click();
    await expect(page.getByRole("heading", { name: "Confirma tu reserva" })).toBeVisible();
    // 170 MXN/h × 30 min = 85.00; comisión 15% = 12.75
    await expect(page.getByText("$85.00").first()).toBeVisible();
    await expect(page.getByText("$12.75")).toBeVisible();
    await page.getByLabel("Materia").selectOption({ label: "Cálculo Diferencial" });
    await page.getByLabel(/¿Qué temas quieres repasar\?/).fill("Límites y continuidad");
    await page.getByRole("button", { name: /Pagar \$85\.00 y reservar/ }).click();

    await page.waitForURL(/\/sesiones\?reservada=/);
    await expect(page.getByText("¡Reserva confirmada!")).toBeVisible();
    const card = page.locator("li", { hasText: NEW_USER.name }).first();
    await expect(card.getByText("Pagada")).toBeVisible();
    // Menos de 24 h para empezar: ya no se puede cancelar.
    await expect(card.getByText(/Ya no puedes cancelar/)).toBeVisible();

    // El bloque reservado ya no está disponible.
    await page.goto(`/tutores/${tutorId}`);
    await expect(page.getByText("Sin horarios disponibles")).toBeVisible();
  });

  test("6. Cancelación: el estudiante cancela con más de 24 h y el bloque se libera", async ({ page }) => {
    await login(page, STUDENT.email, STUDENT.password);
    await page.goto("/sesiones");
    const card = page.locator("li", { hasText: "Sustitución trigonométrica" });
    await card.getByRole("button", { name: "Cancelar sesión" }).click();
    await card.getByPlaceholder("Motivo (opcional)").fill("Ya no la necesito, ¡gracias!");
    await card.getByRole("button", { name: "Sí, cancelar" }).click();
    await expect(page.getByText("Sesión cancelada.")).toBeVisible();
    await expect(page.locator("#historial ~ ul li", { hasText: "Sustitución trigonométrica" }).getByText("Reembolsado")).toBeVisible();

    // El bloque (16:00–17:00) vuelve a aparecer como disponible en el perfil de la tutora.
    await page.goto("/tutores");
    await page.getByRole("link", { name: "María Fernanda Castro" }).click();
    await expect(page.locator("section[aria-labelledby=horarios]").getByText("16:00 – 17:00")).toBeVisible();
  });

  test("7. El tutor marca la sesión como completada", async ({ page }) => {
    const wait = blockStart.getTime() - Date.now() + 3_000;
    if (wait > 0) await page.waitForTimeout(wait);
    await login(page, NEW_USER.email, NEW_USER.password);
    await expect(page.getByRole("link", { name: /Notificaciones: \d+ sin leer/ })).toBeVisible();
    await page.goto("/sesiones?vista=tutor");
    const card = page.locator("li", { hasText: "Límites y continuidad" });
    await card.getByRole("button", { name: "Marcar como completada" }).click();
    await expect(page.locator("li", { hasText: "Límites y continuidad" }).getByText("Completada")).toBeVisible();
  });

  test("8. El estudiante deja una reseña (solo una por sesión)", async ({ page }) => {
    await login(page, STUDENT.email, STUDENT.password);
    await page.goto("/sesiones");
    const card = page.locator("li", { hasText: "Límites y continuidad" });
    await card.getByRole("link", { name: "Dejar reseña" }).click();
    await page.getByRole("button", { name: "Publicar reseña" }).click();
    await expect(page.getByText("Elige una calificación.").or(page.getByText(/Elige una calificación de 1 a 5/))).toBeVisible();
    await page.locator("label", { hasText: "5 estrellas" }).click();
    await page.getByLabel("Comentario").fill("Excelente explicación de límites, muy recomendada.");
    await page.getByRole("button", { name: "Publicar reseña" }).click();
    await page.waitForURL(/\/sesiones\?resena=1/);
    await expect(page.getByText("¡Gracias por tu reseña!")).toBeVisible();
    await expect(page.locator("li", { hasText: "Límites y continuidad" }).getByText("Tu reseña:")).toBeVisible();
    // No se puede reseñar dos veces la misma sesión.
    await page.goBack();
    await page.reload();
    await expect(page.getByText("Ya calificaste esta sesión")).toBeVisible();

    await page.goto(`/tutores/${tutorId}`);
    await expect(page.getByText("Excelente explicación de límites")).toBeVisible();
    await expect(page.getByText("5.0")).toBeVisible();
  });

  test("9. El tutor ve sus ganancias y la notificación de reseña", async ({ page }) => {
    await login(page, NEW_USER.email, NEW_USER.password);
    await page.goto("/notificaciones");
    await expect(page.getByText("Recibiste una reseña nueva")).toBeVisible();
    await expect(page.getByText("Tienes una reserva nueva")).toBeVisible();

    await page.goto("/tutor/ganancias");
    const table = page.locator("table").first();
    await expect(table.getByText("$85.00").first()).toBeVisible();
    await expect(table.getByText("−$12.75").first()).toBeVisible();
    await expect(table.getByText("$72.25").first()).toBeVisible();
  });

  test("10. El admin ve métricas y la sesión en la lista", async ({ page }) => {
    await login(page, ADMIN.email, ADMIN.password);
    await expect(page.getByText("Ingresos por comisión")).toBeVisible();
    await page.goto("/admin/sesiones?estado=COMPLETADA");
    await expect(page.locator("tr", { hasText: NEW_USER.name }).getByText("$12.75")).toBeVisible();
    await page.goto("/admin/usuarios?q=" + encodeURIComponent(NEW_USER.email));
    await expect(page.locator("tr", { hasText: NEW_USER.email }).getByText("Tutor")).toBeVisible();
  });

  test("11. El admin rechaza una solicitud con motivo y el estudiante lo ve", async ({ page }) => {
    await login(page, ADMIN.email, ADMIN.password);
    await page.goto("/admin/solicitudes");
    const card = page.locator("li", { hasText: "kevin.lopez@uabc.edu.mx" });
    await card.getByRole("button", { name: "Rechazar" }).click();
    await card.getByRole("button", { name: "Confirmar rechazo" }).click();
    await expect(card.getByText("Explica el motivo del rechazo")).toBeVisible();
    await card.getByLabel(/Motivo del rechazo/).fill("El kárdex no muestra la calificación de Física; sube uno actualizado.");
    await card.getByRole("button", { name: "Confirmar rechazo" }).click();
    await expect(page.getByText(/rechazada\. Se le notificó el motivo/)).toBeVisible();

    await login(page, "kevin.lopez@uabc.edu.mx", "Estudiante123!");
    await page.goto("/perfil");
    await expect(page.getByText("Tu última solicitud fue rechazada.")).toBeVisible();
    await expect(page.getByText(/no muestra la calificación de Física/)).toBeVisible();
    await expect(page.getByRole("button", { name: "Enviar solicitud" })).toBeVisible();
  });

  test("12. Una sesión pagada pasa sola a COMPLETADA cuando termina su horario", async ({ page }) => {
    // Simula el paso del tiempo moviendo la sesión de Física (seed) al pasado.
    const db = new Database("prisma/dev.db");
    const iso = (d: Date) => d.toISOString().replace("Z", "+00:00");
    db.prepare(
      "UPDATE TutoringSession SET startsAt = ?, endsAt = ? WHERE status = 'PAGADA' AND notes LIKE '%tiro parab%'",
    ).run(iso(new Date(Date.now() - 2 * 3600_000)), iso(new Date(Date.now() - 3600_000)));
    db.close();

    await login(page, STUDENT.email, STUDENT.password);
    await page.goto("/sesiones");
    const card = page.locator("#historial ~ ul li", { hasText: "tiro parabólico" });
    await expect(card.getByText("Completada")).toBeVisible();
    await expect(card.getByRole("link", { name: "Dejar reseña" })).toBeVisible();
    await page.goto("/notificaciones");
    await expect(page.getByText("¿Cómo te fue en tu sesión?").first()).toBeVisible();
  });
});
