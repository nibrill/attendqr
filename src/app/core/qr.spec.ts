import { decodePayload, encodePayload, randomCode, toCsv } from './qr';

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

  it('escapa comillas en el CSV', () => {
    expect(toCsv([['a"b', 'c']])).toContain('"a""b","c"');
  });
});
