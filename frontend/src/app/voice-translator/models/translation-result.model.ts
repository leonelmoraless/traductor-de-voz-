export interface WsTranslationResult {
  type: 'translation_result';
  transcripcion: string;
  traduccion: string;
  audio_base64: string;
  /** Idioma detectado automáticamente (ej. "es", "en") */
  source_lang?: string;
  /** Idioma destino de la traducción */
  target_lang?: string;
}

export interface WsNoSpeech {
  type: 'no_speech';
  message: string;
}

export interface WsError {
  type: 'error';
  message: string;
}

export type WsMessage = WsTranslationResult | WsNoSpeech | WsError;

/** Estados posibles del flujo de grabación y traducción. */
export type RecordingState = 'idle' | 'listening' | 'processing' | 'error';

/** Idiomas soportados en el prototipo. */
export interface Language {
  name: string;
  code: string;
  flag: string;
}
