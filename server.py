import asyncio
import base64
import json
import os
import random
from datetime import datetime, timezone

import websockets
from fastapi import FastAPI, Request, WebSocket, WebSocketDisconnect
from fastapi.responses import HTMLResponse, JSONResponse
import uvicorn
from dotenv import load_dotenv

from dorothy import ANCHOR_WHISPER, DOROTHY_PERSONA
from scorer import score_call
from database import init_db, save_session

load_dotenv()
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

app = FastAPI()
init_db()

# Opening-line trigger sent to OpenAI — does NOT reveal Dorothy's name.
_OPENING_TRIGGER = (
    "The call just connected. Say your opening line now.\n"
    "Your opening line is: 'Hello? Hi — yes. Um... I'm trying to reach "
    "someone about my Medicare. I have a question about something I saw "
    "online. A benefit? For groceries? I'm hoping someone can help me.'\n"
    "Do NOT say your name. Wait for the agent to ask. Speak slowly."
)


@app.get("/")
async def root():
    with open("index.html") as f:
        return HTMLResponse(f.read())


@app.get("/sunfire-mock.html")
async def sunfire_mock():
    with open("sunfire-mock.html") as f:
        return HTMLResponse(f.read())


@app.post("/api/score")
async def api_score(request: Request):
    body = await request.json()
    transcript = body.get("transcript", [])
    agent_name = body.get("agent_name", "Unknown")
    started_at = body.get("started_at", "")
    ended_at = body.get("ended_at", "")
    duration_seconds = int(body.get("duration_seconds", 0))

    try:
        score = await score_call(transcript)
    except Exception as exc:
        print(f"Scoring error: {exc}")
        return JSONResponse({"error": str(exc)}, status_code=500)

    db_saved = True
    try:
        save_session(
            agent_name=agent_name,
            started_at=started_at,
            ended_at=ended_at,
            duration_seconds=duration_seconds,
            transcript=transcript,
            score=score,
        )
    except Exception as exc:
        print(f"DB save error: {exc}")
        db_saved = False

    # Dorothy's ground truth — only revealed post-call
    dorothy_profile = {
        "name": "Dorothy Miller",
        "dob": "September 4, 1952 (Age 72)",
        "address": "847 Willow Creek Drive, Anna, TX 75409",
        "phone": "(469) 555-0317",
        "medicare_id": "2HJ7-RF4-NP61",
        "current_plan": "UHC Medicare Advantage — Plan ID UHC-MA-TX-0047",
        "doctors": "PCP: Dr. Robert Chen, North Texas Family Clinic, Anna TX\nCardiologist: Dr. Linda Okafor, Plano TX (seen once last year — all clear)",
        "medications": "Lisinopril 10mg once daily (blood pressure)\nMetformin 500mg twice daily (diabetes) — ONLY these two",
        "pharmacy": "CVS in Anna, TX (possibly Walgreens — she was vague)",
        "reason_for_call": "Saw a ~$900 grocery benefit card online (Facebook or a website); wants to know if it is real and if her plan has it",
        "priority_2_copays": "Metformin copay has felt more expensive lately — wants to lower it",
        "priority_3_dental": "Has not been to the dentist in 2 years due to cost; wants to know if her plan covers dental",
        "lis_status": "No — not enrolled in LIS / Extra Help"
    }

    return JSONResponse({
        "score": score,
        "dorothy_profile": dorothy_profile,
        "db_saved": db_saved
    })


