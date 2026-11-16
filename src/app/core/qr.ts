const PREFIX = 'attendqr:';

export interface QrPayload {
  sessionId: string;
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
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('');
}

/** Genera un CSV (con BOM para que Excel respete los acentos). */
export function toCsv(rows: string[][]): string {
  const esc = (v: string) => `"${v.replaceAll('"', '""')}"`;
  return '﻿' + rows.map((r) => r.map(esc).join(',')).join('\r\n');
}
