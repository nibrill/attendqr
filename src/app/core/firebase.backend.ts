import type { Auth } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';

import { Backend } from './backend';
import type { Attendance, ClassSession, FirebaseConfig, NewSession, Role, UserProfile } from './models';
import { AppError } from './models';
import { isValidToken, randomCode } from './qr';

const AUTH_ERRORS: Record<string, string> = {
  'auth/invalid-credential': 'Correo o contraseña incorrectos.',
  'auth/user-not-found': 'Correo o contraseña incorrectos.',
  'auth/wrong-password': 'Correo o contraseña incorrectos.',
  'auth/email-already-in-use': 'Ya existe una cuenta con ese correo.',
  'auth/weak-password': 'La contraseña debe tener al menos 6 caracteres.',
  'auth/too-many-requests': 'Demasiados intentos. Inténtalo más tarde.',
};

function toAppError(e: unknown): AppError {
  if (e instanceof AppError) return e;
  const code = (e as { code?: string }).code ?? '';
  return new AppError(AUTH_ERRORS[code] ?? 'Ocurrió un error inesperado. Inténtalo nuevamente.');
}

/** Implementación con Firebase Authentication + Cloud Firestore (el SDK se carga bajo demanda). */
export class FirebaseBackend extends Backend {
  readonly mode = 'firebase' as const;
  private sdk?: Promise<{ auth: Auth; db: Firestore }>;

  constructor(private readonly config: FirebaseConfig) {
    super();
  }

  private init() {
    this.sdk ??= (async () => {
      const [{ initializeApp }, { getAuth }, { getFirestore }] = await Promise.all([
        import('firebase/app'),
        import('firebase/auth'),
        import('firebase/firestore'),
      ]);
      const app = initializeApp(this.config);
      return { auth: getAuth(app), db: getFirestore(app) };
    })();
    return this.sdk;
  }

  private async profile(uid: string): Promise<UserProfile> {
    const { db } = await this.init();
    const { doc, getDoc } = await import('firebase/firestore');
    const snap = await getDoc(doc(db, 'users', uid));
    if (!snap.exists()) throw new AppError('Perfil no encontrado.');
    return { ...(snap.data() as Omit<UserProfile, 'uid'>), uid };
  }

  async restoreSession(): Promise<UserProfile | null> {
    const { auth } = await this.init();
    await auth.authStateReady();
    return auth.currentUser ? this.profile(auth.currentUser.uid) : null;
  }

  async signIn(email: string, password: string): Promise<UserProfile> {
    try {
      const { auth } = await this.init();
      const { signInWithEmailAndPassword } = await import('firebase/auth');
      const { user } = await signInWithEmailAndPassword(auth, email, password);
      return await this.profile(user.uid);
    } catch (e) {
      throw toAppError(e);
    }
  }

  async signUp(name: string, email: string, password: string, role: Role): Promise<UserProfile> {
    try {
      const { auth, db } = await this.init();
      const { createUserWithEmailAndPassword } = await import('firebase/auth');
      const { doc, setDoc } = await import('firebase/firestore');
      const { user } = await createUserWithEmailAndPassword(auth, email, password);
      const data = { name: name.trim(), email: email.trim().toLowerCase(), role };
      await setDoc(doc(db, 'users', user.uid), data);
      return { uid: user.uid, ...data };
    } catch (e) {
      throw toAppError(e);
    }
  }

  async signOut(): Promise<void> {
    const { auth } = await this.init();
    await auth.signOut();
  }

  async resetPassword(email: string): Promise<void> {
    try {
      const { auth } = await this.init();
      const { sendPasswordResetEmail } = await import('firebase/auth');
      await sendPasswordResetEmail(auth, email);
    } catch (e) {
      throw toAppError(e);
    }
  }

  async listSessions(teacherId: string): Promise<ClassSession[]> {
    const { db } = await this.init();
    const { collection, getDocs, query, where } = await import('firebase/firestore');
    const snap = await getDocs(query(collection(db, 'sessions'), where('teacherId', '==', teacherId)));
    return snap.docs
      .map((d) => ({ ...(d.data() as Omit<ClassSession, 'id'>), id: d.id }))
      .sort((a, b) => b.startsAt.localeCompare(a.startsAt));
  }

  async getSession(id: string): Promise<ClassSession | null> {
    const { db } = await this.init();
    const { doc, getDoc } = await import('firebase/firestore');
    const snap = await getDoc(doc(db, 'sessions', id));
    return snap.exists() ? { ...(snap.data() as Omit<ClassSession, 'id'>), id } : null;
  }

  async createSession(teacher: UserProfile, data: NewSession): Promise<ClassSession> {
    const { db } = await this.init();
    const { addDoc, collection } = await import('firebase/firestore');
    const body = { ...data, teacherId: teacher.uid, teacherName: teacher.name, code: randomCode() };
    const ref = await addDoc(collection(db, 'sessions'), body);
    return { ...body, id: ref.id };
  }

  async deleteSession(id: string): Promise<void> {
    const { db } = await this.init();
    const { collection, deleteDoc, doc, getDocs, query, where } = await import('firebase/firestore');
    const records = await getDocs(query(collection(db, 'attendance'), where('sessionId', '==', id)));
    await Promise.all(records.docs.map((d) => deleteDoc(d.ref)));
    await deleteDoc(doc(db, 'sessions', id));
  }

  async checkIn(student: UserProfile, sessionId: string, code: string): Promise<Attendance> {
    try {
      const session = await this.getSession(sessionId);
      if (!session) throw new AppError('Este código QR no es válido.');
      if (!(await isValidToken(session.code, code))) {
        throw new AppError('El código QR expiró. Escanea el que se muestra ahora.');
      }
      if (Date.now() > new Date(session.expiresAt).getTime()) throw new AppError('La clase ya cerró el registro.');
      const { db } = await this.init();
      const { doc, getDoc, setDoc } = await import('firebase/firestore');
      const id = `${sessionId}_${student.uid}`;
      const ref = doc(db, 'attendance', id);
      if ((await getDoc(ref)).exists()) throw new AppError('Ya registraste tu asistencia a esta clase.');
      const record: Attendance = {
        id,
        sessionId,
        course: session.course,
        studentId: student.uid,
        studentName: student.name,
        checkedAt: new Date().toISOString(),
      };
      await setDoc(ref, record);
      return record;
    } catch (e) {
      throw toAppError(e);
    }
  }

  async listAttendance(sessionId: string): Promise<Attendance[]> {
    const { db } = await this.init();
    const { collection, getDocs, query, where } = await import('firebase/firestore');
    const snap = await getDocs(query(collection(db, 'attendance'), where('sessionId', '==', sessionId)));
    return snap.docs.map((d) => d.data() as Attendance).sort((a, b) => a.checkedAt.localeCompare(b.checkedAt));
  }

  async listMyAttendance(studentId: string): Promise<Attendance[]> {
    const { db } = await this.init();
    const { collection, getDocs, query, where } = await import('firebase/firestore');
    const snap = await getDocs(query(collection(db, 'attendance'), where('studentId', '==', studentId)));
    return snap.docs.map((d) => d.data() as Attendance).sort((a, b) => b.checkedAt.localeCompare(a.checkedAt));
  }
}
