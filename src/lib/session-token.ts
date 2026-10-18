import { SignJWT, jwtVerify } from "jose";
import { SESSION_DAYS } from "./config";

// Token de sesión: JWT HS256 firmado con SESSION_SECRET que solo guarda el id
// del usuario. El rol se consulta siempre en la base de datos para que un
// cambio (p. ej. aprobación como tutor) aplique de inmediato.

export type SessionPayload = { sub: string };

function getKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      "SESSION_SECRET no está definido o es muy corto (mínimo 32 caracteres). Revisa tu archivo .env",
    );
  }
  return new TextEncoder().encode(secret);
}

export async function signSessionToken(userId: string): Promise<string> {
  return new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(getKey());
}

export async function verifySessionToken(
  token: string | undefined,
): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getKey(), { algorithms: ["HS256"] });
    if (typeof payload.sub !== "string") return null;
    return { sub: payload.sub };
  } catch {
    return null;
  }
}
