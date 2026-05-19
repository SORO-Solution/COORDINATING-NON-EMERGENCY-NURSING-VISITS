import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from rest_framework_simplejwt.tokens import AccessToken
from rest_framework_simplejwt.exceptions import TokenError

from .models import CustomUser, Appointment, Message
from .encryption import encrypt_message, decrypt_message


class ChatConsumer(AsyncWebsocketConsumer):
    """
    WebSocket consumer for per-appointment chat threads.
    URL: ws://host/ws/chat/<appointment_id>/?token=<jwt>
    """

    async def connect(self):
        self.appointment_id = self.scope['url_route']['kwargs']['appointment_id']
        self.group_name = f'chat_appointment_{self.appointment_id}'

        # Authenticate via JWT in query string
        query_string = self.scope.get('query_string', b'').decode()
        token_str = None
        for part in query_string.split('&'):
            if part.startswith('token='):
                token_str = part.split('=', 1)[1]
                break

        if not token_str:
            await self.close(code=4001)
            return

        user = await self._get_user_from_token(token_str)
        if user is None:
            await self.close(code=4001)
            return

        # Verify user is party to this appointment
        authorized = await self._is_authorized(user, self.appointment_id)
        if not authorized:
            await self.close(code=4003)
            return

        self.user = user
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        if hasattr(self, 'group_name'):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def receive(self, text_data):
        data = json.loads(text_data)
        content = data.get('content', '').strip()
        media_url = data.get('media_url', '')
        media_type = data.get('media_type', '')

        if not content and not media_url:
            return

        # Encrypt text content and persist
        message = await self._save_message(content, media_url, media_type)

        # Broadcast to all clients in the group
        await self.channel_layer.group_send(
            self.group_name,
            {
                'type': 'chat_message',
                'message_id': message.id,
                'content': content,
                'media_url': media_url,
                'media_type': media_type,
                'sender_id': self.user.id,
                'sender_name': f'{self.user.first_name} {self.user.last_name}'.strip() or self.user.username,
                'sender_role': self.user.role,
                'timestamp': message.timestamp.isoformat(),
            }
        )

    async def chat_message(self, event):
        await self.send(text_data=json.dumps({
            'type': 'message',
            'id': event['message_id'],
            'content': event['content'],
            'media_url': event.get('media_url', ''),
            'media_type': event.get('media_type', ''),
            'sender_id': event['sender_id'],
            'sender_name': event['sender_name'],
            'sender_role': event['sender_role'],
            'timestamp': event['timestamp'],
        }))

    # ── Helpers ──────────────────────────────────────────────────────────────

    @database_sync_to_async
    def _get_user_from_token(self, token_str: str):
        try:
            token = AccessToken(token_str)
            return CustomUser.objects.get(pk=token['user_id'])
        except (TokenError, CustomUser.DoesNotExist):
            return None

    @database_sync_to_async
    def _is_authorized(self, user, appointment_id: str) -> bool:
        if user.role == 'ADMIN':
            return True
        try:
            appt = Appointment.objects.get(pk=appointment_id)
            return appt.patient == user or appt.nurse.user == user
        except Appointment.DoesNotExist:
            return False

    @database_sync_to_async
    def _save_message(self, content: str, media_url: str = '', media_type: str = ''):
        encrypted = encrypt_message(content) if content else ''
        msg = Message.objects.create(
            appointment_id=self.appointment_id,
            sender=self.user,
            encrypted_content=encrypted,
            media_url=media_url,
            media_type=media_type,
        )
        return msg
