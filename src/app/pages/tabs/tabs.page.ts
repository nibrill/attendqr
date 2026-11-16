import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { IonIcon, IonLabel, IonTabBar, IonTabButton, IonTabs } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { personOutline, qrCodeOutline, schoolOutline, timeOutline } from 'ionicons/icons';

import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-tabs',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel],
  template: `
    <ion-tabs>
      <ion-tab-bar slot="bottom">
        @if (auth.isTeacher()) {
          <ion-tab-button tab="clases">
            <ion-icon name="school-outline"></ion-icon>
            <ion-label>Clases</ion-label>
          </ion-tab-button>
        } @else {
          <ion-tab-button tab="escanear">
            <ion-icon name="qr-code-outline"></ion-icon>
            <ion-label>Escanear</ion-label>
          </ion-tab-button>
          <ion-tab-button tab="historial">
            <ion-icon name="time-outline"></ion-icon>
            <ion-label>Historial</ion-label>
          </ion-tab-button>
        }
        <ion-tab-button tab="perfil">
          <ion-icon name="person-outline"></ion-icon>
          <ion-label>Perfil</ion-label>
        </ion-tab-button>
      </ion-tab-bar>
    </ion-tabs>
  `,
})
export class TabsPage {
  protected readonly auth = inject(AuthService);

  constructor() {
    addIcons({ personOutline, qrCodeOutline, schoolOutline, timeOutline });
  }
}
