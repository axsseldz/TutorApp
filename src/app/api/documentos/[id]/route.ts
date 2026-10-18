import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { readUpload } from "@/lib/uploads";

/**
 * GET /api/documentos/:id — sirve el kárdex/constancia de una solicitud.
 * Solo lo pueden ver los administradores y el propio solicitante.
 */
export async function GET(_request: Request, ctx: RouteContext<"/api/documentos/[id]">) {
  const { id } = await ctx.params;
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "No autenticado" }, { status: 401 });

  const app = await prisma.tutorApplication.findUnique({
    where: { id },
    select: { userId: true, documentPath: true, documentName: true, documentMime: true },
  });
  if (!app || (user.role !== "ADMIN" && app.userId !== user.id)) {
    return Response.json({ error: "Documento no encontrado" }, { status: 404 });
  }

  const file = await readUpload(app.documentPath);
  if (!file) return Response.json({ error: "El archivo ya no existe en el servidor" }, { status: 404 });

  return new Response(new Uint8Array(file), {
    headers: {
      "Content-Type": app.documentMime,
      "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(app.documentName)}`,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, no-store",
    },
  });
}
