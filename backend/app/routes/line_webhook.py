# backend/app/routes/line_webhook.py
from fastapi import APIRouter, Request, HTTPException
from linebot import WebhookHandler
from linebot.exceptions import InvalidSignatureError
from linebot.models import MessageEvent, TextMessage
import os

from app.services.line_bot_service import line_bot_service

router = APIRouter(prefix="/webhook", tags=["webhook"])

@router.post("/line")
async def handle_line_webhook(request: Request):
    signature = request.headers.get('x-line-signature', '')
    body = await request.body()
    body_str = body.decode('utf-8')

    try:
        line_bot_service.handler.handle(body_str, signature)
    except InvalidSignatureError:
        raise HTTPException(status_code=400, detail="Invalid signature")

    return {"status": "ok"}

# Register LINE webhook handlers
@line_bot_service.handler.add(MessageEvent, message=TextMessage)
def handle_text_message(event):
    line_bot_service.handle_message(event)
