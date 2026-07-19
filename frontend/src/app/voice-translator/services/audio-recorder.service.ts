import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

/**
 * Servicio de grabación activado por voz (VAD).
 *
 * Flujo de Frase Completa (Utterance-based):
 *  1. startRecording() abre el micrófono y comienza a grabar.
 *  2. El usuario habla (el volumen supera el SILENCE_THRESHOLD).
 *  3. El usuario hace una pausa de 2 segundos.
 *  4. El detector de silencios detiene el grabador y emite onUtteranceReady$ con el audio completo.
 *  5. El grabador se reinicia automáticamente para escuchar la siguiente frase en limpio.
 */
@Injectable({ providedIn: 'root' })
export class AudioRecorderService {

  private readonly _silenceDetected = new Subject<void>();
  readonly onSilenceDetected$ = this._silenceDetected.asObservable();

  private readonly _utteranceReady = new Subject<Blob>();
  readonly onUtteranceReady$ = this._utteranceReady.asObservable();

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
  private isStopping = false; // Bandera para saber si se detiene por el usuario o por pausa

  // ─── Config ────────────────────────────────────────────────────────────────
  // Subimos el umbral a 0.03 para que el ruido de fondo (teclado, estática) no dispare el sistema, solo voz real.
  private readonly SILENCE_THRESHOLD   = 0.03; 
  private readonly SILENCE_DURATION_MS = 2000;  // 2 segundos de silencio verdadero → fin de frase

  // ─── API pública ───────────────────────────────────────────────────────────

  /**
   * Abre el micrófono y arranca el detector de silencio.
   */
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

  /**
   * Detiene completamente la sesión y cierra el micrófono.
   */
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
  }

  // ─── Internos ──────────────────────────────────────────────────────────────

  private _createAndStartMediaRecorder(): void {
    if (!this._stream) return;
    this.mediaRecorder = new MediaRecorder(this._stream, { mimeType: 'audio/webm' });
    
    this.mediaRecorder.ondataavailable = (e: BlobEvent) => {
      if (e.data.size > 0) {
        this.audioChunks.push(e.data);
      }
    };

    this.mediaRecorder.onstop = () => {
      if (this.audioChunks.length > 0 && this.hasSpeech) {
        // Generamos el blob final de toda la frase
        const blob = new Blob(this.audioChunks, { type: 'audio/webm' });
        this._utteranceReady.next(blob);
      }
      
      this.audioChunks = [];
      this.hasSpeech = false;

      // Si fue una pausa natural, reiniciar para la siguiente frase
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

      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) sum += dataArray[i] * dataArray[i];
      const rms = Math.sqrt(sum / dataArray.length);

      if (rms >= this.SILENCE_THRESHOLD) {
        // Voz detectada
        this.hasSpeech = true;
        if (this.silenceTimer) { clearTimeout(this.silenceTimer); this.silenceTimer = null; }
      } else if (this.hasSpeech && !this.silenceTimer) {
        // Silencio detectado tras voz → cuenta regresiva para marcar el fin de la frase
        this.silenceTimer = setTimeout(() => {
          this.silenceTimer = null;
          this._silenceDetected.next();
          
          // Detener el grabador dispara 'onstop', el cual emitirá el Blob y se reiniciará automáticamente.
          if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
            this.mediaRecorder.stop();
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
