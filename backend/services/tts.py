"""
Servicio de síntesis de voz (Text-to-Speech).

Responsabilidad única: recibir un texto y devolver el audio generado
en formato MP3 codificado en Base64, listo para ser enviado por JSON
y reproducido en el navegador con la Web Audio API.
"""

import io
import base64
from gtts import gTTS


# ─── API pública ──────────────────────────────────────────────────────────────

def synthesize(text: str, lang: str) -> str:
    """
    Convierte texto en voz y devuelve el audio como string Base64.

    Args:
        text: Texto a convertir en voz.
        lang: Código ISO 639-1 del idioma (ej. "es", "en").

    Returns:
        Audio MP3 codificado en Base64 (string UTF-8).

    Raises:
        Exception: Si gTTS no puede conectarse al servicio de Google.
    """
    tts = gTTS(text=text, lang=lang, slow=False)

    # Escribimos el MP3 en memoria en lugar de disco para no dejar archivos temporales
    buffer = io.BytesIO()
    tts.write_to_fp(buffer)
    buffer.seek(0)

    audio_base64 = base64.b64encode(buffer.read()).decode("utf-8")
    return audio_base64
