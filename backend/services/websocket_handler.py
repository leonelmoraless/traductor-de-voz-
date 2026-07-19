"""
WebSocket handler para sesión de traducción en tiempo real.

Responsabilidad: gestionar el ciclo de vida de una conexión WebSocket
y orquestar los servicios de transcripción, traducción y TTS.

Corre Whisper en un ThreadPoolExecutor para no bloquear el event loop
de FastAPI mientras procesa el audio (operación costosa/síncrona).

Protocolo de mensajes:
  Cliente → Servidor:
    { "type": "config",           "source_lang": "es", "target_lang": "en" }
    { "type": "audio_chunk",      "data": "<base64 webm>" }
    { "type": "translate_request" }

  Servidor → Cliente:
    { "type": "partial_transcription", "text": "...", "accumulated": "..." }
    { "type": "translation_result",    "transcripcion": "...", "traduccion": "...", "audio_base64": "..." }
    { "type": "error",                 "message": "..." }
"""

import asyncio
import base64
from concurrent.futures import ThreadPoolExecutor

from fastapi import WebSocket, WebSocketDisconnect

from services.transcription import transcribe
from services.translation import translate
from services.tts import synthesize

# Pool de 2 workers: uno transcribiendo, uno puede traducir en paralelo
_executor = ThreadPoolExecutor(max_workers=2)


async def _run_in_thread(fn, *args):
    """Ejecuta una función síncrona en el pool de threads sin bloquear el event loop."""
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(_executor, fn, *args)


async def handle_ws_session(websocket: WebSocket) -> None:
    """
    Gestiona una sesión completa de traducción en tiempo real.
    Cada conexión WS es una sesión independiente con su propio contexto.
    """
    await websocket.accept()

    # Contexto de la sesión
    source_lang = "es"
    target_lang = "en"

    print("[WS] Nueva sesión iniciada")

    try:
        while True:
            message  = await websocket.receive_json()
            msg_type = message.get("type")

            # ── 1. Configurar idiomas ──────────────────────────────────────────
            if msg_type == "config":
                source_lang = message.get("source_lang", "es")
                target_lang = message.get("target_lang", "en")
                print(f"[WS] Config recibida: {source_lang} → {target_lang}")

            # ── 2. Frase Completa (Utterance) ─────────────────────────────────
            elif msg_type == "audio_utterance":
                audio_bytes = base64.b64decode(message["data"])
                print(f"[WS] Audio completo recibido ({len(audio_bytes)} bytes)")
                
                try:
                    # 1. Transcribir toda la frase con Whisper
                    transcripcion = await _run_in_thread(transcribe, audio_bytes, source_lang)
                    if not transcripcion:
                        continue
                    
                    print(f"[WS] Transcripción final: {transcripcion!r}")

                    # 2. Traducir al idioma destino
                    traduccion = await _run_in_thread(translate, transcripcion, source_lang, target_lang)
                    print(f"[WS] Traducción final: {traduccion!r}")

                    # 3. Sintetizar la voz traducida
                    audio_b64 = await _run_in_thread(synthesize, traduccion, target_lang)

                    # 4. Enviar el resultado definitivo al cliente
                    await websocket.send_json({
                        "type":          "translation_result",
                        "transcripcion": transcripcion,
                        "traduccion":    traduccion,
                        "audio_base64":  audio_b64,
                    })

                except ValueError as ve:
                    # Whisper no detectó voz
                    pass
                except Exception as exc:
                    print(f"[WS] Error procesando frase: {exc}")
                    await websocket.send_json({"type": "error", "message": str(exc)})

    except WebSocketDisconnect:
        print("[WS] Sesión cerrada por el cliente")
    except Exception as exc:
        print(f"[WS] Error inesperado: {exc}")
