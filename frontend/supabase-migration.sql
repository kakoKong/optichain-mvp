-- Supabase Migration Script for Business Creation
-- Run this in your Supabase SQL Editor

-- Add new fields to businesses table
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS website TEXT;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS business_category TEXT;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS business_size TEXT;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS country TEXT;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS postal_code TEXT;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'UTC';
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'USD';
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS trial_code_used TEXT;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS trial_expires_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS is_trial_active BOOLEAN DEFAULT true;

-- Create trial_codes table
CREATE TABLE IF NOT EXISTS trial_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT UNIQUE NOT NULL,
    is_used BOOLEAN DEFAULT false,
    used_by UUID REFERENCES auth.users(id),
    used_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- Insert some sample trial codes
INSERT INTO trial_codes (code, expires_at) VALUES 
    ('TRIAL2024', NOW() + INTERVAL '30 days'),
    ('FREETRIAL', NOW() + INTERVAL '30 days'),
    ('STARTUP2024', NOW() + INTERVAL '30 days'),
    ('DEMO1234', NOW() + INTERVAL '30 days')
ON CONFLICT (code) DO NOTHING;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_trial_codes_code ON trial_codes(code);
CREATE INDEX IF NOT EXISTS idx_trial_codes_used ON trial_codes(is_used);
CREATE INDEX IF NOT EXISTS idx_businesses_trial_code ON businesses(trial_code_used);
CREATE INDEX IF NOT EXISTS idx_businesses_trial_active ON businesses(is_trial_active);

-- Add RLS policies for trial_codes table
ALTER TABLE trial_codes ENABLE ROW LEVEL SECURITY;

-- Allow users to read trial codes (for validation)
CREATE POLICY "Allow read access to trial codes" ON trial_codes
    FOR SELECT USING (true);

-- Allow users to update trial codes when using them
CREATE POLICY "Allow update trial codes when using" ON trial_codes
    FOR UPDATE USING (true);

-- Add comments for documentation
COMMENT ON TABLE trial_codes IS 'Trial codes for business creation';
COMMENT ON COLUMN trial_codes.code IS 'The trial code string';
COMMENT ON COLUMN trial_codes.is_used IS 'Whether the code has been used';
COMMENT ON COLUMN trial_codes.used_by IS 'User who used the code';
COMMENT ON COLUMN trial_codes.expires_at IS 'When the code expires';

COMMENT ON COLUMN businesses.logo_url IS 'URL of the business logo image';
COMMENT ON COLUMN businesses.website IS 'Business website URL';
COMMENT ON COLUMN businesses.email IS 'Business email address';
COMMENT ON COLUMN businesses.business_category IS 'Type of business (retail, restaurant, etc.)';
COMMENT ON COLUMN businesses.business_size IS 'Size of the business';
COMMENT ON COLUMN businesses.trial_code_used IS 'Trial code that was used to create this business';
COMMENT ON COLUMN businesses.trial_expires_at IS 'When the trial period expires';
COMMENT ON COLUMN businesses.is_trial_active IS 'Whether the trial is currently active';
