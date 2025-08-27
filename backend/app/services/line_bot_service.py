# backend/app/services/line_bot_service.py
import os
from linebot import LineBotApi, WebhookHandler
from linebot.models import MessageEvent, TextMessage, TextSendMessage
from app.utils.supabase_client import get_supabase_client

class LineBotService:
    def __init__(self):
        self.line_bot_api = LineBotApi(os.getenv('LINE_CHANNEL_ACCESS_TOKEN'))
        self.handler = WebhookHandler(os.getenv('LINE_CHANNEL_SECRET'))
        self.supabase = get_supabase_client()

    def handle_message(self, event):
        """Handle incoming LINE messages"""
        user_id = event.source.user_id
        message_text = event.message.text.lower().strip()

        # Find or create user
        user = self.find_or_create_line_user(user_id)

        if message_text.startswith('/'):
            return self.handle_command(event, message_text)
        else:
            return self.handle_natural_language(event, message_text)

    def handle_command(self, event, command):
        """Handle bot commands"""
        reply_token = event.reply_token

        if command == '/help':
            message = """🤖 Inventory Copilot Commands:

/help - Show this help
/status - Check your account status
/scan - Open barcode scanner
/dashboard - Open dashboard
/products - List your products

Questions? Just ask me about your inventory!"""

        elif command == '/status':
            message = self.get_user_status(event.source.user_id)

        elif command == '/scan':
            message = "📱 Opening barcode scanner..."
            # We'll add LIFF URL here

        elif command == '/dashboard':
            message = "📊 Opening your dashboard..."
            # We'll add LIFF URL here

        else:
            message = f"Unknown command: {command}\nType /help for available commands."

        self.line_bot_api.reply_message(
            reply_token,
            TextSendMessage(text=message)
        )

    def handle_natural_language(self, event, message):
        """Handle natural language queries"""
        reply_token = event.reply_token

        if any(word in message for word in ['stock', 'inventory', 'how many']):
            response = "📦 I can help you check inventory! Use /scan to record stock movements or /dashboard to see your overview."
        elif any(word in message for word in ['help', 'what', 'how']):
            response = "Hi! I'm your Inventory Copilot 🤖\nI help you manage stock with just your phone. Type /help to see what I can do!"
        elif any(word in message for word in ['product', 'item']):
            response = "🏷️ Want to manage products? Use /products to see your items or /scan to add new ones!"
        else:
            response = "I'm learning! Try /help to see what I can do, or ask me about your inventory. 🚀"

        self.line_bot_api.reply_message(
            reply_token,
            TextSendMessage(text=response)
        )

    def find_or_create_line_user(self, line_user_id):
        """Find or create user from LINE ID"""
        try:
            # Check if user exists
            result = self.supabase.table("users").select("*").eq("line_user_id", line_user_id).execute()

            if result.data:
                return result.data[0]

            # Get LINE profile
            profile = self.line_bot_api.get_profile(line_user_id)

            # Create new user record
            user_data = {
                "line_user_id": line_user_id,
                "full_name": profile.display_name,
                "email": f"{line_user_id}@line.temp",  # Temporary email
                "avatar_url": profile.picture_url
            }

            result = self.supabase.table("users").insert(user_data).execute()
            return result.data[0] if result.data else None

        except Exception as e:
            print(f"Error finding/creating user: {e}")
            return None

    def get_user_status(self, line_user_id):
        """Get user account status"""
        try:
            result = self.supabase.table("users").select("""
                *,
                businesses (
                    id,
                    name,
                    created_at
                )
            """).eq("line_user_id", line_user_id).execute()

            if not result.data:
                return "❌ Account not found. Please use /help to get started."

            user = result.data[0]
            business_count = len(user.get('businesses', []))

            status_text = f"""✅ Account Status

👤 Name: {user['full_name'] or 'Not set'}
📧 Email: {user['email']}
🏢 Businesses: {business_count}

Ready to manage your inventory! 🚀"""

            return status_text

        except Exception as e:
            print(f"Error getting user status: {e}")
            return "❌ Could not check status. Please try again later."

line_bot_service = LineBotService()