@app.websocket("/ws/call")
async def call_handler(agent_ws: WebSocket):
    await agent_ws.accept()

    turn_count = 0
    last_agent_spoke = asyncio.get_event_loop().time()
    started_at = datetime.now(timezone.utc).isoformat()
    persona = DOROTHY_PERSONA
    transcript_log: list = []

    OPENAI_WS_URL = "wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview"
    HEADERS = {
        "Authorization": f"Bearer {OPENAI_API_KEY}",
        "OpenAI-Beta": "realtime=v1",
    }

    try:
        async with websockets.connect(OPENAI_WS_URL, additional_headers=HEADERS) as openai_ws:

            # ── SETUP SESSION ───────────────────────────────────────────────
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
                        "silence_duration_ms": 800,
                    },
                },
            }))

            # ── TRIGGER OPENING LINE (no name revealed) ─────────────────────
            await openai_ws.send(json.dumps({
                "type": "conversation.item.create",
                "item": {
                    "type": "message",
                    "role": "user",
                    "content": [{"type": "input_text", "text": _OPENING_TRIGGER}],
                },
            }))
            await openai_ws.send(json.dumps({"type": "response.create"}))

            # ── TASK 1: OpenAI → Agent browser ──────────────────────────────
            async def receive_from_openai():
                nonlocal turn_count
                try:
                    async for raw in openai_ws:
                        msg = json.loads(raw)
                        msg_type = msg.get("type", "")

                        if msg_type == "response.audio.delta":
                            audio_b64 = msg.get("delta", "")
                            if audio_b64:
                                await agent_ws.send_bytes(base64.b64decode(audio_b64))

                        elif msg_type == "response.audio_transcript.done":
                            text = msg.get("transcript", "")
                            if text:
                                ts = datetime.now(timezone.utc).isoformat()
                                transcript_log.append({"speaker": "Dorothy", "text": text, "timestamp": ts})
                                await agent_ws.send_text(json.dumps({
                                    "type": "transcript",
                                    "speaker": "Dorothy",
                                    "text": text,
                                    "timestamp": ts,
                                }))

                        elif msg_type == "conversation.item.input_audio_transcription.completed":
                            text = msg.get("transcript", "")
                            if text:
                                ts = datetime.now(timezone.utc).isoformat()
                                transcript_log.append({"speaker": "Agent", "text": text, "timestamp": ts})
                                await agent_ws.send_text(json.dumps({
                                    "type": "transcript",
                                    "speaker": "Agent",
                                    "text": text,
                                    "timestamp": ts,
                                }))

                        elif msg_type == "response.done":
                            turn_count += 1
                            await agent_ws.send_text(json.dumps({
                                "type": "turn_count",
                                "count": turn_count,
                            }))
                            if turn_count > 0 and turn_count % 8 == 0:
                                await openai_ws.send(json.dumps({
                                    "type": "session.update",
                                    "session": {
                                        "instructions": persona["system_prompt"] + ANCHOR_WHISPER,
                                    },
                                }))
                                await agent_ws.send_text(json.dumps({
                                    "type": "anchor_injected",
                                    "turn": turn_count,
                                }))

                except websockets.exceptions.ConnectionClosed:
                    pass

            # ── TASK 2: Agent browser → OpenAI ──────────────────────────────
            async def receive_from_agent():
                nonlocal last_agent_spoke
                try:
                    while True:
                        message = await agent_ws.receive()

                        if "bytes" in message:
                            audio_bytes = message["bytes"]
                            if audio_bytes:
                                last_agent_spoke = asyncio.get_event_loop().time()
                                await openai_ws.send(json.dumps({
                                    "type": "input_audio_buffer.append",
                                    "audio": base64.b64encode(audio_bytes).decode(),
                                }))

                        elif "text" in message:
                            data = json.loads(message["text"])
                            if data.get("type") == "end_call":
                                ended_at = datetime.now(timezone.utc).isoformat()
                                try:
                                    await openai_ws.close()
                                except Exception:
                                    pass
                                await agent_ws.send_text(json.dumps({
                                    "type": "call_ended",
                                    "transcript": transcript_log,
                                    "started_at": started_at,
                                    "ended_at": ended_at,
                                }))
                                break

                except WebSocketDisconnect:
                    try:
                        await openai_ws.close()
                    except Exception:
                        pass

            # ── TASK 3: Silence watchdog (12 s) ─────────────────────────────
            async def silence_watchdog():
                nonlocal last_agent_spoke
                SILENCE_THRESHOLD = 12
                REENGAGEMENT = [
                    "The agent has been quiet for a moment. Fill the silence naturally as Dorothy — say something like 'Hello? Are you still there?' or 'I just want to make sure I understand...' Speak slowly.",
                    "There is a pause. Dorothy gently re-engages — maybe she asks to have something repeated, or circles back to her grocery card question. Speak slowly.",
                    "The agent has not spoken in a while. Dorothy gets a little anxious and says something natural like 'I hope I'm not keeping you...' or 'Take your time, dear, I'm not going anywhere.' Speak slowly.",
                ]
                while True:
                    await asyncio.sleep(3)
                    silence = asyncio.get_event_loop().time() - last_agent_spoke
                    if silence > SILENCE_THRESHOLD:
                        prompt = random.choice(REENGAGEMENT)
                        try:
                            await openai_ws.send(json.dumps({
                                "type": "conversation.item.create",
                                "item": {
                                    "type": "message",
                                    "role": "user",
                                    "content": [{"type": "input_text", "text": prompt}],
                                },
                            }))
                            await openai_ws.send(json.dumps({"type": "response.create"}))
                        except websockets.exceptions.ConnectionClosed:
                            return
                        last_agent_spoke = asyncio.get_event_loop().time()

            # ── RUN ALL THREE CONCURRENTLY ────────────────────────────────────
            await asyncio.gather(
                receive_from_openai(),
                receive_from_agent(),
                silence_watchdog(),
                return_exceptions=True,
            )

    except Exception as exc:
        print(f"Session error: {exc}")
        try:
            await agent_ws.send_text(json.dumps({"type": "error", "message": str(exc)}))
        except Exception:
            pass


if __name__ == "__main__":
    print("Medicare Training Simulator — theBRIDGE")
    uvicorn.run(app, host="0.0.0.0", port=int(os.getenv("PORT", 8000)))
