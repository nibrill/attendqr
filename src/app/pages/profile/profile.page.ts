import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { IonButton, IonContent, IonHeader, IonToolbar } from '@ionic/angular';

import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-profile',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonButton, IonContent, IonHeader, IonToolbar],
  template: `
    <ion-header class="ion-no-border"><ion-toolbar></ion-toolbar></ion-header>
    <ion-content>
      <h1 class="page-title">Perfil</h1>
      @if (auth.user(); as user) {
        <section class="aq-card">
          <div class="avatar" aria-hidden="true">{{ user.name.charAt(0).toUpperCase() }}</div>
          <h2>{{ user.name }}</h2>
          <p class="mail">{{ user.email }}</p>
          <span class="role">{{ user.role === 'teacher' ? 'Docente' : 'Estudiante' }}</span>
        </section>
      }
      @if (auth.mode === 'demo') {
        <p class="page-subtitle">Modo demo: tus datos se guardan solo en este navegador.</p>
      }
      <div class="actions">
        <ion-button color="danger" fill="outline" expand="block" (click)="logout()">Cerrar sesión</ion-button>
      </div>
    </ion-content>
  `,
  styles: `
    section {
      text-align: center;
    }
    .avatar {
      display: inline-grid;
      place-items: center;
      width: 72px;
      height: 72px;
      border-radius: 50%;
      color: #fff;
      font-size: 1.8rem;
      font-weight: 700;
      background: var(--aq-gradient);
    }
    h2 {
      margin: 12px 0 2px;
    }
    .mail {
      margin: 0 0 12px;
      color: var(--aq-muted);
    }
    .role {
      padding: 4px 14px;
      border-radius: 999px;
      background: rgb(var(--ion-color-primary-rgb) / 15%);
      color: var(--ion-color-primary);
      font-weight: 600;
      font-size: 0.85rem;
    }
    .actions {
      margin: 16px;
    }
  `,
})
export class ProfilePage {
  protected readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected async logout(): Promise<void> {
    await this.auth.signOut();
    await this.router.navigateByUrl('/login', { replaceUrl: true });
  }
}
