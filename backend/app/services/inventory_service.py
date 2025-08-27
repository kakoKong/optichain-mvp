# backend/app/services/inventory_service.py
from typing import List, Optional
from uuid import UUID
from app.utils.supabase_client import get_supabase_client
from app.models import Product, ProductCreate, InventoryTransaction, TransactionCreate

class InventoryService:
    def __init__(self):
        self.supabase = get_supabase_client()

    async def create_product(self, product_data: ProductCreate, user_id: UUID) -> Product:
        """Create a new product"""
        try:
            # Verify user owns the business
            business_check = self.supabase.table("businesses").select("id").eq("id", product_data.business_id).eq("owner_id", user_id).execute()

            if not business_check.data:
                raise ValueError("Business not found or access denied")

            # Create product
            result = self.supabase.table("products").insert(product_data.dict()).execute()

            if result.data:
                return Product(**result.data[0])
            else:
                raise Exception("Failed to create product")

        except Exception as e:
            raise Exception(f"Error creating product: {str(e)}")

    async def get_products_by_business(self, business_id: UUID, user_id: UUID) -> List[Product]:
        """Get all products for a business"""
        try:
            # Verify ownership
            business_check = self.supabase.table("businesses").select("id").eq("id", business_id).eq("owner_id", user_id).execute()

            if not business_check.data:
                raise ValueError("Business not found or access denied")

            result = self.supabase.table("products").select("*").eq("business_id", business_id).eq("is_active", True).execute()

            return [Product(**product) for product in result.data]

        except Exception as e:
            raise Exception(f"Error fetching products: {str(e)}")

    async def find_product_by_barcode(self, business_id: UUID, barcode: str, user_id: UUID) -> Optional[Product]:
        """Find product by barcode"""
        try:
            # Verify ownership
            business_check = self.supabase.table("businesses").select("id").eq("id", business_id).eq("owner_id", user_id).execute()

            if not business_check.data:
                raise ValueError("Business not found or access denied")

            result = self.supabase.table("products").select("*").eq("business_id", business_id).eq("barcode", barcode).execute()

            if result.data:
                return Product(**result.data[0])
            return None

        except Exception as e:
            raise Exception(f"Error finding product: {str(e)}")

    async def record_transaction(self, transaction_data: TransactionCreate, user_id: UUID) -> InventoryTransaction:
        """Record inventory transaction"""
        try:
            # Get current stock
            current_inventory = self.supabase.table("inventory").select("current_stock").eq("business_id", transaction_data.business_id).eq("product_id", transaction_data.product_id).execute()

            current_stock = current_inventory.data[0]["current_stock"] if current_inventory.data else 0

            # Calculate new stock based on transaction type
            if transaction_data.transaction_type == "stock_in":
                new_stock = current_stock + transaction_data.quantity
            elif transaction_data.transaction_type == "stock_out":
                new_stock = max(0, current_stock - transaction_data.quantity)
            else:  # adjustment
                new_stock = transaction_data.quantity

            # Create transaction record
            transaction_record = {
                **transaction_data.dict(),
                "user_id": user_id,
                "previous_stock": current_stock,
                "new_stock": new_stock
            }

            result = self.supabase.table("inventory_transactions").insert(transaction_record).execute()

            if result.data:
                return InventoryTransaction(**result.data[0])
            else:
                raise Exception("Failed to record transaction")

        except Exception as e:
            raise Exception(f"Error recording transaction: {str(e)}")

inventory_service = InventoryService()
