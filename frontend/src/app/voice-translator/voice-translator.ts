import { Component, inject, signal, computed, OnDestroy, ElementRef, ViewChild, NgZone } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { SelectModule } from 'primeng/select';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { RatingModule } from 'primeng/rating';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';

import { AudioRecorderService } from './services/audio-recorder.service';
import { WebsocketTranslatorService } from './services/websocket-translator.service';
import { RecordingState, WsMessage, Language } from './models/translation-result.model';

@Component({
  selector: 'app-voice-translator',
  imports: [
    CommonModule, FormsModule,
    ButtonModule, CardModule, TagModule, SelectModule,
    ProgressSpinnerModule, RatingModule, DialogModule, InputTextModule,
    ToastModule
  ],
  providers: [MessageService],
  templateUrl: './voice-translator.html',
  styleUrl: './voice-translator.scss',
})
export class VoiceTranslator implements OnDestroy {
  @ViewChild('waveCanvas') waveCanvasRef!: ElementRef<HTMLCanvasElement>;

  private router       = inject(Router);
  private audioRecorder = inject(AudioRecorderService);
  private wsTranslator  = inject(WebsocketTranslatorService);
  private ngZone        = inject(NgZone);
  private messageService = inject(MessageService);

  // ─── Estado reactivo ───────────────────────────────────────────────────────
  readonly state         = signal<RecordingState>('idle');
  readonly transcripcion = signal<string>('');
  readonly traduccion    = signal<string>('');
  readonly errorMessage  = signal('');
  readonly detectedLang  = signal<string | null>(null);
  readonly resultTarget  = signal<string | null>(null);

  private subs: Subscription[] = [];

  // Modal de Idiomas
  showLangModal = false;
  modalSide: 'source' | 'target' = 'source';
  searchQuery = '';

  // Modal de Calificación de Traducción
  showRatingModal = false;
  ratingValue = 0;

  // Variables de audio para reproducción secuencial (intérprete simultáneo)
  private currentAudio: HTMLAudioElement | null = null;
  private audioQueue: string[] = [];
  private isPlayingQueue = false;
  private readonly WAVE_BARS = 32;

  // Animación de ondas
  private volumeLevel = 0;
  private waveAnimId: number | null = null;

  // ─── Configuración de Idiomas ──────────────────────────────────────────────
  readonly languages: Language[] = [
    { name: 'Español', code: 'es', flag: 'es' },
    { name: 'Inglés', code: 'en', flag: 'en' },
    { name: 'Francés', code: 'fr', flag: 'fr' },
    { name: 'Alemán', code: 'de', flag: 'de' },
    { name: 'Portugués', code: 'pt', flag: 'pt' },
    { name: 'Italiano', code: 'it', flag: 'it' },
    { name: 'Japonés', code: 'ja', flag: 'ja' },
    { name: 'Coreano', code: 'ko', flag: 'ko' },
  ];

  sourceLang: Language = this.languages[0];
  targetLang: Language = this.languages[1];

  readonly filteredLanguages = computed(() => {
    const q = this.searchQuery.toLowerCase().trim();
    if (!q) return this.languages;
    return this.languages.filter(l =>
      l.name.toLowerCase().includes(q) || l.code.toLowerCase().includes(q)
    );
  });

  // ─── Computed ──────────────────────────────────────────────────────────────
  readonly isIdle       = computed(() => this.state() === 'idle');
  readonly isListening  = computed(() => this.state() === 'listening');
  readonly isProcessing = computed(() => this.state() === 'processing');
  readonly isError      = computed(() => this.state() === 'error');

  readonly micMainLabel = computed(() =>
    this.isIdle() ? 'Iniciar escucha' : 'Detener'
  );

  readonly micSubLabel = computed(() => {
    if (this.isListening()) {
      return `Habla en ${this.sourceLang.name} o ${this.targetLang.name}...`;
    }
    if (this.isProcessing()) return 'Traduciendo y generando voz...';
    return '';
  });

  readonly inputStatusLabel = computed(() =>
    ({ idle: 'En espera', listening: 'Escuchando', meeting: 'Reunión', processing: 'Procesando', error: 'Error' }[this.state()])
  );

  readonly inputStatusSeverity = computed<'secondary' | 'warn' | 'success' | 'danger'>(() =>
    ({ idle: 'secondary', listening: 'warn', meeting: 'success', processing: 'warn', error: 'danger' }[this.state()] as any)
  );

  // ─── Acciones públicas ─────────────────────────────────────────────────────

  async toggleRecording(): Promise<void> {
    if (this.isIdle() || this.isError()) {
      await this.startListening();
    } else {
      await this.stopAll();
      // Mostrar calificación tras detener el micrófono (como hace WhatsApp)
      if (this.traduccion()) {
        setTimeout(() => { this.showRatingModal = true; }, 600);
      }
    }
  }

  onConfigChange(): void {
    this.wsTranslator.sendConfig('manual', this.sourceLang.code, this.targetLang.code);
  }

