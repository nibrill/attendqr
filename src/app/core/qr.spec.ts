import { decodePayload, encodePayload, isValidToken, randomCode, rotatingToken, toCsv } from './qr';

describe('qr', () => {
  it('codifica y decodifica el contenido del QR', () => {
    const text = encodePayload({ sessionId: 'abc-123', code: 'K7M2PQ' });
    expect(decodePayload(text)).toEqual({ sessionId: 'abc-123', code: 'K7M2PQ' });
  });

  it('rechaza textos ajenos a AttendQR', () => {
    expect(decodePayload('https://ejemplo.cl')).toBeNull();
    expect(decodePayload('attendqr:abc.zzzzzz')).toBeNull();
  });

  it('genera códigos de 6 caracteres válidos', () => {
    expect(randomCode()).toMatch(/^[A-Z2-9]{6}$/);
  });

  it('el token cambia en cada ventana y tolera la anterior', async () => {
    const now = 1_700_000_000_000;
    const current = await rotatingToken('SECRET', Math.floor(now / 20_000));
    const previous = await rotatingToken('SECRET', Math.floor(now / 20_000) - 1);
    const old = await rotatingToken('SECRET', Math.floor(now / 20_000) - 2);
    expect(current).toMatch(/^[A-Z2-9]{6}$/);
    expect(current).not.toBe(previous);
    expect(await isValidToken('SECRET', current, now)).toBe(true);
    expect(await isValidToken('SECRET', previous, now)).toBe(true);
    expect(await isValidToken('SECRET', old, now)).toBe(false);
    expect(await isValidToken('OTRO', current, now)).toBe(false);
  });

  it('escapa comillas en el CSV', () => {
    expect(toCsv([['a"b', 'c']])).toContain('"a""b","c"');
  });
});
