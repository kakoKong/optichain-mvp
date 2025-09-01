#!/usr/bin/env python3
"""
Development Database Seeding Script for OptiChain Inventory Copilot

This script populates your Supabase PostgreSQL database with sample data for development.
It creates a complete business setup with products, inventory, and sample transactions.

Usage:
    python seed_dev_database.py

Requirements:
    - Install dependencies: pip install supabase python-dotenv
    - Set up .env file with your Supabase credentials
"""

import os
import uuid
from datetime import datetime, timedelta
from decimal import Decimal
from dotenv import load_dotenv
from supabase import create_client, Client

# Load environment variables
load_dotenv()

# Supabase configuration
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
    print("❌ Error: Missing Supabase environment variables")
    print("Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your .env file")
    exit(1)

# Initialize Supabase client
supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

# Dev user information
DEV_USER_ID = "50d054d6-4e1c-4157-b231-5b8e9d321913"
DEV_USER_NAME = "kong"

def print_step(message):
    """Print a formatted step message"""
    print(f"\n🔧 {message}")
    print("-" * 50)

def print_success(message):
    """Print a success message"""
    print(f"✅ {message}")

def print_error(message):
    """Print an error message"""
    print(f"❌ {message}")

def create_dev_user():
    """Create the development user profile"""
    print_step("Creating development user profile")
    
    try:
        # Check if user already exists
        existing_user = supabase.table("profiles").select("*").eq("id", DEV_USER_ID).execute()
        
        if existing_user.data:
            print_success(f"User {DEV_USER_NAME} already exists")
            return DEV_USER_ID
        
        # Create user profile
        user_data = {
            "id": DEV_USER_ID,
            "full_name": DEV_USER_NAME,
            "email": f"{DEV_USER_NAME}@dev.local",
            "phone": "+66-123-456-789",
            "line_user_id": None,
            "avatar_url": None,
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat()
        }
        
        result = supabase.table("profiles").insert(user_data).execute()
        
        if result.data:
            print_success(f"Created user profile for {DEV_USER_NAME}")
            return DEV_USER_ID
        else:
            raise Exception("Failed to create user profile")
            
    except Exception as e:
        print_error(f"Failed to create user: {str(e)}")
        return None

def create_business(user_id):
    """Create a sample business for the dev user"""
    print_step("Creating sample business")
    
    try:
        business_data = {
            "id": str(uuid.uuid4()),
            "name": "Kong's Test Store",
            "description": "A sample retail store for development and testing",
            "phone": "+66-123-456-789",
            "address": "123 Test Street, Bangkok, Thailand",
            "business_type": "retail",
            "owner_id": user_id,
            "settings": {
                "currency": "THB",
                "timezone": "Asia/Bangkok",
                "language": "en",
                "tax_rate": 7.0
            },
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat()
        }
        
        result = supabase.table("businesses").insert(business_data).execute()
        
        if result.data:
            business_id = result.data[0]["id"]
            print_success(f"Created business: {business_data['name']}")
            return business_id
        else:
            raise Exception("Failed to create business")
            
    except Exception as e:
        print_error(f"Failed to create business: {str(e)}")
        return None

def create_sample_products(business_id):
    """Create sample products with inventory"""
    print_step("Creating sample products and inventory")
    
    products_data = [
        {
            "name": "iPhone 15 Pro",
            "description": "Latest iPhone with advanced features",
            "barcode": "1234567890123",
            "sku": "IPH15PRO-001",
            "cost_price": "45000.00",
            "selling_price": "55000.00",
            "unit": "piece",
            "category": "Electronics",
            "business_id": business_id,
            "is_active": True,
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat()
        },
        {
            "name": "Samsung Galaxy S24",
            "description": "Premium Android smartphone",
            "barcode": "9876543210987",
            "sku": "SAMS24-001",
            "cost_price": "35000.00",
            "selling_price": "42000.00",
            "unit": "piece",
            "category": "Electronics",
            "business_id": business_id,
            "is_active": True,
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat()
        },
        {
            "name": "MacBook Air M2",
            "description": "Lightweight laptop for productivity",
            "barcode": "4567891230456",
            "sku": "MBA-M2-001",
            "cost_price": "65000.00",
            "selling_price": "75000.00",
            "unit": "piece",
            "category": "Computers",
            "business_id": business_id,
            "is_active": True,
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat()
        },
        {
            "name": "AirPods Pro",
            "description": "Wireless noise-canceling earbuds",
            "barcode": "7891234560789",
            "sku": "APP-001",
            "cost_price": "8000.00",
            "selling_price": "12000.00",
            "unit": "piece",
            "category": "Accessories",
            "business_id": business_id,
            "is_active": True,
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat()
        },
        {
            "name": "iPad Air",
            "description": "Versatile tablet for work and play",
            "barcode": "3210987654321",
            "sku": "IPA-001",
            "cost_price": "25000.00",
            "selling_price": "32000.00",
            "unit": "piece",
            "category": "Tablets",
            "business_id": business_id,
            "is_active": True,
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat()
        }
    ]
    
    try:
        # Insert products
        products_result = supabase.table("products").insert(products_data).execute()
        
        if not products_result.data:
            raise Exception("Failed to create products")
        
        print_success(f"Created {len(products_data)} products")
        
        # Create inventory records for each product
        inventory_records = []
        for product in products_result.data:
            inventory_record = {
                "id": str(uuid.uuid4()),
                "business_id": business_id,
                "product_id": product["id"],
                "current_stock": 50,  # Start with 50 units
                "reserved_stock": 0,
                "min_stock_level": 10,
                "max_stock_level": 200,
                "location": "Main Warehouse",
                "last_counted_at": datetime.utcnow().isoformat(),
                "updated_at": datetime.utcnow().isoformat()
            }
            inventory_records.append(inventory_record)
        
        # Insert inventory records
        inventory_result = supabase.table("inventory").insert(inventory_records).execute()
        
        if inventory_result.data:
            print_success(f"Created inventory records for {len(inventory_records)} products")
            return [product["id"] for product in products_result.data]
        else:
            raise Exception("Failed to create inventory records")
            
    except Exception as e:
        print_error(f"Failed to create products/inventory: {str(e)}")
        return []

