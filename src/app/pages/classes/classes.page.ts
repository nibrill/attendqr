import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { IonButton, IonContent, IonDatetime, IonHeader, IonIcon, IonInput, IonToolbar } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { addOutline, chevronForward, schoolOutline } from 'ionicons/icons';

import { AuthService } from '../../core/auth.service';
import { Backend } from '../../core/backend';
import type { ClassSession } from '../../core/models';
import { UiService } from '../../core/ui.service';

/** Valor `YYYY-MM-DDTHH:mm` en hora local. */
function localIso(offsetMinutes: number): string {
  const d = new Date(Date.now() + offsetMinutes * 60_000);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

@Component({
  selector: 'app-classes',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './classes.page.html',
  styleUrl: './classes.page.scss',
  imports: [
    DatePipe,
    ReactiveFormsModule,
    IonButton,
    IonContent,
    IonDatetime,
    IonHeader,
    IonIcon,
    IonInput,
    IonToolbar,
  ],
})
export class ClassesPage {
  private readonly backend = inject(Backend);
  private readonly auth = inject(AuthService);
  protected readonly router = inject(Router);
  private readonly ui = inject(UiService);
  private readonly fb = inject(FormBuilder).nonNullable;

  protected readonly sessions = signal<ClassSession[]>([]);
  protected readonly creating = signal(false);

  protected readonly form = this.fb.group({
    course: ['', [Validators.required, Validators.minLength(3)]],
    room: ['', Validators.required],
    startsAt: [localIso(0), Validators.required],
    minutes: [15, [Validators.required, Validators.min(1), Validators.max(240)]],
  });

  constructor() {
    addIcons({ addOutline, chevronForward, schoolOutline });
  }

  ionViewWillEnter(): void {
    void this.load();
  }

  private async load(): Promise<void> {
    const user = this.auth.user();
    if (user) this.sessions.set(await this.backend.listSessions(user.uid));
  }

  protected isOpen(s: ClassSession): boolean {
    return Date.now() <= new Date(s.expiresAt).getTime();
  }

  protected async create(): Promise<void> {
    const user = this.auth.user();
    if (!user || this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const startsAt = new Date(v.startsAt);
    try {
      const session = await this.backend.createSession(user, {
        course: v.course.trim(),
        room: v.room.trim(),
        startsAt: startsAt.toISOString(),
        expiresAt: new Date(startsAt.getTime() + Number(v.minutes) * 60_000).toISOString(),
      });
      this.creating.set(false);
      this.form.patchValue({ course: '', room: '' });
      this.form.markAsUntouched();
      await this.router.navigate(['/app/clases', session.id]);
    } catch (e) {
      await this.ui.error(e);
    }
  }
}
