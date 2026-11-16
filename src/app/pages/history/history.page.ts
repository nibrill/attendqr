import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { IonContent, IonHeader, IonIcon, IonToolbar } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { timeOutline } from 'ionicons/icons';

import { AuthService } from '../../core/auth.service';
import { Backend } from '../../core/backend';
import type { Attendance } from '../../core/models';

@Component({
  selector: 'app-history',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, IonContent, IonHeader, IonIcon, IonToolbar],
  template: `
    <ion-header class="ion-no-border"><ion-toolbar></ion-toolbar></ion-header>
    <ion-content>
      <h1 class="page-title">Mi historial</h1>
      <p class="page-subtitle">{{ records().length }} asistencias registradas.</p>
      @if (!records().length) {
        <div class="aq-empty">
          <ion-icon name="time-outline"></ion-icon>
          <p>Cuando registres asistencia a una clase, aparecerá aquí.</p>
        </div>
      }
      @for (r of records(); track r.id) {
        <article class="aq-card">
          <strong>{{ r.course }}</strong>
          <time>{{ r.checkedAt | date: "EEEE d 'de' MMMM, HH:mm" }}</time>
        </article>
      }
    </ion-content>
  `,
  styles: `
    article {
      display: grid;
      gap: 4px;
    }
    time {
      color: var(--aq-muted);
      font-size: 0.85rem;
    }
  `,
})
export class HistoryPage {
  private readonly backend = inject(Backend);
  private readonly auth = inject(AuthService);
  protected readonly records = signal<Attendance[]>([]);

  constructor() {
    addIcons({ timeOutline });
  }

  ionViewWillEnter(): void {
    const user = this.auth.user();
    if (user) void this.backend.listMyAttendance(user.uid).then((r) => this.records.set(r));
  }
}
