import type { Attendance, ClassSession, NewSession, Role, UserProfile } from './models';

/** Contrato que implementan el modo demo (local) y Firebase. */
export abstract class Backend {
  abstract readonly mode: 'demo' | 'firebase';
  abstract restoreSession(): Promise<UserProfile | null>;
  abstract signIn(email: string, password: string): Promise<UserProfile>;
  abstract signUp(name: string, email: string, password: string, role: Role): Promise<UserProfile>;
  abstract signOut(): Promise<void>;
  abstract resetPassword(email: string): Promise<void>;

  /** Clases creadas por un docente, de la más reciente a la más antigua. */
  abstract listSessions(teacherId: string): Promise<ClassSession[]>;
  abstract getSession(id: string): Promise<ClassSession | null>;
  abstract createSession(teacher: UserProfile, data: NewSession): Promise<ClassSession>;
  abstract deleteSession(id: string): Promise<void>;

  /** Registra la asistencia validando el token rotativo del QR y la vigencia de la clase. */
  abstract checkIn(student: UserProfile, sessionId: string, token: string): Promise<Attendance>;
  abstract listAttendance(sessionId: string): Promise<Attendance[]>;
  abstract listMyAttendance(studentId: string): Promise<Attendance[]>;
}
