const PREFIX = 'attendqr:';
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export interface QrPayload {
  sessionId: string;
  /** Token rotativo (no el código secreto de la clase). */
  code: string;
}

/** Contenido que se codifica en el QR de una clase. */
export function encodePayload(p: QrPayload): string {
  return `${PREFIX}${p.sessionId}.${p.code}`;
}

/** Devuelve `null` si el texto no corresponde a un QR de AttendQR. */
export function decodePayload(text: string): QrPayload | null {
  const match = /^attendqr:([\w-]+)\.([A-Z0-9]{6})$/.exec(text.trim());
  return match ? { sessionId: match[1], code: match[2] } : null;
}

export function randomCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join('');
}

/** Cada cuántos segundos cambia el QR de una clase. */
export const ROTATION_SECONDS = 20;

/** Ventana de tiempo actual (cambia cada `ROTATION_SECONDS`). */
export function currentStep(now = Date.now()): number {
  return Math.floor(now / (ROTATION_SECONDS * 1000));
}

/**
 * Token de 6 caracteres derivado del código secreto de la clase y de la ventana de tiempo.
 * Como cambia cada pocos segundos, una foto del QR reenviada a otra persona deja de servir.
 */
export async function rotatingToken(secret: string, step = currentStep()): Promise<string> {
  const data = new TextEncoder().encode(`${secret}:${step}`);
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', data));
  return Array.from(digest.slice(0, 6), (b) => ALPHABET[b % ALPHABET.length]).join('');
}

/** Acepta el token de la ventana actual y el de la anterior (para tolerar el tiempo de escaneo). */
export async function isValidToken(secret: string, token: string, now = Date.now()): Promise<boolean> {
  const step = currentStep(now);
  return token === (await rotatingToken(secret, step)) || token === (await rotatingToken(secret, step - 1));
}

/** Genera un CSV (con BOM para que Excel respete los acentos). */
export function toCsv(rows: string[][]): string {
  const esc = (v: string) => `"${v.replaceAll('"', '""')}"`;
  return '﻿' + rows.map((r) => r.map(esc).join(',')).join('\r\n');
}
