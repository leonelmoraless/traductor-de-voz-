export interface WsPartialTranscription {
  type: 'partial_transcription';
  text: string;       // Solo el chunk actual
  accumulated: string; // Todo lo acumulado en esta sesión
}

export interface WsTranslationResult {
  type: 'translation_result';
  transcripcion: string;
  traduccion: string;
  audio_base64: string;
}

export interface WsError {
  type: 'error';
  message: string;
}

export type WsMessage = WsPartialTranscription | WsTranslationResult | WsError;

/**
 * Respuesta del backend al procesar un audio (endpoint REST legacy).
 * Se mantiene por compatibilidad pero el flujo principal ahora usa WS.
 */
export interface TranslationResult {
  transcripcion: string;
  traduccion: string;
  audio_base64: string;
}

/** Estados posibles del flujo de grabación y traducción. */
export type RecordingState = 'idle' | 'listening' | 'processing' | 'error';

/** Idiomas soportados en el prototipo. */
export interface Language {
  name: string;
  /** Código ISO 639-1 enviado al backend (ej. "es", "en") */
  code: string;
  flag: string;
}
