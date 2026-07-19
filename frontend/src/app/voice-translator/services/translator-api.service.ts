import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { TranslationResult } from '../models/translation-result.model';

/**
 * Servicio responsable de comunicarse con el backend Python.
 * Envía el blob de audio junto con los idiomas origen y destino,
 * y devuelve el resultado de transcripción + traducción + audio TTS.
 */
@Injectable({ providedIn: 'root' })
export class TranslatorApiService {
  private readonly API_URL = 'http://localhost:8000/procesar-audio/';

  constructor(private http: HttpClient) {}

  /**
   * Envía el audio grabado al backend para procesarlo.
   * @param blob      Blob de audio capturado por MediaRecorder
   * @param sourceLang Código ISO 639-1 del idioma origen (ej. "es")
   * @param targetLang Código ISO 639-1 del idioma destino (ej. "en")
   */
  sendAudio(
    blob: Blob,
    sourceLang: string,
    targetLang: string
  ): Observable<TranslationResult> {
    const formData = new FormData();
    formData.append('file', blob, 'recording.webm');
    formData.append('source_lang', sourceLang);
    formData.append('target_lang', targetLang);
    return this.http.post<TranslationResult>(this.API_URL, formData);
  }
}