  openLangModal(side: 'source' | 'target'): void {
    if (this.isIdle()) {
      this.modalSide = side;
      this.searchQuery = '';
      this.showLangModal = true;
    }
  }

  swapLanguages(): void {
    if (this.isIdle()) {
      const temp = this.sourceLang;
      this.sourceLang = this.targetLang;
      this.targetLang = temp;
      this.onConfigChange();
    }
  }

  selectLanguage(lang: Language): void {
    if (this.modalSide === 'source') {
      this.sourceLang = lang;
    } else {
      this.targetLang = lang;
    }
    this.showLangModal = false;
    this.onConfigChange();
  }

  // Modal de calificación de traducción
  submitRating(): void {
    console.log('Valoración enviada:', this.ratingValue, 'estrellas');
    this.showRatingModal = false;
    this.ratingValue = 0;
  }

  skipRating(): void {
    this.showRatingModal = false;
    this.ratingValue = 0;
  }

  // ─── Internos ──────────────────────────────────────────────────────────────

  private async startListening(): Promise<void> {
    this.resetResults();
    this.state.set('listening');

    this.subs.forEach(sub => sub.unsubscribe());
    this.subs = [];
    this._stopWaveAnimation();

    try {
      this.wsTranslator.connect();
      setTimeout(() => this.onConfigChange(), 500);

      this._subscribeToWsMessages();

      await this.audioRecorder.startRecording(this.sourceLang.code);

      this.subs.push(
        this.wsTranslator.connectionStatus$.subscribe(status => {
          if (status === 'disconnected') {
            if (this.state() !== 'idle') {
              this.state.set('idle');
              this.setError('Conexión perdida con el servidor.');
              this.audioRecorder.fullyStop();
            }
          }
        })
      );

      this.subs.push(
        this.audioRecorder.onVolumeLevel$.subscribe(vol => {
          this.volumeLevel = vol;
        })
      );

      this.subs.push(
        this.audioRecorder.onPartialTranscript$.subscribe((text) => {
          this.transcripcion.set(text);
        })
      );

      this.subs.push(
        this.audioRecorder.onPartialTranscript$.pipe(
          debounceTime(500)
        ).subscribe((text) => {
          this.wsTranslator.send({ type: 'translate_text', text: text });
        })
      );

      this.subs.push(
        this.audioRecorder.onUtteranceReady$.subscribe(() => {
          this.ngZone.run(() => {
            // Bloquear el micrófono apagándolo por completo para que no haga cola
            this.audioRecorder.fullyStop();
            this.state.set('processing');
            
            // Usar la transcripción literal que ya hizo el navegador
            const textToTranslate = this.transcripcion();
            this.wsTranslator.sendTextUtterance(textToTranslate);
          });
        })
      );

      this._startWaveAnimation();

    } catch (err) {
      this.setError('No se pudo acceder al micrófono. Por favor, revisa los permisos.');
    }
  }

  private _subscribeToWsMessages(): void {
    this.subs.push(
      this.wsTranslator.messages$.subscribe((msg: WsMessage) => {
        switch (msg.type) {
          case 'partial_translation_result':
            if ((msg as any).traduccion) {
              this.traduccion.set((msg as any).traduccion);
            }
            break;

          case 'partial_audio':
            if ((msg as any).audio_base64) {
              this.queueAudio((msg as any).audio_base64);
            }
            break;

          case 'meeting_result':
            this.transcripcion.set(msg.transcripcion);
            this.traduccion.set(msg.traduccion);
            this.detectedLang.set(msg.source_lang ?? null);
            this.resultTarget.set(msg.target_lang ?? null);
            break;

          case 'translation_result':
            this.transcripcion.set(msg.transcripcion);
            this.traduccion.set(msg.traduccion);
            this.detectedLang.set(msg.source_lang ?? null);
            this.resultTarget.set(msg.target_lang ?? null);
            
            // Mantener estado 'processing' para que el microfono siga bloqueado
            // mientras se reproduce el audio
            this.playAudio(msg.audio_base64, true);
            break;

          case 'no_speech':
            this.messageService.add({ severity: 'info', summary: 'Aviso', detail: msg.message, life: 3000 });
            if (this.state() === 'processing') {
              this.startListening();
            } else {
              this.state.set('idle');
            }
            break;

          case 'error':
            this.messageService.add({ severity: 'error', summary: 'Error', detail: msg.message ?? 'Error desconocido.', life: 4000 });
            if (this.state() === 'processing') {
              this.startListening();
            } else {
              this.state.set('idle');
            }
            break;
        }
      })
    );
  }

  // ─── Reproducción de Audio (Cola y Final) ──────────────────────────────

  private queueAudio(base64: string): void {
    this.audioQueue.push(base64);
    this.playNextAudio();
  }

  private playNextAudio(): void {
    if (this.isPlayingQueue || this.audioQueue.length === 0) return;
    this.isPlayingQueue = true;

    const base64 = this.audioQueue.shift();
    if (!base64) {
      this.isPlayingQueue = false;
      return;
    }

    this.currentAudio = new Audio('data:audio/mp3;base64,' + base64);
    this.audioRecorder.setMuted(true);
    this.currentAudio.onended = () => {
      this.audioRecorder.setMuted(false);
      this.isPlayingQueue = false;
      this.playNextAudio();
    };
    this.currentAudio.play().catch(e => {
      console.error('Error reproduciendo chunk de audio:', e);
      this.audioRecorder.setMuted(false);
      this.isPlayingQueue = false;
      this.playNextAudio();
    });
  }

