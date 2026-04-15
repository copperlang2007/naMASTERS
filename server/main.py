import asyncio
import json
import os
from pathlib import Path
import websockets
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
import uvicorn
from dotenv import load_dotenv
from server.personas.dorothy import (
    DOROTHY_SESSION_CONFIG,
    DOROTHY_ANCHOR_CONFIG,
    ANCHOR_WHISPER,
    OPENING_PROMPT
)
