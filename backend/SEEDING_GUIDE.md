# Database Seeding Guide for Development

This guide explains how to populate your Supabase PostgreSQL database with sample data for development and testing.

## 🎯 What This Creates

The seeding scripts will create:

- **👤 Dev User**: `kong` (ID: `50d054d6-4e1c-4157-b231-5b8e9d321913`)
- **🏢 Business**: "Kong's Test Store" 
- **📦 Products**: 5 sample products with barcodes
- **📊 Inventory**: Stock levels and settings for each product
- **💼 Transactions**: Sample stock movements and history

## 🚀 Quick Start

### Option 1: Python Script (Recommended)

1. **Install dependencies**:
   ```bash
   cd backend
   pip install -r requirements-seed.txt
   ```

2. **Set up environment variables** in `.env`:
   ```bash
   SUPABASE_URL=your_supabase_project_url
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
   ```

3. **Run the seeding script**:
   ```bash
   python seed_dev_database.py
   ```

### Option 2: SQL Script

1. **Open Supabase Dashboard** → SQL Editor
2. **Copy and paste** the contents of `seed_dev_database.sql`
3. **Run the script**

## 📋 Prerequisites

### Required Environment Variables

```bash
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

### Required Database Tables

The script expects these tables to exist:
- `profiles` - User profiles
- `businesses` - Business information
- `business_members` - User-business relationships
- `products` - Product catalog
- `inventory` - Stock levels
- `inventory_transactions` - Transaction history

## 🔧 What Gets Created

### 1. User Profile
```json
{
  "id": "dev_kong_1756736607319",
  "full_name": "kong",
  "email": "kong@dev.local",
  "phone": "+66-123-456-789"
}
```

### 2. Business
```json
{
  "name": "Kong's Test Store",
  "description": "A sample retail store for development and testing",
  "business_type": "retail",
  "settings": {
    "currency": "THB",
    "timezone": "Asia/Bangkok",
    "language": "en",
    "tax_rate": 7.0
  }
}
```

### 3. Sample Products

| Product | Barcode | Cost | Price | Category |
|---------|---------|------|-------|----------|
| iPhone 15 Pro | 1234567890123 | ฿45,000 | ฿55,000 | Electronics |
| Samsung Galaxy S24 | 9876543210987 | ฿35,000 | ฿42,000 | Electronics |
| MacBook Air M2 | 4567891230456 | ฿65,000 | ฿75,000 | Computers |
| AirPods Pro | 7891234560789 | ฿8,000 | ฿12,000 | Accessories |
| iPad Air | 3210987654321 | ฿25,000 | ฿32,000 | Tablets |

### 4. Inventory Setup
- **Initial Stock**: 50 units per product
- **Min Stock Level**: 10 units
- **Max Stock Level**: 200 units
- **Location**: Main Warehouse

### 5. Sample Transactions
- **Stock In**: Initial inventory setup (30 days ago)
- **Stock Out**: Sample sales (15 days ago) for some products

## 🧪 Testing the Setup

After running the seeding script:

1. **Check Dashboard**: Navigate to `/dashboard` to see your business
2. **Test Scanner**: Use `/liff/scanner` to scan the sample barcodes
3. **View Products**: Check `/liff/products` to see all products
4. **Test Transactions**: Try recording stock movements

## 🔍 Verification Queries

Run these in Supabase SQL Editor to verify the setup:

### Check User
```sql
SELECT * FROM profiles WHERE id = '50d054d6-4e1c-4157-b231-5b8e9d321913';
```

### Check Business
```sql
SELECT * FROM businesses WHERE owner_id = '50d054d6-4e1c-4157-b231-5b8e9d321913';
```

### Check Products
```sql
SELECT p.*, i.current_stock 
FROM products p 
JOIN inventory i ON p.id = i.product_id 
WHERE p.business_id = (
  SELECT id FROM businesses WHERE owner_id = '50d054d6-4e1c-4157-b231-5b8e9d321913'
);
```

### Check Transactions
```sql
SELECT * FROM inventory_transactions 
WHERE user_id = '50d054d6-4e1c-4157-b231-5b8e9d321913'
ORDER BY created_at DESC;
```

## 🚨 Troubleshooting

### Common Issues

1. **"Table doesn't exist"**
   - Make sure you've run your database migrations
   - Check table names match exactly

2. **"Permission denied"**
   - Use `SUPABASE_SERVICE_ROLE_KEY` (not anon key)
   - Check RLS policies allow service role access

3. **"UUID extension not available"**
   - The script will create it automatically
   - If manual, run: `CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`

4. **"Duplicate key" errors**
   - The script handles conflicts gracefully
   - Check if data already exists

### Debug Mode

Enable verbose logging by modifying the Python script:
```python
# Add this line after supabase client creation
supabase.table("profiles").select("*").execute()
```

## 🔄 Resetting Data

To start fresh:

1. **Clear specific tables**:
   ```sql
   DELETE FROM inventory_transactions WHERE user_id = '50d054d6-4e1c-4157-b231-5b8e9d321913';
DELETE FROM inventory WHERE business_id IN (
  SELECT id FROM businesses WHERE owner_id = '50d054d6-4e1c-4157-b231-5b8e9d321913'
);
DELETE FROM products WHERE business_id IN (
  SELECT id FROM businesses WHERE owner_id = '50d054d6-4e1c-4157-b231-5b8e9d321913'
);
DELETE FROM business_members WHERE user_id = '50d054d6-4e1c-4157-b231-5b8e9d321913';
DELETE FROM businesses WHERE owner_id = '50d054d6-4e1c-4157-b231-5b8e9d321913';
DELETE FROM profiles WHERE id = '50d054d6-4e1c-4157-b231-5b8e9d321913';
   ```

2. **Re-run seeding script**: `python seed_dev_database.py`

## 📝 Customization

### Adding More Products

Edit the `create_sample_products()` function in the Python script:

```python
{
    "name": "Your Product",
    "description": "Product description",
    "barcode": "1234567890124",
    "sku": "SKU-001",
    "cost_price": "1000.00",
    "selling_price": "1500.00",
    "unit": "piece",
    "category": "Your Category",
    "business_id": business_id,
    "is_active": True
}
```

### Changing Business Settings

Modify the `create_business()` function:

```python
"settings": {
    "currency": "USD",  # Change currency
    "timezone": "America/New_York",  # Change timezone
    "language": "es",  # Change language
    "tax_rate": 8.25  # Change tax rate
}
```

## 🎉 Success Indicators

When successful, you should see:

```
🎉 Database seeding completed successfully!
============================================================
👤 Dev User: kong (50d054d6-4e1c-4157-b231-5b8e9d321913)
🏢 Business: Kong's Test Store (uuid-here)
📦 Products: 5 created with inventory
💼 Transactions: Sample data created

You can now use the scanner and dashboard with this sample data!
```

## 📞 Support

If you encounter issues:

1. **Check console output** for specific error messages
2. **Verify environment variables** are set correctly
3. **Check Supabase logs** for database errors
4. **Ensure tables exist** and have correct structure

## 🔗 Related Files

- `seed_dev_database.py` - Python seeding script
- `seed_dev_database.sql` - SQL seeding script
- `requirements-seed.txt` - Python dependencies
- `SEEDING_GUIDE.md` - This guide