  private playAudio(base64: string, autoResume: boolean = false): void {
    this.audioQueue = [];
    if (this.currentAudio) {
      this.currentAudio.pause();
    }
    
    if (!base64 || base64.trim().length === 0) {
      console.warn('Audio vacío recibido, omitiendo reproducción.');
      if (autoResume && this.state() === 'processing') {
        this.startListening();
      } else if (this.state() === 'processing') {
        this.state.set('idle');
      }
      return;
    }

    this.currentAudio = new Audio('data:audio/mp3;base64,' + base64);
    this.currentAudio.playbackRate = 1.35;
    this.audioRecorder.setMuted(true);
    
    this.currentAudio.onended = () => {
      this.audioRecorder.setMuted(false);
      this.isPlayingQueue = false;
      this.currentAudio = null;
      
      // Auto-reanudar grabación si está en modo processing
      if (autoResume && this.state() === 'processing') {
        this.startListening();
      } else if (this.state() === 'processing') {
        this.state.set('idle');
      }
    };

    this.currentAudio.onerror = (e) => {
      console.error('Error al decodificar/cargar audio:', e);
      this.audioRecorder.setMuted(false);
      this.isPlayingQueue = false;
      this.currentAudio = null;
      if (autoResume && this.state() === 'processing') {
        this.startListening();
      } else if (this.state() === 'processing') {
        this.state.set('idle');
      }
    };
    
    this.isPlayingQueue = true;
    this.currentAudio.play().catch(e => {
      this.audioRecorder.setMuted(false);
      console.error('Error audio final:', e);
      if (autoResume && this.state() === 'processing') {
        this.startListening();
      }
    });
  }

  private async stopAll(): Promise<void> {
    this._stopWaveAnimation();
    this.subs.forEach(sub => sub.unsubscribe());
    this.subs = [];
    await this.audioRecorder.fullyStop();
    this.wsTranslator.disconnect();
    this.state.set('idle');
    this.volumeLevel = 0;
    this._clearCanvas();
  }

  // ─── Animación de Ondas ────────────────────────────────────────────────────

  private _startWaveAnimation(): void {
    setTimeout(() => this._drawWave(), 100);
  }

  private _drawWave(): void {
    if (!this.waveCanvasRef) return;
    const canvas = this.waveCanvasRef.nativeElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const draw = () => {
      const W = canvas.width;
      const H = canvas.height;
      ctx.clearRect(0, 0, W, H);

      const barWidth = 4;
      const gap = (W - this.WAVE_BARS * barWidth) / (this.WAVE_BARS + 1);
      const vol = this.volumeLevel;
      const isActive = this.isListening() || this.isProcessing();

      for (let i = 0; i < this.WAVE_BARS; i++) {
        const x = gap + i * (barWidth + gap);
        const phase = (Date.now() / 150 + i * 0.4);
        const sinVal = Math.abs(Math.sin(phase));
        const minH = 4;
        const maxH = H * 0.85;

        let barH: number;
        if (!isActive) {
          barH = minH;
        } else if (vol < 0.02) {
          barH = minH + sinVal * (H * 0.12);
        } else {
          barH = minH + sinVal * vol * (maxH - minH);
        }

        const y = (H - barH) / 2;

        const grad = ctx.createLinearGradient(0, y, 0, y + barH);
        if (this.isProcessing()) {
          grad.addColorStop(0, '#f59e0b');
          grad.addColorStop(1, '#d97706');
        } else if (isActive) {
          grad.addColorStop(0, '#3b82f6');
          grad.addColorStop(1, '#0f4c9c');
        } else {
          grad.addColorStop(0, '#cbd5e1');
          grad.addColorStop(1, '#94a3b8');
        }

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, barH, 2);
        ctx.fill();
      }

      this.waveAnimId = requestAnimationFrame(draw);
    };

    this.waveAnimId = requestAnimationFrame(draw);
  }

  private _stopWaveAnimation(): void {
    if (this.waveAnimId !== null) {
      cancelAnimationFrame(this.waveAnimId);
      this.waveAnimId = null;
    }
  }

  private _clearCanvas(): void {
    if (!this.waveCanvasRef) return;
    const canvas = this.waveCanvasRef.nativeElement;
    const ctx = canvas.getContext('2d');
    ctx?.clearRect(0, 0, canvas.width, canvas.height);
  }

  private resetResults(): void {
    this.transcripcion.set('');
    this.traduccion.set('');
    this.errorMessage.set('');
    this.detectedLang.set(null);
    this.resultTarget.set(null);
  }

  private setError(message: string): void {
    this.errorMessage.set(message);
    this.state.set('error');
  }

  ngOnDestroy(): void { this.stopAll(); }
}
