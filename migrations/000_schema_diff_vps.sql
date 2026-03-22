-- ============================================================================
-- Bizconekt (Build v5.0) - Schema Diff: Upgrade VPS to match Dev
-- Generated on 2026-03-17 from LIVE comparison of both databases
-- Updated on 2026-03-18 with ALL missing columns discovered during migration
-- MariaDB 10.11 compatible
--
-- VPS DB: nfwqffvypj (72 tables)
-- Dev DB: biz_dev (203 tables)
--
-- This script:
--   1. Creates 131 missing tables (via 000_full_schema.sql - run that FIRST)
--   2. Adds missing columns to the 72 existing VPS tables
--
-- All statements use IF NOT EXISTS - safe to run multiple times.
-- IMPORTANT: Back up VPS database before running!
-- ============================================================================

SET FOREIGN_KEY_CHECKS = 0;

-- ============================================================================
-- STEP 1: CREATE MISSING TABLES
-- Run 000_full_schema.sql FIRST - it uses CREATE TABLE IF NOT EXISTS
-- That will create all 131 missing tables. This file handles column diffs only.
-- ============================================================================

-- ============================================================================
-- STEP 2: ADD MISSING COLUMNS TO EXISTING TABLES
-- These are columns that exist in dev but NOT on VPS
-- ============================================================================

-- ----------------------------------------
-- Table: addon_suites (3 missing columns)
-- ----------------------------------------
ALTER TABLE `addon_suites` ADD COLUMN IF NOT EXISTS `status` varchar(20) DEFAULT 'active';
ALTER TABLE `addon_suites` ADD COLUMN IF NOT EXISTS `description` text DEFAULT NULL;
ALTER TABLE `addon_suites` ADD COLUMN IF NOT EXISTS `is_displayed` tinyint(1) DEFAULT 1;

-- ----------------------------------------
-- Table: analytics_conversions (1 missing column)
-- ----------------------------------------
ALTER TABLE `analytics_conversions` ADD COLUMN IF NOT EXISTS `listing_id` int(11) DEFAULT NULL;

-- ----------------------------------------
-- Table: analytics_events (1 missing column)
-- ----------------------------------------
ALTER TABLE `analytics_events` ADD COLUMN IF NOT EXISTS `listing_id` int(11) DEFAULT NULL;

-- ----------------------------------------
-- Table: analytics_listing_views (1 missing column)
-- ----------------------------------------
ALTER TABLE `analytics_listing_views` ADD COLUMN IF NOT EXISTS `referrer` varchar(500) DEFAULT NULL;

-- ----------------------------------------
-- Table: event_rsvps (1 missing column)
-- ----------------------------------------
ALTER TABLE `event_rsvps` ADD COLUMN IF NOT EXISTS `check_in_code` varchar(20) DEFAULT NULL;

-- ----------------------------------------
-- Table: events (16 missing columns)
-- ----------------------------------------
ALTER TABLE `events` ADD COLUMN IF NOT EXISTS `age_restrictions` text DEFAULT NULL;
ALTER TABLE `events` ADD COLUMN IF NOT EXISTS `parking_notes` text DEFAULT NULL;
ALTER TABLE `events` ADD COLUMN IF NOT EXISTS `weather_contingency` text DEFAULT NULL;
ALTER TABLE `events` ADD COLUMN IF NOT EXISTS `external_ticket_url` varchar(500) DEFAULT NULL;
ALTER TABLE `events` ADD COLUMN IF NOT EXISTS `waitlist_enabled` tinyint(1) DEFAULT 0;
ALTER TABLE `events` ADD COLUMN IF NOT EXISTS `check_in_enabled` tinyint(1) DEFAULT 0;
ALTER TABLE `events` ADD COLUMN IF NOT EXISTS `is_hiring_event` tinyint(1) DEFAULT 0;
ALTER TABLE `events` ADD COLUMN IF NOT EXISTS `is_community_event` tinyint(1) DEFAULT 0;
ALTER TABLE `events` ADD COLUMN IF NOT EXISTS `submitted_by_user_id` int(11) DEFAULT NULL;
ALTER TABLE `events` ADD COLUMN IF NOT EXISTS `moderation_notes` text DEFAULT NULL;
ALTER TABLE `events` ADD COLUMN IF NOT EXISTS `is_recurring` tinyint(1) DEFAULT 0;
ALTER TABLE `events` ADD COLUMN IF NOT EXISTS `recurrence_type` enum('daily','weekly','biweekly','monthly') DEFAULT NULL;
ALTER TABLE `events` ADD COLUMN IF NOT EXISTS `recurrence_days` varchar(100) DEFAULT NULL;
ALTER TABLE `events` ADD COLUMN IF NOT EXISTS `recurrence_end_date` datetime DEFAULT NULL;
ALTER TABLE `events` ADD COLUMN IF NOT EXISTS `parent_event_id` int(11) DEFAULT NULL;
ALTER TABLE `events` ADD COLUMN IF NOT EXISTS `series_index` int(11) DEFAULT NULL;

