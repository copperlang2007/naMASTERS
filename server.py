import asyncio
import json
import os
import websockets
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
import uvicorn
from dotenv import load_dotenv
from dorothy import DOROTHY_PERSONA, ANCHOR_WHISPER

load_dotenv()
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

app = FastAPI()

# Serve index.html at root
@app.get("/")
async def root():
    with open("index.html") as f:
        return HTMLResponse(f.read())


@app.websocket("/ws/call")
async def call_handler(agent_ws: WebSocket):
    await agent_ws.accept()

    turn_count = 0
    last_agent_spoke = asyncio.get_event_loop().time()
    persona = DOROTHY_PERSONA

    OPENAI_WS_URL = "wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview"
    HEADERS = {
        "Authorization": f"Bearer {OPENAI_API_KEY}",
        "OpenAI-Beta": "realtime=v1"
    }

    try:
        async with websockets.connect(OPENAI_WS_URL, additional_headers=HEADERS) as openai_ws:

            # ── SETUP SESSION ──────────────────────────────────────────
            await openai_ws.send(json.dumps({
                "type": "session.update",
                "session": {
                    "modalities": ["text", "audio"],
                    "instructions": persona["system_prompt"],
                    "voice": persona["voice"],
                    "input_audio_format": "pcm16",
                    "output_audio_format": "pcm16",
                    "input_audio_transcription": {"model": "whisper-1"},
                    "turn_detection": {
                        "type": "server_vad",
                        "threshold": 0.5,
                        "prefix_padding_ms": 300,
                        "silence_duration_ms": 800
                    }
                }
            }))

            # ── TRIGGER DOROTHY'S OPENING LINE ─────────────────────────
            await openai_ws.send(json.dumps({
                "type": "conversation.item.create",
                "item": {
                    "type": "message",
                    "role": "user",
                    "content": [{
                        "type": "input_text",
                        "text": "The call just connected. Say your opening line now. Speak slowly."
                    }]
                }
            }))
            await openai_ws.send(json.dumps({"type": "response.create"}))

            # ── TASK 1: OpenAI → Agent browser ─────────────────────────
            async def receive_from_openai():
                nonlocal turn_count
                async for raw in openai_ws:
                    msg = json.loads(raw)
                    msg_type = msg.get("type", "")

                    # Stream Dorothy's audio to browser
                    if msg_type == "response.audio.delta":
                        audio_b64 = msg.get("delta", "")
                        if audio_b64:
                            await agent_ws.send_bytes(
                                __import__("base64").b64decode(audio_b64)
                            )

                    # Send Dorothy's transcript to browser
                    elif msg_type == "response.audio_transcript.done":
                        transcript = msg.get("transcript", "")
                        if transcript:
                            await agent_ws.send_text(json.dumps({
                                "type": "transcript",
                                "speaker": "Dorothy",
                                "text": transcript
                            }))

                    # Send agent's transcript to browser
                    elif msg_type == "conversation.item.input_audio_transcription.completed":
                        transcript = msg.get("transcript", "")
                        if transcript:
                            await agent_ws.send_text(json.dumps({
                                "type": "transcript",
                                "speaker": "Agent",
                                "text": transcript
                            }))

                    # Track turns for anchor injection
                    elif msg_type == "response.done":
                        turn_count += 1
                        await agent_ws.send_text(json.dumps({
                            "type": "turn_count",
                            "count": turn_count
                        }))

                        # ── ANCHOR INJECTION every 8 turns ────────────
                        if turn_count > 0 and turn_count % 8 == 0:
                            await openai_ws.send(json.dumps({
                                "type": "session.update",
                                "session": {
                                    "instructions": persona["system_prompt"] + ANCHOR_WHISPER
                                }
                            }))
                            await agent_ws.send_text(json.dumps({
                                "type": "anchor_injected",
                                "turn": turn_count
                            }))

            # ── TASK 2: Agent browser → OpenAI ─────────────────────────
            async def receive_from_agent():
                nonlocal last_agent_spoke
                try:
                    while True:
                        message = await agent_ws.receive()

                        if "bytes" in message:
                            # Raw audio from agent microphone → OpenAI
                            audio_bytes = message["bytes"]
                            if audio_bytes:
                                last_agent_spoke = asyncio.get_event_loop().time()
                                import base64
                                await openai_ws.send(json.dumps({
                                    "type": "input_audio_buffer.append",
                                    "audio": base64.b64encode(audio_bytes).decode()
                                }))

                        elif "text" in message:
                            data = json.loads(message["text"])
                            if data.get("type") == "end_call":
                                await openai_ws.close()
                                break

                except WebSocketDisconnect:
                    await openai_ws.close()

            # ── TASK 3: Silence watchdog ────────────────────────────────
            async def silence_watchdog():
                SILENCE_THRESHOLD = 12
                REENGAGEMENT = [
                    "The agent has been quiet for a moment. Fill the silence naturally as Dorothy — say something like 'Hello? Are you still there?' or 'I just want to make sure I understand...' Speak slowly.",
                    "There is a pause. Dorothy gently re-engages — maybe she asks to have something repeated, or circles back to her grocery card question. Speak slowly.",
                    "The agent has not spoken in a while. Dorothy gets a little anxious and says something natural like 'I hope I'm not keeping you...' or 'Take your time, dear, I'm not going anywhere.' Speak slowly."
                ]
                import random
                while True:
                    await asyncio.sleep(3)
                    silence = asyncio.get_event_loop().time() - last_agent_spoke
                    if silence > SILENCE_THRESHOLD:
                        prompt = random.choice(REENGAGEMENT)
                        await openai_ws.send(json.dumps({
                            "type": "conversation.item.create",
                            "item": {
                                "type": "message",
                                "role": "user",
                                "content": [{"type": "input_text", "text": prompt}]
                            }
                        }))
                        await openai_ws.send(json.dumps({"type": "response.create"}))
                        # Reset so she doesn't spam
                        nonlocal last_agent_spoke
                        last_agent_spoke = asyncio.get_event_loop().time()

            # ── RUN ALL THREE CONCURRENTLY — THIS IS THE KEY FIX ───────
            await asyncio.gather(
                receive_from_openai(),
                receive_from_agent(),
                silence_watchdog()
            )

    except Exception as e:
        print(f"Session error: {e}")
        try:
            await agent_ws.send_text(json.dumps({
                "type": "error",
                "message": str(e)
            }))
        except:
            pass


if __name__ == "__main__":
    print("Medicare Training Simulator — Dorothy Miller")
    print("Ready on port 8000")
    uvicorn.run(app, host="0.0.0.0", port=int(os.getenv("PORT", 8000)))