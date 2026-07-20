import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

/**
 * Servicio de grabación activado por voz (VAD - Voice Activity Detection).
 *
 * Flujo de Frase Completa (Utterance-based):
 *  1. startRecording() abre el micrófono y comienza a analizar el volumen.
 *  2. El usuario habla (volumen > SILENCE_THRESHOLD) → hasSpeech = true.
 *  3. El usuario hace silencio real por SILENCE_DURATION_MS → se detiene el grabador.
 *  4. onstop emite el Blob completo por onUtteranceReady$.
 *  5. El grabador se reinicia automáticamente para la siguiente frase.
 *
 *  El volumen normalizado (0..1) se emite continuamente por onVolumeLevel$
 *  para que la UI pueda mostrar la animación de ondas.
 */
@Injectable({ providedIn: 'root' })
export class AudioRecorderService {

  private readonly _utteranceReady = new Subject<Blob>();
  readonly onUtteranceReady$ = this._utteranceReady.asObservable();

  /** Emite el nivel de volumen normalizado (0–1) en cada frame de audio */
  private readonly _volumeLevel = new Subject<number>();
  readonly onVolumeLevel$ = this._volumeLevel.asObservable();

  // ─── Estado interno ────────────────────────────────────────────────────────
  private _stream: MediaStream | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];

  // Web Audio — análisis de volumen
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private animationFrameId: number | null = null;
  private silenceTimer: ReturnType<typeof setTimeout> | null = null;
  private hasSpeech = false;
  private speechStartTime = 0;
  private isStopping = false;

  // ─── Configuración ─────────────────────────────────────────────────────────
  /** Umbral RMS (0.05 = ignora ruido de fondo sin sacrificar rapidez) */
  private readonly SILENCE_THRESHOLD   = 0.05;
  /** Tiempo de silencio tras voz que dispara el fin de frase (1200ms = rápido pero seguro) */
  private readonly SILENCE_DURATION_MS = 1200;

  // ─── API pública ───────────────────────────────────────────────────────────

  async startRecording(): Promise<void> {
    this._stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      }
    });

    this.audioChunks = [];
    this.hasSpeech   = false;
    this.isStopping  = false;

    this._createAndStartMediaRecorder();
    this._startSilenceDetection(this._stream);
  }

  async fullyStop(): Promise<void> {
    this.isStopping = true;
    this._stopSilenceDetection();
    await new Promise<void>(resolve => {
      if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') {
        resolve();
      } else {
        this.mediaRecorder.onstop = () => resolve();
        this.mediaRecorder.stop();
      }
    });
    this._releaseStream();
    this._volumeLevel.next(0);
  }

  // ─── Internos ──────────────────────────────────────────────────────────────

  private _createAndStartMediaRecorder(): void {
    if (!this._stream) return;

    this.mediaRecorder = new MediaRecorder(this._stream, { mimeType: 'audio/webm' });

    this.mediaRecorder.ondataavailable = (e: BlobEvent) => {
      if (e.data.size > 0) this.audioChunks.push(e.data);
    };

    this.mediaRecorder.onstop = () => {
      if (this.audioChunks.length > 0 && this.hasSpeech) {
        const blob = new Blob(this.audioChunks, { type: 'audio/webm' });
        this._utteranceReady.next(blob);
      }

      this.audioChunks = [];
      this.hasSpeech   = false;

      // Reinicio automático para la siguiente frase
      if (!this.isStopping) {
        this._createAndStartMediaRecorder();
      }
    };

    this.mediaRecorder.start();
  }

  private _startSilenceDetection(stream: MediaStream): void {
    this.audioContext = new AudioContext();
    const source = this.audioContext.createMediaStreamSource(stream);
    this.analyser  = this.audioContext.createAnalyser();
    this.analyser.fftSize = 2048;
    source.connect(this.analyser);

    const dataArray = new Float32Array(this.analyser.fftSize);

    const checkVolume = () => {
      if (!this.analyser) return;

      this.analyser.getFloatTimeDomainData(dataArray);

      // Calcular RMS (energía de la señal de audio)
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) sum += dataArray[i] * dataArray[i];
      const rms = Math.sqrt(sum / dataArray.length);

      // Emitir nivel de volumen para la animación de ondas (normalizado 0..1)
      const normalized = Math.min(rms / 0.15, 1);
      this._volumeLevel.next(normalized);

      if (rms >= this.SILENCE_THRESHOLD) {
        // Voz detectada
        if (!this.hasSpeech) {
          this.hasSpeech = true;
          this.speechStartTime = Date.now();
        }
        if (this.silenceTimer) {
          clearTimeout(this.silenceTimer);
          this.silenceTimer = null;
        }
      } else if (this.hasSpeech && !this.silenceTimer) {
        // Silencio tras voz → cuenta regresiva
        this.silenceTimer = setTimeout(() => {
          this.silenceTimer = null;
          
          // Validar que realmente habló un tiempo mínimo (600ms netos de voz)
          const speechDuration = Date.now() - this.speechStartTime - this.SILENCE_DURATION_MS;
          
          if (speechDuration < 600) {
            // Falsa alarma, ruido muy corto. Descartar sin enviar al backend.
            this.hasSpeech = false;
            if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
              this.hasSpeech = false;
              this.mediaRecorder.stop();
            }
          } else {
            if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
              this.mediaRecorder.stop();
            }
          }
        }, this.SILENCE_DURATION_MS);
      }

      this.animationFrameId = requestAnimationFrame(checkVolume);
    };

    this.animationFrameId = requestAnimationFrame(checkVolume);
  }

  private _stopSilenceDetection(): void {
    if (this.animationFrameId !== null) { cancelAnimationFrame(this.animationFrameId); this.animationFrameId = null; }
    if (this.silenceTimer)              { clearTimeout(this.silenceTimer); this.silenceTimer = null; }
    if (this.audioContext)              { this.audioContext.close().catch(() => {}); this.audioContext = null; }
    this.analyser = null;
  }

  private _releaseStream(): void {
    this._stream?.getTracks().forEach(t => t.stop());
    this._stream     = null;
    this.mediaRecorder = null;
  }
}
