import { Component, inject, signal, computed, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { SelectModule } from 'primeng/select';
import { FormsModule } from '@angular/forms';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { RatingModule } from 'primeng/rating';
import { CommonModule } from '@angular/common';

import { AudioRecorderService } from './services/audio-recorder.service';
import { WebsocketTranslatorService } from './services/websocket-translator.service';
import { Language, RecordingState, WsMessage } from './models/translation-result.model';

/**
 * Componente del Traductor de Voz con WebSockets.
 *
 * Flujo en tiempo real:
 *  1. Iniciar escucha → Conecta al WebSocket, abre el micrófono persistente.
 *  2. Mientras habla → Cada 2.5s se envía un fragmento de audio al backend.
 *  3. El panel de entrada muestra la transcripción parcial en vivo.
 *  4. Pausa de 2s → El backend traduce el texto acumulado y genera el audio.
 *  5. El panel de traducción se actualiza y el audio se reproduce.
 */
@Component({
  selector: 'app-voice-translator',
  imports: [
    CommonModule, FormsModule,
    ButtonModule, CardModule, TagModule,
    SelectModule, ProgressSpinnerModule, RatingModule,
  ],
  templateUrl: './voice-translator.html',
  styleUrl: './voice-translator.scss',
})
export class VoiceTranslator implements OnDestroy {
  private router = inject(Router);
  private audioRecorder = inject(AudioRecorderService);
  private wsTranslator = inject(WebsocketTranslatorService);

  // ─── Estado reactivo (signals) ─────────────────────────────────────────────
  readonly state = signal<RecordingState>('idle');
  readonly transcripcion = signal('');
  readonly traduccion = signal('');
  readonly errorMessage = signal('');

  /** Suscripciones activas durante el modo escucha */
  private subs: Subscription[] = [];

  // ─── Idiomas ───────────────────────────────────────────────────────────────
  readonly languages: Language[] = [
    { name: 'Español', code: 'es', flag: '🇲🇽' },
    { name: 'Inglés', code: 'en', flag: '🇺🇸' },
  ];
  sourceLang: Language = this.languages[0];
  targetLang: Language = this.languages[1];
  ratingValue = 0;

  // ─── Computed ──────────────────────────────────────────────────────────────
  readonly isIdle = computed(() => this.state() === 'idle');
  readonly isListening = computed(() => this.state() === 'listening');
  readonly isProcessing = computed(() => this.state() === 'processing');
  readonly isError = computed(() => this.state() === 'error');

  readonly micIcon = computed(() =>
    this.isListening() || this.isProcessing() ? 'pi pi-stop-circle' : 'pi pi-microphone'
  );

  readonly micSeverity = computed<'danger' | 'primary'>(() =>
    this.isListening() || this.isProcessing() ? 'danger' : 'primary'
  );

  readonly micMainLabel = computed(() =>
    this.isIdle() ? 'Iniciar escucha' : 'Detener'
  );

  readonly micSubLabel = computed(() => {
    if (this.isListening()) return 'Habla ahora... la transcripción aparecerá en tiempo real.';
    if (this.isProcessing()) return 'Traduciendo y generando voz...';
    return '';
  });

  readonly inputStatusLabel = computed(() => ({
    idle: 'En espera', listening: 'Escuchando', processing: 'Procesando', done: 'Listo', error: 'Error'
  }[this.state()]));

  readonly inputStatusSeverity = computed<'secondary' | 'warn' | 'success' | 'danger'>(() => ({
    idle: 'secondary', listening: 'warn', processing: 'warn', done: 'success', error: 'danger'
  }[this.state()] as 'secondary' | 'warn' | 'success' | 'danger'));

  readonly translationStatusLabel = computed(() => ({
    idle: 'En espera', listening: 'Escuchando', processing: 'Traduciendo', done: 'Lista', error: 'Error'
  }[this.state()]));

  // ─── Acciones ──────────────────────────────────────────────────────────────

  /** Inicia o detiene la sesión de traducción. */
  async toggleRecording(): Promise<void> {
    if (this.isIdle() || this.isError()) {
      await this.startListening();
    } else {
      await this.stopAll();
    }
  }

  /**
   * Conecta al WebSocket, suscribe la UI a los eventos y abre el micrófono.
   */
  private async startListening(): Promise<void> {
    this.resetResults();
    this.state.set('listening');

    try {
      // 1. Conectar WebSocket e inicializar canales de datos
      this.wsTranslator.connect(this.sourceLang.code, this.targetLang.code);
      this._subscribeToWsMessages();

      // 2. Abrir micrófono y activar listeners locales
      await this.audioRecorder.startRecording();

      // En la arquitectura VAD, cuando el usuario hace una pausa, se emite toda la frase.
      this.subs.push(
        this.audioRecorder.onUtteranceReady$.subscribe((blob) => {
          this.state.set('processing'); // Cambiar UI a procesando
          this.wsTranslator.sendAudioUtterance(blob); // Enviar todo al backend de golpe
        })
      );

    } catch (err) {
      this.setError('No se pudo acceder al micrófono o servidor.');
      this.stopAll();
    }
  }

  /**
   * Suscribe el componente a los mensajes entrantes del WebSocket.
   */
  private _subscribeToWsMessages(): void {
    this.subs.push(
      this.wsTranslator.messages$.subscribe((msg: WsMessage) => {
        switch (msg.type) {
          case 'translation_result':
            // Se recibe traducción y voz sintetizada final
            this.transcripcion.set(msg.transcripcion);
            this.traduccion.set(msg.traduccion);
            this.playAudio(msg.audio_base64);
            this.state.set('listening'); // Listo para seguir escuchando la siguiente frase
            break;

          case 'error':
            this.setError(msg.message);
            this.state.set('listening'); // Reanuda la escucha para no interrumpir
            break;
        }
      })
    );
  }

  private playAudio(base64: string): void {
    const audio = new Audio(`data:audio/mp3;base64,${base64}`);
    audio.play().catch(() =>
      console.warn('[VoiceTranslator] Autoplay bloqueado por el navegador.')
    );
  }

  /** Detiene todo: desconecta WebSocket, libera micrófono y limpia suscripciones. */
  private async stopAll(): Promise<void> {
    // 1. Limpiar suscripciones locales para evitar memory leaks
    this.subs.forEach(sub => sub.unsubscribe());
    this.subs = [];

    // 2. Apagar micrófono
    await this.audioRecorder.fullyStop();

    // 3. Desconectar WebSocket
    this.wsTranslator.disconnect();

    this.state.set('idle');
  }

  swapLanguages(): void {
    [this.sourceLang, this.targetLang] = [this.targetLang, this.sourceLang];
    if (this.isListening() || this.isProcessing()) {
      // Si estamos en medio de una grabación, reseteamos el buffer de traducción en el server
      this.wsTranslator.sendReset();
      this.wsTranslator.connect(this.sourceLang.code, this.targetLang.code);
    }
  }

  private resetResults(): void {
    this.transcripcion.set('');
    this.traduccion.set('');
    this.errorMessage.set('');
  }

  private setError(message: string): void {
    this.errorMessage.set(message);
    this.state.set('error');
  }

  ngOnDestroy(): void {
    this.stopAll();
  }

  cerrarSesion(): void { this.router.navigate(['/login']); }
  verPlanes(): void { this.router.navigate(['/planes']); }
}
