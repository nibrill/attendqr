import { LocalBackend } from './local.backend';
import { AppError } from './models';

describe('LocalBackend', () => {
  let backend: LocalBackend;

  beforeEach(() => {
    localStorage.clear();
    backend = new LocalBackend();
  });

  const inMinutes = (m: number) => new Date(Date.now() + m * 60_000).toISOString();

  it('registra asistencia una sola vez por estudiante', async () => {
    const teacher = await backend.signIn('docente@demo.cl', 'demo1234');
    const student = await backend.signIn('alumno@demo.cl', 'demo1234');
    const s = await backend.createSession(teacher, {
      course: 'Cálculo I',
      room: 'B-204',
      startsAt: inMinutes(-5),
      expiresAt: inMinutes(30),
    });
    await backend.checkIn(student, s.id, s.code);
    await expect(backend.checkIn(student, s.id, s.code)).rejects.toBeInstanceOf(AppError);
    expect(await backend.listAttendance(s.id)).toHaveLength(1);
  });

  it('rechaza códigos incorrectos y clases cerradas', async () => {
    const teacher = await backend.signIn('docente@demo.cl', 'demo1234');
    const student = await backend.signIn('alumno@demo.cl', 'demo1234');
    const open = await backend.createSession(teacher, {
      course: 'Física',
      room: 'A-1',
      startsAt: inMinutes(-5),
      expiresAt: inMinutes(30),
    });
    const closed = await backend.createSession(teacher, {
      course: 'Química',
      room: 'A-2',
      startsAt: inMinutes(-90),
      expiresAt: inMinutes(-30),
    });
    await expect(backend.checkIn(student, open.id, 'AAAAAA')).rejects.toBeInstanceOf(AppError);
    await expect(backend.checkIn(student, closed.id, closed.code)).rejects.toBeInstanceOf(AppError);
  });

  it('elimina los registros al borrar una clase', async () => {
    const teacher = await backend.signIn('docente@demo.cl', 'demo1234');
    const student = await backend.signIn('alumno@demo.cl', 'demo1234');
    const s = await backend.createSession(teacher, {
      course: 'Álgebra',
      room: 'C-3',
      startsAt: inMinutes(-1),
      expiresAt: inMinutes(20),
    });
    await backend.checkIn(student, s.id, s.code);
    await backend.deleteSession(s.id);
    expect(await backend.listMyAttendance(student.uid)).toEqual([]);
  });
});
