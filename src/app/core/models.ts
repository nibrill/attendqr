export type Role = 'teacher' | 'student';

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  role: Role;
}

/** Una clase abierta a la que los estudiantes registran asistencia escaneando un QR. */
export interface ClassSession {
  id: string;
  teacherId: string;
  teacherName: string;
  course: string;
  room: string;
  /** Inicio de la clase (ISO 8601). */
  startsAt: string;
  /** Después de esta hora ya no se acepta asistencia (ISO 8601). */
  expiresAt: string;
  /** Secreto aleatorio de la clase; de él se derivan los tokens rotativos del QR. */
  code: string;
}

export type NewSession = Pick<ClassSession, 'course' | 'room' | 'startsAt' | 'expiresAt'>;

export interface Attendance {
  /** `${sessionId}_${studentId}`: garantiza una única marca por estudiante. */
  id: string;
  sessionId: string;
  course: string;
  studentId: string;
  studentName: string;
  checkedAt: string;
}

export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  appId: string;
  storageBucket?: string;
  messagingSenderId?: string;
}

export class AppError extends Error {}
