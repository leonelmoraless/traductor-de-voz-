"""
Servicio de traducción de texto.

Responsabilidad única: recibir un texto y devolver su traducción
al idioma destino usando deep-translator (Google Translate, sin API key).
Compatible con Python 3.13+.
"""

from deep_translator import GoogleTranslator


# ─── API pública ──────────────────────────────────────────────────────────────

def translate(text: str, source_lang: str, target_lang: str) -> str:
    """
    Traduce un texto de un idioma a otro.

    Args:
        text:        Texto a traducir.
        source_lang: Código ISO 639-1 del idioma origen (ej. "es").
        target_lang: Código ISO 639-1 del idioma destino (ej. "en").

    Returns:
        Texto traducido.

    Raises:
        Exception: Si deep-translator falla al conectarse con Google.
    """
    translator = GoogleTranslator(source=source_lang, target=target_lang)
    return translator.translate(text)
