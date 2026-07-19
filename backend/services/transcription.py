"""
Servicio de transcripción de audio.

Responsabilidad única: recibir bytes de audio y devolver el texto transcrito
usando el modelo Whisper de OpenAI. El modelo se carga una sola vez en memoria
(patrón singleton) para evitar recargas costosas en cada petición.
"""

import os
import tempfile
import whisper

# ─── Singleton del modelo ─────────────────────────────────────────────────────
_model: whisper.Whisper | None = None


def _get_model() -> whisper.Whisper:
    """Carga el modelo Whisper 'small' la primera vez y lo reutiliza."""
    global _model
    if _model is None:
        print("[Whisper] Cargando modelo 'small'... (solo ocurre una vez)")
        _model = whisper.load_model("small")
        print("[Whisper] Modelo listo.")
    return _model


# ─── API pública ──────────────────────────────────────────────────────────────

def transcribe(audio_bytes: bytes, source_lang: str = "es") -> str:
    """
    Transcribe un fragmento de audio a texto.

    Args:
        audio_bytes: Bytes del archivo de audio (webm, wav, mp3, etc.)
        source_lang: Código ISO 639-1 del idioma hablado (ej. "es", "en")

    Returns:
        Texto transcrito, sin espacios al inicio/fin.

    Raises:
        ValueError: Si Whisper no detecta texto en el audio.
    """
    model = _get_model()

    # Guardamos el audio en un archivo temporal porque Whisper trabaja con rutas
    with tempfile.NamedTemporaryFile(suffix=".webm", delete=False) as tmp_file:
        tmp_file.write(audio_bytes)
        tmp_path = tmp_file.name

    try:
        # Añadidos parámetros para reducir alucinaciones de Whisper
        result = model.transcribe(
            tmp_path,
            language=source_lang,
            condition_on_previous_text=False,
            no_speech_threshold=0.6,
            logprob_threshold=-1.0
        )
        text = result["text"].strip()

        if not text:
            raise ValueError("Whisper no detectó voz en el audio.")

        return text
    finally:
        # Siempre limpiamos el archivo temporal
        os.unlink(tmp_path)
