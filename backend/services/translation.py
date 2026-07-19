"""
Servicio de traducción de texto.

Responsabilidad única: recibir un texto y devolver su traducción
al idioma destino usando la librería googletrans (Google Translate, sin API key).
"""

from googletrans import Translator

# ─── Singleton del cliente ────────────────────────────────────────────────────
_translator: Translator = Translator()


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
        Exception: Si googletrans falla al conectarse con Google.
    """
    result = _translator.translate(text, src=source_lang, dest=target_lang)
    return result.text