def create_sample_transactions(business_id, user_id, product_ids):
    """Create sample inventory transactions"""
    print_step("Creating sample inventory transactions")
    
    if not product_ids:
        print_error("No products to create transactions for")
        return
    
    transactions = []
    current_time = datetime.utcnow()
    
    # Create various transaction types
    for i, product_id in enumerate(product_ids):
        # Stock in transaction
        stock_in = {
            "id": str(uuid.uuid4()),
            "business_id": business_id,
            "product_id": product_id,
            "user_id": user_id,
            "transaction_type": "stock_in",
            "quantity": 50,
            "previous_stock": 0,
            "new_stock": 50,
            "unit_cost": "1000.00",
            "reason": "Initial stock",
            "notes": "Initial inventory setup",
            "reference_number": f"INIT-{i+1:03d}",
            "metadata": {"source": "dev_seeding"},
            "created_at": (current_time - timedelta(days=30)).isoformat()
        }
        transactions.append(stock_in)
        
        # Some stock out transactions
        if i % 2 == 0:  # Every other product
            stock_out = {
                "id": str(uuid.uuid4()),
                "business_id": business_id,
                "product_id": product_id,
                "user_id": user_id,
                "transaction_type": "stock_out",
                "quantity": 5,
                "previous_stock": 50,
                "new_stock": 45,
                "unit_cost": None,
                "reason": "Sample sale",
                "notes": "Test transaction for development",
                "reference_number": f"SALE-{i+1:03d}",
                "metadata": {"source": "dev_seeding"},
                "created_at": (current_time - timedelta(days=15)).isoformat()
            }
            transactions.append(stock_out)
    
    try:
        result = supabase.table("inventory_transactions").insert(transactions).execute()
        
        if result.data:
            print_success(f"Created {len(transactions)} sample transactions")
        else:
            raise Exception("Failed to create transactions")
            
    except Exception as e:
        print_error(f"Failed to create transactions: {str(e)}")

def create_business_members(business_id, user_id):
    """Create business membership for the user"""
    print_step("Setting up business membership")
    
    try:
        membership_data = {
            "id": str(uuid.uuid4()),
            "business_id": business_id,
            "user_id": user_id,
            "role": "owner",
            "permissions": ["read", "write", "admin"],
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat()
        }
        
        result = supabase.table("business_members").insert(membership_data).execute()
        
        if result.data:
            print_success("Created business membership")
        else:
            raise Exception("Failed to create business membership")
            
    except Exception as e:
        print_error(f"Failed to create business membership: {str(e)}")

def main():
    """Main seeding function"""
    print("🚀 Starting OptiChain Development Database Seeding")
    print("=" * 60)
    
    try:
        # Step 1: Create dev user
        user_id = create_dev_user()
        if not user_id:
            print_error("Cannot continue without user")
            return
        
        # Step 2: Create business
        business_id = create_business(user_id)
        if not business_id:
            print_error("Cannot continue without business")
            return
        
        # Step 3: Create business membership
        create_business_members(business_id, user_id)
        
        # Step 4: Create products and inventory
        product_ids = create_sample_products(business_id)
        
        # Step 5: Create sample transactions
        if product_ids:
            create_sample_transactions(business_id, user_id, product_ids)
        
        print("\n🎉 Database seeding completed successfully!")
        print("=" * 60)
        print(f"👤 Dev User: {DEV_USER_NAME} ({user_id})")
        print(f"🏢 Business: Kong's Test Store ({business_id})")
        print(f"📦 Products: {len(product_ids)} created with inventory")
        print(f"💼 Transactions: Sample data created")
        print("\nYou can now use the scanner and dashboard with this sample data!")
        
    except Exception as e:
        print_error(f"Seeding failed: {str(e)}")
        print("Check your Supabase connection and permissions")

if __name__ == "__main__":
    main()