-- ----------------------------------------
-- Table: listing_inquiries (1 missing column)
-- ----------------------------------------
ALTER TABLE `listing_inquiries` ADD COLUMN IF NOT EXISTS `listing_name` varchar(255) DEFAULT NULL;

-- ----------------------------------------
-- Table: listings (12 missing columns)
-- ----------------------------------------
ALTER TABLE `listings` ADD COLUMN IF NOT EXISTS `video_gallery` longtext DEFAULT '[]';
ALTER TABLE `listings` ADD COLUMN IF NOT EXISTS `rejection_reason` text DEFAULT NULL;
ALTER TABLE `listings` ADD COLUMN IF NOT EXISTS `admin_reviewer_id` int(11) DEFAULT NULL;
ALTER TABLE `listings` ADD COLUMN IF NOT EXISTS `admin_notes` text DEFAULT NULL;
ALTER TABLE `listings` ADD COLUMN IF NOT EXISTS `admin_decision_at` timestamp NULL DEFAULT NULL;
ALTER TABLE `listings` ADD COLUMN IF NOT EXISTS `section_layout` longtext DEFAULT NULL;
ALTER TABLE `listings` ADD COLUMN IF NOT EXISTS `gallery_layout` enum('grid','masonry','carousel','justified') DEFAULT 'grid';
ALTER TABLE `listings` ADD COLUMN IF NOT EXISTS `video_gallery_layout` enum('grid','masonry','carousel','inline','showcase') DEFAULT 'grid';
ALTER TABLE `listings` ADD COLUMN IF NOT EXISTS `combine_video_gallery` tinyint(1) NOT NULL DEFAULT 0;
ALTER TABLE `listings` ADD COLUMN IF NOT EXISTS `hours_status` varchar(20) NOT NULL DEFAULT 'timetable';
ALTER TABLE `listings` ADD COLUMN IF NOT EXISTS `timezone` varchar(50) NOT NULL DEFAULT 'America/New_York';
ALTER TABLE `listings` ADD COLUMN IF NOT EXISTS `is_featured` tinyint(1) NOT NULL DEFAULT 0;

-- ----------------------------------------
-- Table: media_files (3 missing columns)
-- ----------------------------------------
ALTER TABLE `media_files` ADD COLUMN IF NOT EXISTS `alt_text` varchar(255) DEFAULT NULL;
ALTER TABLE `media_files` ADD COLUMN IF NOT EXISTS `title_text` varchar(255) DEFAULT NULL;
ALTER TABLE `media_files` ADD COLUMN IF NOT EXISTS `seo_filename` varchar(255) DEFAULT NULL;

-- ----------------------------------------
-- Table: offers (14 missing columns)
-- ----------------------------------------
ALTER TABLE `offers` ADD COLUMN IF NOT EXISTS `promo_code_mode` enum('none','universal','unique') DEFAULT 'none';
ALTER TABLE `offers` ADD COLUMN IF NOT EXISTS `universal_code` varchar(50) DEFAULT NULL;
ALTER TABLE `offers` ADD COLUMN IF NOT EXISTS `terms_conditions` text DEFAULT NULL;
ALTER TABLE `offers` ADD COLUMN IF NOT EXISTS `min_purchase_amount` decimal(10,2) DEFAULT NULL;
ALTER TABLE `offers` ADD COLUMN IF NOT EXISTS `applicable_products` longtext DEFAULT NULL;
ALTER TABLE `offers` ADD COLUMN IF NOT EXISTS `is_flash` tinyint(1) DEFAULT 0;
ALTER TABLE `offers` ADD COLUMN IF NOT EXISTS `flash_start_time` datetime DEFAULT NULL;
ALTER TABLE `offers` ADD COLUMN IF NOT EXISTS `flash_end_time` datetime DEFAULT NULL;
ALTER TABLE `offers` ADD COLUMN IF NOT EXISTS `flash_urgency_level` enum('low','medium','high') DEFAULT NULL;
ALTER TABLE `offers` ADD COLUMN IF NOT EXISTS `is_b2b` tinyint(1) DEFAULT 0;
ALTER TABLE `offers` ADD COLUMN IF NOT EXISTS `template_id` int(11) DEFAULT NULL;
ALTER TABLE `offers` ADD COLUMN IF NOT EXISTS `social_proof_count` int(11) DEFAULT 0;
ALTER TABLE `offers` ADD COLUMN IF NOT EXISTS `offline_code_cached` varchar(50) DEFAULT NULL;

