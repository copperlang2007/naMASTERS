import asyncio
import json
import os
from pathlib import Path
import websockets
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.responses import HTMLResponse
import uvicorn
from dotenv import load_dotenv
from server.personas.dorothy import (
    DOROTHY_SESSION_CONFIG,
    DOROTHY_ANCHOR_CONFIG,
    ANCHOR_WHISPER,
    OPENING_PROMPT
)

load_dotenv()
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

app = FastAPI()


@app.get("/")
async def root():
    index_file = Path(__file__).resolve().parent.parent / "client" / "index.html"
    with open(index_file) as f:
        return HTMLResponse(f.read())


@app.websocket("/ws/call")
async def call_handler(agent_ws: WebSocket):
    await agent_ws.accept()

    turn_count = 0
    last_agent_spoke = asyncio.get_event_loop().time()

    OPENAI_WS_URL = "wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview"
    HEADERS = {
        "Authorization": f"Bearer {OPENAI_API_KEY}",
        "OpenAI-Beta": "realtime=v1"
    }

    try:
        async with websockets.connect(OPENAI_WS_URL, additional_headers=HEADERS) as openai_ws:

            # SETUP SESSION
            await openai_ws.send(json.dumps({
                "type": "session.update",
                "session": DOROTHY_SESSION_CONFIG
            }))

            # TRIGGER OPENING LINE
            await openai_ws.send(json.dumps({
                "type": "conversation.item.create",
                "item": {
                    "type": "message",
                    "role": "user",
                    "content": [{"type": "input_text", "text": OPENING_PROMPT}]
                }
            }))
            await openai_ws.send(json.dumps({"type": "response.create"}))

            # TASK 1: OpenAI to Agent browser
            async def receive_from_openai():
                nonlocal turn_count
                import base64
                async for raw in openai_ws:
                    msg = json.loads(raw)
                    msg_type = msg.get("type", "")

                    if msg_type == "response.audio.delta":
                        audio_b64 = msg.get("delta", "")
                        if audio_b64:
                            await agent_ws.send_bytes(base64.b64decode(audio_b64))

                    elif msg_type == "response.audio_transcript.done":
                        transcript = msg.get("transcript", "")
                        if transcript:
                            await agent_ws.send_text(json.dumps({
                                "type": "transcript",
                                "speaker": "Dorothy",
                                "text": transcript
                            }))

                    elif msg_type == "conversation.item.input_audio_transcription.completed":
                        transcript = msg.get("transcript", "")
                        if transcript:
                            await agent_ws.send_text(json.dumps({
                                "type": "transcript",
                                "speaker": "Agent",
                                "text": transcript
                            }))

                    elif msg_type == "response.done":
                        turn_count += 1
                        await agent_ws.send_text(json.dumps({
                            "type": "turn_count",
                            "count": turn_count
                        }))

                        if turn_count > 0 and turn_count % 8 == 0:
                            await openai_ws.send(json.dumps({
                                "type": "session.update",
                                "session": DOROTHY_ANCHOR_CONFIG
                            }))
                            await agent_ws.send_text(json.dumps({
                                "type": "anchor_injected",
                                "turn": turn_count
                            }))

            # TASK 2: Agent browser to OpenAI
            async def receive_from_agent():
                nonlocal last_agent_spoke
                import base64
                try:
                    while True:
                        message = await agent_ws.receive()

                        if "bytes" in message:
                            audio_bytes = message["bytes"]
                            if audio_bytes:
                                last_agent_spoke = asyncio.get_event_loop().time()
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

            # TASK 3: Silence watchdog
            async def silence_watchdog():
                nonlocal last_agent_spoke
                import random
                SILENCE_THRESHOLD = 12
                REENGAGEMENT = [
                    "The agent has been quiet for a moment. Fill the silence naturally as Dorothy. Say something like 'Hello? Are you still there?' or 'I just want to make sure I understand...' Speak slowly.",
                    "There is a pause. Dorothy gently re-engages. Maybe she asks to have something repeated, or circles back to her grocery card question. Speak slowly.",
                    "The agent has not spoken in a while. Dorothy gets a little anxious. Say something like 'I hope I am not keeping you...' or 'Take your time, dear, I am not going anywhere.' Speak slowly."
                ]
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
                        last_agent_spoke = asyncio.get_event_loop().time()

            # RUN ALL THREE CONCURRENTLY
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
        except Exception:
            pass


if __name__ == "__main__":
    print("Medicare Training Simulator ready on port 8000")
    uvicorn.run(app, host="0.0.0.0", port=int(os.getenv("PORT", 8000)))
