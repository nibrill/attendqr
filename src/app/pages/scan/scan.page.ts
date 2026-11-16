import type { ElementRef } from '@angular/core';
import { ChangeDetectionStrategy, Component, inject, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IonButton, IonContent, IonHeader, IonIcon, IonInput, IonToolbar } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { cameraOutline, checkmarkCircle, imageOutline } from 'ionicons/icons';

import { AuthService } from '../../core/auth.service';
import { Backend } from '../../core/backend';
import type { Attendance } from '../../core/models';
import { decodePayload } from '../../core/qr';
import { UiService } from '../../core/ui.service';

interface ScannerControls {
  stop(): void;
}

@Component({
  selector: 'app-scan',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './scan.page.html',
  styleUrl: './scan.page.scss',
  imports: [FormsModule, IonButton, IonContent, IonHeader, IonIcon, IonInput, IonToolbar],
})
export class ScanPage {
  private readonly backend = inject(Backend);
  private readonly auth = inject(AuthService);
  private readonly ui = inject(UiService);
  private readonly video = viewChild<ElementRef<HTMLVideoElement>>('video');
  private controls?: ScannerControls;
  private handling = false;

  protected readonly scanning = signal(false);
  protected readonly result = signal<Attendance | null>(null);
  protected manualCode = '';

  constructor() {
    addIcons({ cameraOutline, checkmarkCircle, imageOutline });
  }

  ionViewWillLeave(): void {
    this.stop();
  }

  protected stop(): void {
    this.controls?.stop();
    this.controls = undefined;
    this.scanning.set(false);
  }

  protected async startCamera(): Promise<void> {
    this.result.set(null);
    this.scanning.set(true);
    try {
      const { BrowserQRCodeReader } = await import('@zxing/browser');
      const element = this.video()?.nativeElement;
      if (!element) return;
      this.controls = await new BrowserQRCodeReader().decodeFromVideoDevice(undefined, element, (res) => {
        if (res) void this.handle(res.getText());
      });
    } catch {
      this.stop();
      await this.ui.toast('No pudimos acceder a la cámara. Sube una imagen o ingresa el código.', 'danger');
    }
  }

  protected async fromImage(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    const url = URL.createObjectURL(file);
    try {
      const { BrowserQRCodeReader } = await import('@zxing/browser');
      const res = await new BrowserQRCodeReader().decodeFromImageUrl(url);
      await this.handle(res.getText());
    } catch {
      await this.ui.toast('No se encontró un código QR en la imagen.', 'danger');
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  protected async submitManual(): Promise<void> {
    await this.handle(this.manualCode);
  }

  private async handle(text: string): Promise<void> {
    const user = this.auth.user();
    if (!user || this.handling) return;
    this.handling = true;
    try {
      const payload = decodePayload(text);
      if (!payload) {
        await this.ui.toast('Ese no es un código QR de AttendQR.', 'danger');
        return;
      }
      const record = await this.backend.checkIn(user, payload.sessionId, payload.code);
      this.stop();
      this.manualCode = '';
      this.result.set(record);
      await this.ui.toast('¡Asistencia registrada!', 'success');
    } catch (e) {
      await this.ui.error(e);
    } finally {
      // Evita lecturas repetidas del mismo QR mientras la cámara sigue activa.
      setTimeout(() => (this.handling = false), 2500);
    }
  }
}
