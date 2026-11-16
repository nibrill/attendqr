import { Backend } from './backend';
import type { Attendance, ClassSession, NewSession, Role, UserProfile } from './models';
import { AppError } from './models';
import { isValidToken, randomCode } from './qr';

interface StoredUser extends UserProfile {
  passwordHash: string;
}

const KEYS = {
  users: 'attendqr.users',
  sessions: 'attendqr.sessions',
  attendance: 'attendqr.attendance',
  current: 'attendqr.current',
};

async function hash(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown): void {
  localStorage.setItem(key, JSON.stringify(value));
}

function strip(user: StoredUser): UserProfile {
  return { uid: user.uid, name: user.name, email: user.email, role: user.role };
}

/** Modo demo: todo se guarda en localStorage, sin necesidad de servidor. */
export class LocalBackend extends Backend {
  readonly mode = 'demo' as const;
  private seeding?: Promise<void>;

  private seed(): Promise<void> {
    this.seeding ??= (async () => {
      if (read<StoredUser[]>(KEYS.users, []).length) return;
      const passwordHash = await hash('demo1234');
      write(KEYS.users, [
        { uid: 'u-docente', name: 'Prof. Andrea Muñoz', email: 'docente@demo.cl', role: 'teacher', passwordHash },
        { uid: 'u-alumno', name: 'Javier Paredes', email: 'alumno@demo.cl', role: 'student', passwordHash },
      ] satisfies StoredUser[]);
    })();
    return this.seeding;
  }

  private users(): StoredUser[] {
    return read<StoredUser[]>(KEYS.users, []);
  }

  async restoreSession(): Promise<UserProfile | null> {
    await this.seed();
    const uid = read<string | null>(KEYS.current, null);
    const user = this.users().find((u) => u.uid === uid);
    return user ? strip(user) : null;
  }

  async signIn(email: string, password: string): Promise<UserProfile> {
    await this.seed();
    const user = this.users().find((u) => u.email === email.trim().toLowerCase());
    if (!user || user.passwordHash !== (await hash(password))) {
      throw new AppError('Correo o contraseña incorrectos.');
    }
    write(KEYS.current, user.uid);
    return strip(user);
  }

  async signUp(name: string, email: string, password: string, role: Role): Promise<UserProfile> {
    await this.seed();
    const normalized = email.trim().toLowerCase();
    const users = this.users();
    if (users.some((u) => u.email === normalized)) throw new AppError('Ya existe una cuenta con ese correo.');
    const user: StoredUser = {
      uid: crypto.randomUUID(),
      name: name.trim(),
      email: normalized,
      role,
      passwordHash: await hash(password),
    };
    write(KEYS.users, [...users, user]);
    write(KEYS.current, user.uid);
    return strip(user);
  }

  async signOut(): Promise<void> {
    localStorage.removeItem(KEYS.current);
  }

  async resetPassword(): Promise<void> {
    // En modo demo no se envían correos.
  }

  private sessions(): ClassSession[] {
    return read<ClassSession[]>(KEYS.sessions, []);
  }

  private attendance(): Attendance[] {
    return read<Attendance[]>(KEYS.attendance, []);
  }

  async listSessions(teacherId: string): Promise<ClassSession[]> {
    return this.sessions()
      .filter((s) => s.teacherId === teacherId)
      .sort((a, b) => b.startsAt.localeCompare(a.startsAt));
  }

  async getSession(id: string): Promise<ClassSession | null> {
    return this.sessions().find((s) => s.id === id) ?? null;
  }

  async createSession(teacher: UserProfile, data: NewSession): Promise<ClassSession> {
    const session: ClassSession = {
      ...data,
      id: crypto.randomUUID(),
      teacherId: teacher.uid,
      teacherName: teacher.name,
      code: randomCode(),
    };
    write(KEYS.sessions, [...this.sessions(), session]);
    return session;
  }

  async deleteSession(id: string): Promise<void> {
    write(
      KEYS.sessions,
      this.sessions().filter((s) => s.id !== id),
    );
    write(
      KEYS.attendance,
      this.attendance().filter((a) => a.sessionId !== id),
    );
  }

  async checkIn(student: UserProfile, sessionId: string, code: string): Promise<Attendance> {
    const session = await this.getSession(sessionId);
    if (!session) throw new AppError('Este código QR no es válido.');
    if (!(await isValidToken(session.code, code))) {
      throw new AppError('El código QR expiró. Escanea el que se muestra ahora.');
    }
    if (Date.now() > new Date(session.expiresAt).getTime()) throw new AppError('La clase ya cerró el registro.');
    const id = `${sessionId}_${student.uid}`;
    const all = this.attendance();
    if (all.some((a) => a.id === id)) throw new AppError('Ya registraste tu asistencia a esta clase.');
    const record: Attendance = {
      id,
      sessionId,
      course: session.course,
      studentId: student.uid,
      studentName: student.name,
      checkedAt: new Date().toISOString(),
    };
    write(KEYS.attendance, [...all, record]);
    return record;
  }

  async listAttendance(sessionId: string): Promise<Attendance[]> {
    return this.attendance()
      .filter((a) => a.sessionId === sessionId)
      .sort((a, b) => a.checkedAt.localeCompare(b.checkedAt));
  }

  async listMyAttendance(studentId: string): Promise<Attendance[]> {
    return this.attendance()
      .filter((a) => a.studentId === studentId)
      .sort((a, b) => b.checkedAt.localeCompare(a.checkedAt));
  }
}
