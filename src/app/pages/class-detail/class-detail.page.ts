import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, effect, inject, input, signal } from '@angular/core';
import { Router } from '@angular/router';
import {
  AlertController,
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonToolbar,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { downloadOutline, trashOutline } from 'ionicons/icons';
import QRCode from 'qrcode';

import { Backend } from '../../core/backend';
import type { Attendance, ClassSession } from '../../core/models';
import { ROTATION_SECONDS, currentStep, encodePayload, rotatingToken, toCsv } from '../../core/qr';
import { UiService } from '../../core/ui.service';

@Component({
  selector: 'app-class-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './class-detail.page.html',
  styleUrl: './class-detail.page.scss',
  imports: [DatePipe, IonBackButton, IonButton, IonButtons, IonContent, IonHeader, IonIcon, IonToolbar],
})
export class ClassDetailPage {
  /** Parámetro de ruta `:id` (enlazado con `withComponentInputBinding`). */
  readonly id = input.required<string>();

  private readonly backend = inject(Backend);
  private readonly router = inject(Router);
  private readonly ui = inject(UiService);
  private readonly alerts = inject(AlertController);

  protected readonly session = signal<ClassSession | null>(null);
  protected readonly attendees = signal<Attendance[]>([]);
  protected readonly qr = signal('');
  protected readonly missing = signal(false);
  /** Segundos que faltan para que el QR cambie. */
  protected readonly remaining = signal(ROTATION_SECONDS);
  protected readonly rotation = ROTATION_SECONDS;
  private step = -1;

  constructor() {
    addIcons({ downloadOutline, trashOutline });
    effect(() => void this.load(this.id()));
    // Actualiza la lista de asistentes mientras la pantalla está abierta.
    const timer = setInterval(() => void this.refreshAttendees(), 4000);
    const clock = setInterval(() => void this.tick(), 1000);
    inject(DestroyRef).onDestroy(() => {
      clearInterval(timer);
      clearInterval(clock);
    });
  }

  private async load(id: string): Promise<void> {
    const session = await this.backend.getSession(id);
    this.missing.set(!session);
    this.session.set(session);
    if (!session) return;
    this.step = -1;
    await this.tick();
    await this.refreshAttendees();
  }

  /** Actualiza la cuenta regresiva y regenera el QR cuando cambia la ventana de tiempo. */
  private async tick(): Promise<void> {
    const session = this.session();
    if (!session) return;
    const step = currentStep();
    this.remaining.set(ROTATION_SECONDS - (Math.floor(Date.now() / 1000) % ROTATION_SECONDS));
    if (step === this.step) return;
    this.step = step;
    const code = await rotatingToken(session.code, step);
    this.qr.set(
      await QRCode.toDataURL(encodePayload({ sessionId: session.id, code }), {
        width: 480,
        margin: 2,
        errorCorrectionLevel: 'M',
      }),
    );
  }

  private async refreshAttendees(): Promise<void> {
    const s = this.session();
    if (s) this.attendees.set(await this.backend.listAttendance(s.id));
  }

  protected isOpen(): boolean {
    const s = this.session();
    return !!s && Date.now() <= new Date(s.expiresAt).getTime();
  }

  protected exportCsv(): void {
    const s = this.session();
    if (!s) return;
    const rows = [
      ['Asignatura', 'Estudiante', 'Hora de registro'],
      ...this.attendees().map((a) => [s.course, a.studentName, new Date(a.checkedAt).toLocaleString('es-CL')]),
    ];
    const url = URL.createObjectURL(new Blob([toCsv(rows)], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `asistencia-${s.course.toLowerCase().replaceAll(/[^a-z0-9]+/g, '-')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  protected async confirmDelete(): Promise<void> {
    const s = this.session();
    if (!s) return;
    const alert = await this.alerts.create({
      header: 'Eliminar clase',
      message: 'Se borrará la clase y todos sus registros de asistencia. Esta acción no se puede deshacer.',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Eliminar',
          role: 'destructive',
          handler: () => {
            void this.remove(s.id);
          },
        },
      ],
    });
    await alert.present();
  }

  private async remove(id: string): Promise<void> {
    try {
      await this.backend.deleteSession(id);
      await this.ui.toast('Clase eliminada');
      await this.router.navigateByUrl('/app/clases', { replaceUrl: true });
    } catch (e) {
      await this.ui.error(e);
    }
  }
}