-- ----------------------------------------
-- Table: reviews (1 missing column)
-- ----------------------------------------
ALTER TABLE `reviews` ADD COLUMN IF NOT EXISTS `is_featured` tinyint(1) DEFAULT 0;

-- ----------------------------------------
-- Table: subscription_plans (3 missing columns)
-- ----------------------------------------
ALTER TABLE `subscription_plans` ADD COLUMN IF NOT EXISTS `status` varchar(20) DEFAULT 'active';
ALTER TABLE `subscription_plans` ADD COLUMN IF NOT EXISTS `description` text DEFAULT NULL;
ALTER TABLE `subscription_plans` ADD COLUMN IF NOT EXISTS `is_displayed` tinyint(1) DEFAULT 1;

-- ----------------------------------------
-- Table: user_contacts (2 missing columns)
-- ----------------------------------------
ALTER TABLE `user_contacts` ADD COLUMN IF NOT EXISTS `contact_address` text DEFAULT NULL;
ALTER TABLE `user_contacts` ADD COLUMN IF NOT EXISTS `contact_social_links` longtext DEFAULT NULL;

-- ----------------------------------------
-- Table: user_referrals (4 missing columns)
-- ----------------------------------------
ALTER TABLE `user_referrals` ADD COLUMN IF NOT EXISTS `job_id` int(11) DEFAULT NULL;
ALTER TABLE `user_referrals` ADD COLUMN IF NOT EXISTS `source_type` varchar(50) DEFAULT NULL;
ALTER TABLE `user_referrals` ADD COLUMN IF NOT EXISTS `source_group_id` int(11) DEFAULT NULL;
ALTER TABLE `user_referrals` ADD COLUMN IF NOT EXISTS `auto_generated` tinyint(1) DEFAULT 0;

-- ----------------------------------------
-- Table: users (2 missing columns)
-- ----------------------------------------
ALTER TABLE `users` ADD COLUMN IF NOT EXISTS `stripe_customer_id` varchar(255) DEFAULT NULL;
ALTER TABLE `users` ADD COLUMN IF NOT EXISTS `billing_email` varchar(255) DEFAULT NULL;

-- ============================================================================
-- STEP 3: ADD MISSING INDEXES ON EXISTING TABLES
-- ============================================================================

-- addon_suites
CREATE INDEX IF NOT EXISTS `idx_addon_suites_displayed` ON `addon_suites` (`is_displayed`);

-- subscription_plans
CREATE INDEX IF NOT EXISTS `idx_subscription_plans_displayed` ON `subscription_plans` (`is_displayed`);

-- listings
CREATE INDEX IF NOT EXISTS `idx_listings_featured` ON `listings` (`is_featured`);

-- reviews
CREATE INDEX IF NOT EXISTS `idx_reviews_featured` ON `reviews` (`is_featured`);

-- users
CREATE INDEX IF NOT EXISTS `idx_users_stripe_customer` ON `users` (`stripe_customer_id`);

-- events recurring
CREATE INDEX IF NOT EXISTS `idx_events_recurring` ON `events` (`is_recurring`);
CREATE INDEX IF NOT EXISTS `idx_events_parent` ON `events` (`parent_event_id`);

-- ============================================================================
-- SUMMARY
-- ============================================================================
-- Tables to CREATE (via 000_full_schema.sql): 131
-- Column additions on existing tables: 64
--   - addon_suites: 3
--   - analytics_conversions: 1
--   - analytics_events: 1
--   - analytics_listing_views: 1
--   - event_rsvps: 1
--   - events: 16
--   - listing_inquiries: 1
--   - listings: 12
--   - media_files: 3
--   - offers: 14 (was incorrectly marked "no diffs")
--   - reviews: 1 (was incorrectly marked "no diffs")
--   - subscription_plans: 3
--   - user_contacts: 2
--   - user_referrals: 4
--   - users: 2 (was incorrectly marked "no diffs")
-- Index additions: 7
--
-- After running this + 000_full_schema.sql, VPS schema will match dev exactly.
-- Then run 000_data_sync_vps.sql for data.
-- ============================================================================

SET FOREIGN_KEY_CHECKS = 1;
