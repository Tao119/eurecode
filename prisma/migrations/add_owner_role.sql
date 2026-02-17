-- Migration: Add 'owner' role to UserType enum
-- This migration adds a new 'owner' role for organization owners (purchasers)
-- and converts existing 'admin' users to 'owner'

-- Step 1: Add 'owner' to the UserType enum
ALTER TYPE "UserType" ADD VALUE IF NOT EXISTS 'owner' BEFORE 'admin';

-- Step 2: Convert existing admin users to owner
-- All current admin users are organization owners (purchasers)
UPDATE users SET user_type = 'owner' WHERE user_type = 'admin';

-- Note: After this migration, the role hierarchy is:
-- - owner: Organization owner (can purchase, change plans, manage everything)
-- - admin: Organization admin (can allocate credits, issue keys, manage members - NO purchasing)
-- - member: Organization member (regular user)
-- - individual: Individual user (not part of organization)
