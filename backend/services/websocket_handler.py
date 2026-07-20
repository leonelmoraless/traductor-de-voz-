"""
WebSocket handler para sesión de traducción bidireccional.

Diseño de robustez:
  - Un Lock por sesión garantiza que solo se procesa 1 audio a la vez.
    Si llegan más audios mientras Whisper trabaja, se descartan para
    evitar colas que saturen el backend.
  - Un flag `_closed` detecta desconexión y aborta envíos tardíos.
  - Todos los send_json están blindados contra WebSocket cerrado,
    sin importar el tipo de excepción.
"""

import asyncio
import base64
import re
from concurrent.futures import ThreadPoolExecutor

from fastapi import WebSocket, WebSocketDisconnect

from services.transcription import transcribe
from services.translation import translate
from services.tts import synthesize

_executor = ThreadPoolExecutor(max_workers=2)


async def _run_in_thread(fn, *args):
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(_executor, fn, *args)


async def _safe_send(websocket: WebSocket, payload: dict, closed_flag: list) -> None:
    """Envía un mensaje JSON solo si la conexión sigue abierta."""
    if closed_flag[0]:
        return
    try:
        await websocket.send_json(payload)
    except Exception:
        # Conexión ya cerrada por el cliente — ignorar silenciosamente
        closed_flag[0] = True


async def handle_ws_session(websocket: WebSocket) -> None:
    await websocket.accept()
    print("[WS] Nueva sesión iniciada")

    lang1 = "es"
    lang2 = "en"

    # Flag mutable para saber si el WebSocket fue cerrado
    closed = [False]

    # Lock: solo se procesa un audio a la vez; los extras se descartan
    processing_lock = asyncio.Lock()

    try:
        while True:
            message = await websocket.receive_json()
            msg_type = message.get("type")

            # ── Configuración de Sesión ───────────────────────────────────────
            if msg_type == "config":
                lang1 = message.get("lang1", "es")
                lang2 = message.get("lang2", "en")
                print(f"[WS] Configuración recibida: {lang1} ↔ {lang2}")

            # ── Frase de Audio ────────────────────────────────────────────────
            elif msg_type == "audio_utterance":
                audio_bytes = base64.b64decode(message["data"])
                print(f"[WS] Audio recibido ({len(audio_bytes)} bytes)")

                # Si ya estamos procesando otro audio, descartar este
                if processing_lock.locked():
                    print("[WS] Descartando audio: ya hay uno en proceso.")
                    continue

                # Lanzar el procesamiento en background sin bloquear el loop
                asyncio.create_task(
                    _process_audio(
                        websocket, audio_bytes,
                        lang1, lang2,
                        processing_lock, closed
                    )
                )

    except WebSocketDisconnect:
        closed[0] = True
        print("[WS] Sesión cerrada por el cliente")
    except Exception as exc:
        closed[0] = True
        print(f"[WS] Error inesperado en sesión: {exc}")


async def _process_audio(
    websocket: WebSocket,
    audio_bytes: bytes,
    lang1: str,
    lang2: str,
    lock: asyncio.Lock,
    closed: list,
) -> None:
    """Procesa un único fragmento de audio: transcribe → traduce → TTS → envía."""

    async with lock:
        if closed[0]:
            return

        try:
            # 1. Transcribir con pista de idiomas (más rápido que auto-detect global)
            text, detected_lang = await _run_in_thread(
                transcribe, audio_bytes, [lang1, lang2]
            )
            print(f"[WS] Whisper detectó: {detected_lang!r} | Texto: {text!r}")

            # 2. Validar contenido legible
            if not re.search(r'[a-zA-ZáéíóúÁÉÍÓÚñÑüÜäöüßÄÖÜ]', text):
                print("[WS] Texto sin contenido legible — descartando.")
                await _safe_send(websocket, {
                    "type": "no_speech",
                    "message": "No se entendió el audio. ¿Puedes repetirlo?"
                }, closed)
                return

            # 3. Verificar idioma permitido
            if detected_lang not in (lang1, lang2):
                print(f"[WS] Idioma '{detected_lang}' fuera de los seleccionados ({lang1}, {lang2}) — descartando.")
                await _safe_send(websocket, {
                    "type": "no_speech",
                    "message": f"Detecté un idioma diferente al seleccionado. Por favor habla en {lang1} o {lang2}."
                }, closed)
                return

            # 4. Determinar idioma destino (bidireccional estricto)
            target_lang = lang2 if detected_lang == lang1 else lang1
            print(f"[WS] Traduciendo {detected_lang!r} → {target_lang!r}")

            # 5. Traducir
            traduccion = await _run_in_thread(translate, text, detected_lang, target_lang)
            print(f"[WS] Traducción: {traduccion!r}")

            # 6. TTS
            audio_b64 = await _run_in_thread(synthesize, traduccion, target_lang)

            # 7. Enviar resultado
            await _safe_send(websocket, {
                "type":          "translation_result",
                "transcripcion": text,
                "traduccion":    traduccion,
                "source_lang":   detected_lang,
                "target_lang":   target_lang,
                "audio_base64":  audio_b64,
            }, closed)

        except ValueError as ve:
            msg = str(ve)
            print(f"[WS] ValueError en proceso: {msg}")
            user_msg = "No se detectó voz válida. ¿Puedes repetirlo?"
            await _safe_send(websocket, {"type": "no_speech", "message": user_msg}, closed)

        except Exception as exc:
            print(f"[WS] Error procesando frase: {exc}")
            await _safe_send(websocket, {
                "type": "error",
                "message": "Error interno al procesar el audio."
            }, closed)
