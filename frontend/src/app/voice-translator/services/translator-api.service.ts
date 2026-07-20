import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { WsTranslationResult } from '../models/translation-result.model';

/**
 * Servicio legacy de comunicación REST con el backend Python.
 * El flujo principal ahora usa WebSockets, pero este servicio se mantiene
 * por compatibilidad.
 */
@Injectable({ providedIn: 'root' })
export class TranslatorApiService {
  private readonly API_URL = 'http://localhost:8000/procesar-audio/';

  constructor(private http: HttpClient) {}

  sendAudio(
    blob: Blob,
    sourceLang: string,
    targetLang: string
  ): Observable<WsTranslationResult> {
    const formData = new FormData();
    formData.append('file', blob, 'recording.webm');
    formData.append('source_lang', sourceLang);
    formData.append('target_lang', targetLang);
    return this.http.post<WsTranslationResult>(this.API_URL, formData);
  }
}
