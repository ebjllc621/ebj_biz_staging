-- ============================================================================
-- Bizconekt (Build v5.0) - Complete Database Schema
-- Generated from live dev DB (biz_dev) on 2026-03-17
-- MariaDB 10.11 compatible
-- 203 tables, ordered with FOREIGN_KEY_CHECKS=0
--
-- This file replaces all individual migration files (002-083+)
--
-- USAGE:
--   Fresh install: Run this entire file against empty database
--   VPS upgrade:   Use 000_schema_diff_vps.sql instead
-- ============================================================================
/*M!999999\- enable the sandbox mode */ 

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `addon_suites` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `suite_name` enum('creator','realtor','restaurant','seo_scribe') NOT NULL,
  `version` varchar(10) NOT NULL,
  `display_name` varchar(100) NOT NULL,
  `pricing_monthly` decimal(10,2) DEFAULT NULL,
  `pricing_annual` decimal(10,2) DEFAULT NULL,
  `features` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`features`)),
  `effective_date` date NOT NULL,
  `deprecated_date` date DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `status` enum('active','inactive','archived') DEFAULT 'active' COMMENT 'Admin management status for addon visibility',
  `description` text DEFAULT NULL COMMENT 'Admin-facing description for addon management',
  `is_displayed` tinyint(1) DEFAULT 1 COMMENT 'Whether this addon version is publicly displayed',
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_suite_version` (`suite_name`,`version`),
  KEY `idx_suite` (`suite_name`),
  KEY `idx_addon_suites_displayed` (`is_displayed`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `admin_activity` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `admin_user_id` int(11) NOT NULL,
  `target_user_id` int(11) DEFAULT NULL,
  `target_entity_type` varchar(50) NOT NULL,
  `target_entity_id` int(11) DEFAULT NULL,
  `action_type` varchar(50) NOT NULL,
  `action_category` varchar(50) NOT NULL,
  `action_description` text NOT NULL,
  `before_data` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`before_data`)),
  `after_data` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`after_data`)),
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` text DEFAULT NULL,
  `session_id` varchar(255) DEFAULT NULL,
  `severity` varchar(20) DEFAULT 'normal',
  `requires_approval` tinyint(1) DEFAULT 0,
  `approved_by` int(11) DEFAULT NULL,
  `approved_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `approved_by` (`approved_by`),
  KEY `idx_admin_activity_admin_user` (`admin_user_id`),
  KEY `idx_admin_activity_target_user` (`target_user_id`),
  KEY `idx_admin_activity_action_type` (`action_type`),
  KEY `idx_admin_activity_action_category` (`action_category`),
  KEY `idx_admin_activity_entity` (`target_entity_type`,`target_entity_id`),
  KEY `idx_admin_activity_severity` (`severity`),
  KEY `idx_admin_activity_created` (`created_at`),
  CONSTRAINT `admin_activity_ibfk_1` FOREIGN KEY (`admin_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `admin_activity_ibfk_2` FOREIGN KEY (`target_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `admin_activity_ibfk_3` FOREIGN KEY (`approved_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `affiliate_campaign_metrics` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `marketer_id` int(11) NOT NULL,
  `portfolio_item_id` int(11) DEFAULT NULL,
  `campaign_name` varchar(255) NOT NULL,
  `network` varchar(100) DEFAULT NULL,
  `impressions` int(11) DEFAULT 0,
  `clicks` int(11) DEFAULT 0,
  `conversions` int(11) DEFAULT 0,
  `revenue` decimal(10,2) DEFAULT 0.00,
  `commission_rate` decimal(5,2) DEFAULT NULL,
  `period_start` date DEFAULT NULL,
  `period_end` date DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT NULL ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_marketer` (`marketer_id`),
  KEY `idx_portfolio` (`portfolio_item_id`),
  KEY `idx_network` (`network`),
  KEY `idx_period` (`period_start`,`period_end`),
  CONSTRAINT `fk_campaign_marketer` FOREIGN KEY (`marketer_id`) REFERENCES `content_affiliate_marketers` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_campaign_portfolio` FOREIGN KEY (`portfolio_item_id`) REFERENCES `affiliate_marketer_portfolio` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `affiliate_marketer_portfolio` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `marketer_id` int(11) NOT NULL,
  `brand_name` varchar(255) DEFAULT NULL,
  `brand_logo` varchar(500) DEFAULT NULL,
  `campaign_title` varchar(255) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `results_summary` text DEFAULT NULL,
  `conversion_rate` decimal(5,2) DEFAULT NULL,
  `content_url` varchar(500) DEFAULT NULL,
  `campaign_date` date DEFAULT NULL,
  `sort_order` int(11) DEFAULT 0,
  `created_at` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_marketer` (`marketer_id`),
  CONSTRAINT `fk_portfolio_marketer` FOREIGN KEY (`marketer_id`) REFERENCES `content_affiliate_marketers` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `affiliate_marketer_reviews` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `marketer_id` int(11) NOT NULL,
  `reviewer_user_id` int(11) NOT NULL,
  `reviewer_listing_id` int(11) DEFAULT NULL,
  `rating` tinyint(4) NOT NULL,
  `review_text` text DEFAULT NULL,
  `images` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`images`)),
  `campaign_type` varchar(100) DEFAULT NULL,
  `status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  `created_at` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_marketer` (`marketer_id`),
  KEY `idx_reviewer` (`reviewer_user_id`),
  CONSTRAINT `fk_review_marketer` FOREIGN KEY (`marketer_id`) REFERENCES `content_affiliate_marketers` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_review_user` FOREIGN KEY (`reviewer_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `alerts` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `alert_type` varchar(50) NOT NULL COMMENT 'response_time, error_rate, cpu_usage, memory_usage',
  `alert_name` varchar(255) NOT NULL,
  `threshold_value` decimal(10,2) DEFAULT NULL COMMENT 'Threshold that was exceeded',
  `current_value` decimal(10,2) DEFAULT NULL COMMENT 'Actual value that triggered alert',
  `severity` enum('info','warning','critical') DEFAULT 'warning',
  `message` text NOT NULL,
  `action_taken` text DEFAULT NULL COMMENT 'What was done to resolve',
  `acknowledged` tinyint(1) DEFAULT 0,
  `acknowledged_by` int(11) DEFAULT NULL,
  `acknowledged_at` timestamp NULL DEFAULT NULL,
  `resolved` tinyint(1) DEFAULT 0,
  `resolved_at` timestamp NULL DEFAULT NULL,
  `metadata` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Additional context: affected endpoints, user IDs' CHECK (json_valid(`metadata`)),
  `environment` varchar(20) DEFAULT 'production',
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_alert_type` (`alert_type`),
  KEY `idx_severity` (`severity`),
  KEY `idx_acknowledged` (`acknowledged`),
  KEY `idx_resolved` (`resolved`),
  KEY `idx_created_at` (`created_at`),
  KEY `idx_environment` (`environment`),
  KEY `acknowledged_by` (`acknowledged_by`),
  CONSTRAINT `alerts_ibfk_1` FOREIGN KEY (`acknowledged_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Performance and error alerts';
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `analytics_conversions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `conversion_type` varchar(50) NOT NULL COMMENT 'signup, purchase, subscription, etc',
  `value` decimal(10,2) DEFAULT NULL,
  `user_id` int(11) DEFAULT NULL,
  `session_id` varchar(100) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `listing_id` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_conversion_type` (`conversion_type`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_created_at` (`created_at`),
  KEY `idx_conv_listing_id` (`listing_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Conversion tracking';
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `analytics_events` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `event_name` varchar(100) NOT NULL,
  `event_data` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`event_data`)),
  `user_id` int(11) DEFAULT NULL,
  `session_id` varchar(100) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `listing_id` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_event_name` (`event_name`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_created_at` (`created_at`),
  KEY `idx_events_listing_id` (`listing_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Custom event tracking';
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `analytics_listing_views` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `listing_id` int(11) NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `session_id` varchar(100) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `referrer` varchar(500) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_listing_id` (`listing_id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_created_at` (`created_at`),
  CONSTRAINT `analytics_listing_views_ibfk_1` FOREIGN KEY (`listing_id`) REFERENCES `listings` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Listing view tracking';
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `analytics_page_views` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `url` varchar(500) NOT NULL,
  `title` varchar(200) DEFAULT NULL,
  `user_id` int(11) DEFAULT NULL,
  `session_id` varchar(100) DEFAULT NULL,
  `referrer` varchar(500) DEFAULT NULL,
  `user_agent` text DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_url` (`url`(255)),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_created_at` (`created_at`),
  KEY `idx_session_id` (`session_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Page view tracking';
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `analytics_searches` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `query` varchar(200) NOT NULL,
  `results_count` int(11) NOT NULL DEFAULT 0,
  `user_id` int(11) DEFAULT NULL,
  `session_id` varchar(100) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_query` (`query`),
  KEY `idx_created_at` (`created_at`),
  KEY `idx_user_id` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Search query tracking';
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `billing_transactions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `listing_id` int(11) DEFAULT NULL,
  `transaction_type` enum('subscription_charge','addon_charge','campaign_bank_deposit','campaign_bank_spend','refund','credit','adjustment') NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `currency` varchar(3) NOT NULL DEFAULT 'usd',
  `status` enum('pending','completed','failed','refunded') NOT NULL DEFAULT 'pending',
  `subscription_id` int(11) DEFAULT NULL,
  `addon_id` int(11) DEFAULT NULL,
  `stripe_charge_id` varchar(255) DEFAULT NULL,
  `stripe_invoice_id` varchar(255) DEFAULT NULL,
  `stripe_payment_intent_id` varchar(255) DEFAULT NULL,
  `description` varchar(255) NOT NULL,
  `invoice_number` varchar(50) DEFAULT NULL,
  `tax_amount` decimal(10,2) NOT NULL DEFAULT 0.00,
  `tax_rate` decimal(5,2) DEFAULT NULL,
  `transaction_date` timestamp NOT NULL DEFAULT current_timestamp(),
  `due_date` timestamp NULL DEFAULT NULL,
  `paid_date` timestamp NULL DEFAULT NULL,
  `receipt_url` varchar(500) DEFAULT NULL,
  `statement_month` varchar(7) NOT NULL,
  `metadata` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`metadata`)),
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_user` (`user_id`),
  KEY `idx_listing` (`listing_id`),
  KEY `idx_type` (`transaction_type`),
  KEY `idx_status` (`status`),
  KEY `idx_statement_month` (`statement_month`),
  KEY `idx_invoice` (`invoice_number`),
  KEY `idx_stripe_charge` (`stripe_charge_id`),
  KEY `idx_stripe_invoice` (`stripe_invoice_id`),
  KEY `idx_transaction_date` (`transaction_date`),
  KEY `idx_subscription` (`subscription_id`),
  CONSTRAINT `bt_listing_fk` FOREIGN KEY (`listing_id`) REFERENCES `listings` (`id`) ON DELETE SET NULL,
  CONSTRAINT `bt_subscription_fk` FOREIGN KEY (`subscription_id`) REFERENCES `listing_subscriptions` (`id`) ON DELETE SET NULL,
  CONSTRAINT `bt_user_fk` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `bizwire_analytics` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `listing_id` int(11) NOT NULL,
  `sender_user_id` int(11) DEFAULT NULL,
  `message_id` int(11) DEFAULT NULL,
  `source_page` varchar(100) NOT NULL COMMENT 'listing_detail|job_detail|event_detail|offer_detail|bundle_detail|search_results',
  `source_entity_type` varchar(50) DEFAULT NULL COMMENT 'listing|job|event|offer|bundle',
  `source_entity_id` int(11) DEFAULT NULL COMMENT 'ID of the specific entity page',
  `action` enum('modal_opened','message_sent','reply_sent','message_read') NOT NULL,
  `device_type` varchar(20) DEFAULT NULL COMMENT 'desktop|mobile|tablet',
  `referrer_url` varchar(500) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_bizwire_analytics_listing` (`listing_id`),
  KEY `idx_bizwire_analytics_source` (`source_page`),
  KEY `idx_bizwire_analytics_action` (`action`),
  KEY `idx_bizwire_analytics_created` (`created_at`),
  CONSTRAINT `fk_bizwire_analytics_listing` FOREIGN KEY (`listing_id`) REFERENCES `listings` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `campaign_banks` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `listing_id` int(11) NOT NULL,
  `balance` decimal(10,2) NOT NULL DEFAULT 0.00,
  `total_deposited` decimal(10,2) NOT NULL DEFAULT 0.00,
  `total_spent` decimal(10,2) NOT NULL DEFAULT 0.00,
  `last_deposit_at` timestamp NULL DEFAULT NULL,
  `last_spend_at` timestamp NULL DEFAULT NULL,
  `status` enum('active','frozen','depleted') NOT NULL DEFAULT 'active',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_user_listing` (`user_id`,`listing_id`),
  KEY `idx_user` (`user_id`),
  KEY `idx_listing` (`listing_id`),
  KEY `idx_status` (`status`),
  KEY `idx_balance` (`balance`),
  CONSTRAINT `cb_listing_fk` FOREIGN KEY (`listing_id`) REFERENCES `listings` (`id`) ON DELETE CASCADE,
  CONSTRAINT `cb_user_fk` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `campaigns` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `campaign_type` enum('sponsored_listing','featured_event','featured_offer','banner_ad','email_blast') NOT NULL,
  `title` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `target_audience` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Targeting criteria: {categories: [], locations: [], tiers: [], engagement: "high"}' CHECK (json_valid(`target_audience`)),
  `budget` decimal(10,2) NOT NULL,
  `daily_budget` decimal(10,2) DEFAULT NULL,
  `start_date` timestamp NOT NULL,
  `end_date` timestamp NOT NULL,
  `creatives` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Campaign assets: {images: [], text: "", cta: ""}' CHECK (json_valid(`creatives`)),
  `status` enum('draft','pending','approved','active','paused','completed','rejected') DEFAULT 'draft',
  `admin_notes` text DEFAULT NULL COMMENT 'Internal admin notes',
  `rejection_reason` text DEFAULT NULL COMMENT 'Reason if rejected',
  `impressions` int(11) DEFAULT 0 COMMENT 'Total views',
  `clicks` int(11) DEFAULT 0 COMMENT 'Total clicks',
  `conversions` int(11) DEFAULT 0 COMMENT 'Total conversions',
  `total_spent` decimal(10,2) DEFAULT 0.00 COMMENT 'Total amount spent',
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `approved_by` int(11) DEFAULT NULL COMMENT 'Admin user who approved',
  PRIMARY KEY (`id`),
  KEY `approved_by` (`approved_by`),
  KEY `idx_user` (`user_id`),
  KEY `idx_status` (`status`),
  KEY `idx_type` (`campaign_type`),
  KEY `idx_dates` (`start_date`,`end_date`),
  CONSTRAINT `campaigns_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `campaigns_ibfk_2` FOREIGN KEY (`approved_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Marketing campaigns with performance tracking';
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `candidate_discovery` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `job_seeker_user_id` int(11) NOT NULL,
  `listing_id` int(11) NOT NULL,
  `match_score` decimal(5,2) DEFAULT NULL,
  `matched_skills` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`matched_skills`)),
  `discovered_at` timestamp NULL DEFAULT current_timestamp(),
  `viewed_at` timestamp NULL DEFAULT NULL,
  `contacted_at` timestamp NULL DEFAULT NULL,
  `contact_method` enum('message','email','phone') DEFAULT NULL,
  `status` enum('discovered','interested','contacted','applied','hired','declined') DEFAULT 'discovered',
  `employer_notes` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_candidate_listing` (`job_seeker_user_id`,`listing_id`),
  KEY `idx_listing` (`listing_id`),
  KEY `idx_status` (`status`),
  KEY `idx_match_score` (`match_score` DESC),
  CONSTRAINT `candidate_discovery_ibfk_1` FOREIGN KEY (`job_seeker_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `candidate_discovery_ibfk_2` FOREIGN KEY (`listing_id`) REFERENCES `listings` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `categories` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `slug` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `cat_description` text DEFAULT NULL,
  `keywords` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`keywords`)),
  `parent_id` int(11) DEFAULT NULL,
  `sort_order` int(11) DEFAULT 0,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `slug` (`slug`),
  KEY `idx_categories_slug` (`slug`),
  KEY `idx_categories_parent_id` (`parent_id`),
  KEY `idx_categories_active` (`is_active`),
  KEY `idx_categories_sort_order` (`sort_order`),
  KEY `idx_categories_name_search` (`name`(50)),
  CONSTRAINT `categories_ibfk_1` FOREIGN KEY (`parent_id`) REFERENCES `categories` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `category_subscriptions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `category_id` int(11) NOT NULL,
  `notification_frequency` enum('realtime','daily','weekly') NOT NULL DEFAULT 'daily',
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_category` (`user_id`,`category_id`),
  KEY `idx_category_subs_user` (`user_id`),
  KEY `idx_category_subs_category` (`category_id`),
  CONSTRAINT `fk_category_subs_category` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_category_subs_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `connection_group_members` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `group_id` int(11) NOT NULL,
  `member_user_id` int(11) NOT NULL,
  `added_at` timestamp NULL DEFAULT current_timestamp(),
  `added_by` int(11) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `pymk_opt_out` tinyint(1) DEFAULT 0,
  `notify_messages` tinyint(1) DEFAULT 1,
  `notify_activity` tinyint(1) DEFAULT 1,
  `notify_recommendations` tinyint(1) DEFAULT 1,
  `tab_access` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`tab_access`)),
  `is_muted` tinyint(1) DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_group_member` (`group_id`,`member_user_id`),
  KEY `fk_group_members_added_by` (`added_by`),
  KEY `idx_group_members_member` (`member_user_id`),
  KEY `idx_group_members_group` (`group_id`),
  KEY `idx_group_members_for_pymk` (`member_user_id`,`group_id`,`pymk_opt_out`),
  CONSTRAINT `fk_group_members_added_by` FOREIGN KEY (`added_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_group_members_group` FOREIGN KEY (`group_id`) REFERENCES `connection_groups` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_group_members_member` FOREIGN KEY (`member_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `connection_group_recommendations` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `group_id` int(11) NOT NULL,
  `referral_id` int(11) NOT NULL,
  `recommended_pair_user_a` int(11) NOT NULL,
  `recommended_pair_user_b` int(11) NOT NULL,
  `recommendation_status` enum('pending','connected','dismissed') DEFAULT 'pending',
  `connected_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_group_pair` (`group_id`,`recommended_pair_user_a`,`recommended_pair_user_b`),
  KEY `fk_group_recs_user_a` (`recommended_pair_user_a`),
  KEY `fk_group_recs_user_b` (`recommended_pair_user_b`),
  KEY `idx_group_recs_status` (`group_id`,`recommendation_status`),
  KEY `idx_group_recs_referral` (`referral_id`),
  CONSTRAINT `fk_group_recs_group` FOREIGN KEY (`group_id`) REFERENCES `connection_groups` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_group_recs_user_a` FOREIGN KEY (`recommended_pair_user_a`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_group_recs_user_b` FOREIGN KEY (`recommended_pair_user_b`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `connection_group_templates` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `color` varchar(7) DEFAULT '#3B82F6',
  `icon` varchar(50) DEFAULT 'users',
  `is_quote_pool` tinyint(1) DEFAULT 0,
  `quote_pool_category` varchar(100) DEFAULT NULL,
  `enable_member_recommendations` tinyint(1) DEFAULT 1,
  `recommendation_visibility` enum('all_members','owner_only','none') DEFAULT 'all_members',
  `is_public` tinyint(1) DEFAULT 0,
  `usage_count` int(11) DEFAULT 0,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_is_public` (`is_public`),
  CONSTRAINT `connection_group_templates_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `connection_groups` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `color` varchar(7) DEFAULT '#3B82F6',
  `icon` varchar(50) DEFAULT 'users',
  `is_quote_pool` tinyint(1) DEFAULT 0,
  `quote_pool_category` varchar(100) DEFAULT NULL,
  `enable_member_recommendations` tinyint(1) DEFAULT 1,
  `recommendation_visibility` enum('all_members','owner_only','none') DEFAULT 'all_members',
  `is_archived` tinyint(1) DEFAULT 0,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `allow_member_messages` tinyint(1) DEFAULT 1,
  `message_approval_required` tinyint(1) DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `idx_connection_groups_user` (`user_id`),
  KEY `idx_connection_groups_user_name` (`user_id`,`name`),
  KEY `idx_connection_groups_quote_pool` (`is_quote_pool`,`quote_pool_category`),
  CONSTRAINT `fk_connection_groups_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `connection_request` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `sender_user_id` int(11) NOT NULL,
  `receiver_user_id` int(11) NOT NULL,
  `status` enum('pending','accepted','declined','expired') DEFAULT 'pending',
  `message` text DEFAULT NULL,
  `connection_type` varchar(50) DEFAULT NULL,
  `intent_type` enum('networking','hiring','partnership','mentorship','client_inquiry','personal') DEFAULT 'networking',
  `reason` text DEFAULT NULL,
  `response_message` text DEFAULT NULL,
  `responded_at` timestamp NULL DEFAULT NULL,
  `expires_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_request` (`sender_user_id`,`receiver_user_id`),
  KEY `idx_connection_request_sender` (`sender_user_id`),
  KEY `idx_connection_request_receiver` (`receiver_user_id`),
  KEY `idx_connection_request_status` (`status`),
  KEY `idx_connection_request_expires` (`expires_at`),
  CONSTRAINT `connection_request_ibfk_1` FOREIGN KEY (`sender_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `connection_request_ibfk_2` FOREIGN KEY (`receiver_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `connection_request_templates` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) DEFAULT NULL COMMENT 'NULL = system template',
  `name` varchar(100) NOT NULL COMMENT 'Template name for display',
  `intent_type` enum('networking','hiring','partnership','mentorship','client_inquiry','personal') NOT NULL COMMENT 'Which intent this template is for',
  `connection_type` enum('business','professional','personal') DEFAULT 'professional' COMMENT 'Connection type for this template',
  `message` text NOT NULL COMMENT 'Template message content',
  `is_system` tinyint(1) DEFAULT 0 COMMENT 'System-provided template',
  `is_default` tinyint(1) DEFAULT 0 COMMENT 'Default template for this intent',
  `usage_count` int(11) DEFAULT 0 COMMENT 'How many times used',
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_user_templates` (`user_id`,`intent_type`),
  KEY `idx_system_templates` (`is_system`,`intent_type`),
  CONSTRAINT `connection_request_templates_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `connection_request_tracking` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `requests_today` int(11) DEFAULT 0,
  `requests_this_week` int(11) DEFAULT 0,
  `decline_count` int(11) DEFAULT 0 COMMENT 'Count of declined connection requests',
  `last_request_at` timestamp NULL DEFAULT NULL,
  `cooldown_until` timestamp NULL DEFAULT NULL,
  `reputation_score` decimal(5,2) DEFAULT 50.00,
  `last_reset_daily` timestamp NULL DEFAULT current_timestamp() COMMENT 'Timestamp of last daily counter reset',
  `last_reset_weekly` timestamp NULL DEFAULT current_timestamp() COMMENT 'Timestamp of last weekly counter reset',
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_user` (`user_id`),
  KEY `idx_cooldown` (`cooldown_until`),
  KEY `idx_reputation` (`reputation_score`),
  CONSTRAINT `connection_request_tracking_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `content_affiliate_marketers` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `listing_id` int(11) DEFAULT NULL,
  `display_name` varchar(255) NOT NULL,
  `slug` varchar(255) DEFAULT NULL,
  `profile_image` varchar(500) DEFAULT NULL,
  `cover_image` varchar(500) DEFAULT NULL,
  `headline` varchar(255) DEFAULT NULL,
  `bio` text DEFAULT NULL,
  `location` varchar(255) DEFAULT NULL,
  `niches` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`niches`)),
  `specializations` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`specializations`)),
  `affiliate_networks` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`affiliate_networks`)),
  `commission_range_min` decimal(5,2) DEFAULT NULL,
  `commission_range_max` decimal(5,2) DEFAULT NULL,
  `flat_fee_min` decimal(10,2) DEFAULT NULL,
  `flat_fee_max` decimal(10,2) DEFAULT NULL,
  `audience_size` int(11) DEFAULT 0,
  `audience_demographics` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`audience_demographics`)),
  `platforms` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`platforms`)),
  `website_url` varchar(500) DEFAULT NULL,
  `social_links` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`social_links`)),
  `is_verified` tinyint(4) DEFAULT 0,
  `is_featured` tinyint(4) DEFAULT 0,
  `status` enum('pending','active','suspended','inactive') NOT NULL DEFAULT 'pending',
  `campaign_count` int(11) DEFAULT 0,
  `businesses_helped` int(11) DEFAULT 0,
  `avg_conversion_rate` decimal(5,2) DEFAULT NULL,
  `view_count` int(11) DEFAULT 0,
  `contact_count` int(11) DEFAULT 0,
  `rating_average` decimal(3,2) DEFAULT 0.00,
  `rating_count` int(11) DEFAULT 0,
  `published_at` datetime DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT NULL ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `slug` (`slug`),
  KEY `idx_user` (`user_id`),
  KEY `idx_status` (`status`),
  KEY `idx_featured` (`is_featured`),
  CONSTRAINT `fk_marketer_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `content_articles` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `listing_id` int(10) unsigned DEFAULT NULL COMMENT 'Author listing (FK to listings)',
  `category_id` int(10) unsigned DEFAULT NULL COMMENT 'FK to categories',
  `title` varchar(255) NOT NULL,
  `slug` varchar(255) NOT NULL,
  `excerpt` text DEFAULT NULL COMMENT 'Short summary for cards',
  `content` longtext DEFAULT NULL COMMENT 'Full article content (HTML allowed)',
  `featured_image` varchar(500) DEFAULT NULL COMMENT 'Primary image URL',
  `tags` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Array of tag strings' CHECK (json_valid(`tags`)),
  `reading_time` int(10) unsigned DEFAULT 5 COMMENT 'Estimated reading time in minutes',
  `view_count` int(10) unsigned DEFAULT 0,
  `bookmark_count` int(10) unsigned DEFAULT 0,
  `status` enum('draft','pending','published','archived') DEFAULT 'draft',
  `is_featured` tinyint(1) DEFAULT 0,
  `is_sponsored` tinyint(1) DEFAULT 0,
  `published_at` datetime DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_slug` (`slug`),
  KEY `idx_status` (`status`),
  KEY `idx_category` (`category_id`),
  KEY `idx_listing` (`listing_id`),
  KEY `idx_featured` (`is_featured`),
  KEY `idx_published` (`published_at`),
  KEY `idx_status_featured` (`status`,`is_featured`,`published_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Content articles with full text and media support';
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `content_comments` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `content_type` enum('article','podcast','video') NOT NULL,
  `content_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `parent_id` int(11) DEFAULT NULL,
  `comment_text` text NOT NULL,
  `status` enum('active','hidden','deleted') NOT NULL DEFAULT 'active',
  `is_edited` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_content_lookup` (`content_type`,`content_id`,`status`),
  KEY `idx_user_comments` (`user_id`),
  KEY `idx_parent` (`parent_id`),
  CONSTRAINT `content_comments_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `content_contact_proposals` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `profile_type` enum('affiliate_marketer','internet_personality') NOT NULL,
  `profile_id` int(11) NOT NULL,
  `profile_owner_user_id` int(11) NOT NULL,
  `sender_user_id` int(11) NOT NULL,
  `sender_name` varchar(255) NOT NULL,
  `sender_email` varchar(255) NOT NULL,
  `proposal_type` enum('hire','collaborate','inquiry') NOT NULL DEFAULT 'inquiry',
  `subject` varchar(255) NOT NULL,
  `message` text NOT NULL,
  `budget_range` varchar(100) DEFAULT NULL,
  `timeline` varchar(100) DEFAULT NULL,
  `company_name` varchar(255) DEFAULT NULL,
  `status` enum('pending','read','replied','archived','declined') NOT NULL DEFAULT 'pending',
  `read_at` datetime DEFAULT NULL,
  `replied_at` datetime DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT NULL ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_profile` (`profile_type`,`profile_id`),
  KEY `idx_owner` (`profile_owner_user_id`),
  KEY `idx_sender` (`sender_user_id`),
  KEY `idx_status` (`status`),
  KEY `idx_created` (`created_at`),
  CONSTRAINT `fk_proposal_owner` FOREIGN KEY (`profile_owner_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_proposal_sender` FOREIGN KEY (`sender_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `content_follows` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `follow_type` enum('business','category','content_type','all_content','newsletter','podcast_show','marketer_profile','personality_profile') NOT NULL,
  `target_id` int(11) DEFAULT NULL,
  `content_type_filter` varchar(50) DEFAULT NULL,
  `notification_frequency` enum('realtime','daily','weekly') NOT NULL DEFAULT 'daily',
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT NULL ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_follow` (`user_id`,`follow_type`,`target_id`,`content_type_filter`),
  KEY `idx_user_follows` (`user_id`,`is_active`),
  KEY `idx_target` (`follow_type`,`target_id`),
  CONSTRAINT `fk_content_follows_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `content_guide_progress` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `guide_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `section_id` int(11) DEFAULT NULL,
  `completed_sections` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`completed_sections`)),
  `is_completed` tinyint(4) DEFAULT 0,
  `started_at` datetime DEFAULT NULL,
  `completed_at` datetime DEFAULT NULL,
  `last_accessed_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_user_guide` (`user_id`,`guide_id`),
  KEY `idx_guide` (`guide_id`),
  CONSTRAINT `fk_progress_guide` FOREIGN KEY (`guide_id`) REFERENCES `content_guides` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_progress_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `content_guide_sections` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `guide_id` int(11) NOT NULL,
  `section_number` int(11) NOT NULL,
  `title` varchar(255) NOT NULL,
  `slug` varchar(255) DEFAULT NULL,
  `content` longtext DEFAULT NULL,
  `estimated_time` int(11) DEFAULT NULL,
  `sort_order` int(11) NOT NULL DEFAULT 0,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT NULL ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_guide` (`guide_id`),
  CONSTRAINT `fk_section_guide` FOREIGN KEY (`guide_id`) REFERENCES `content_guides` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `content_guides` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `listing_id` int(11) NOT NULL,
  `title` varchar(255) NOT NULL,
  `slug` varchar(255) DEFAULT NULL,
  `subtitle` varchar(500) DEFAULT NULL,
  `excerpt` text DEFAULT NULL,
  `overview` text DEFAULT NULL,
  `prerequisites` text DEFAULT NULL,
  `featured_image` varchar(500) DEFAULT NULL,
  `category_id` int(11) DEFAULT NULL,
  `tags` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`tags`)),
  `difficulty_level` enum('beginner','intermediate','advanced') DEFAULT 'beginner',
  `estimated_time` int(11) DEFAULT NULL,
  `word_count` int(11) DEFAULT 0,
  `status` enum('draft','published','scheduled','archived') NOT NULL DEFAULT 'draft',
  `is_featured` tinyint(4) DEFAULT 0,
  `view_count` int(11) DEFAULT 0,
  `bookmark_count` int(11) DEFAULT 0,
  `share_count` int(11) DEFAULT 0,
  `completion_count` int(11) DEFAULT 0,
  `version` varchar(20) DEFAULT '1.0',
  `last_reviewed_at` datetime DEFAULT NULL,
  `published_at` datetime DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT NULL ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `slug` (`slug`),
  KEY `idx_listing` (`listing_id`),
  KEY `idx_status` (`status`),
  CONSTRAINT `fk_guide_listing` FOREIGN KEY (`listing_id`) REFERENCES `listings` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `content_internet_personalities` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `listing_id` int(11) DEFAULT NULL,
  `display_name` varchar(255) NOT NULL,
  `slug` varchar(255) DEFAULT NULL,
  `profile_image` varchar(500) DEFAULT NULL,
  `cover_image` varchar(500) DEFAULT NULL,
  `headline` varchar(255) DEFAULT NULL,
  `bio` text DEFAULT NULL,
  `location` varchar(255) DEFAULT NULL,
  `creating_since` year(4) DEFAULT NULL,
  `content_categories` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`content_categories`)),
  `platforms` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`platforms`)),
  `total_reach` int(11) DEFAULT 0,
  `avg_engagement_rate` decimal(5,2) DEFAULT NULL,
  `collaboration_types` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`collaboration_types`)),
  `rate_card` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`rate_card`)),
  `media_kit_url` varchar(500) DEFAULT NULL,
  `management_contact` varchar(255) DEFAULT NULL,
  `website_url` varchar(500) DEFAULT NULL,
  `social_links` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`social_links`)),
  `is_verified` tinyint(4) DEFAULT 0,
  `is_featured` tinyint(4) DEFAULT 0,
  `status` enum('pending','active','suspended','inactive') NOT NULL DEFAULT 'pending',
  `collaboration_count` int(11) DEFAULT 0,
  `view_count` int(11) DEFAULT 0,
  `contact_count` int(11) DEFAULT 0,
  `rating_average` decimal(3,2) DEFAULT 0.00,
  `rating_count` int(11) DEFAULT 0,
  `published_at` datetime DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT NULL ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `slug` (`slug`),
  KEY `idx_user` (`user_id`),
  KEY `idx_status` (`status`),
  CONSTRAINT `fk_personality_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `content_newsletters` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `listing_id` int(11) NOT NULL,
  `title` varchar(255) NOT NULL,
  `slug` varchar(255) DEFAULT NULL,
  `issue_number` int(11) DEFAULT NULL,
  `excerpt` text DEFAULT NULL,
  `web_content` longtext DEFAULT NULL,
  `email_html` longtext DEFAULT NULL,
  `featured_image` varchar(500) DEFAULT NULL,
  `category_id` int(11) DEFAULT NULL,
  `tags` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`tags`)),
  `reading_time` int(11) DEFAULT NULL,
  `status` enum('draft','scheduled','published','archived') NOT NULL DEFAULT 'draft',
  `is_featured` tinyint(4) DEFAULT 0,
  `subscriber_count_at_send` int(11) DEFAULT 0,
  `open_count` int(11) DEFAULT 0,
  `click_count` int(11) DEFAULT 0,
  `view_count` int(11) DEFAULT 0,
  `bookmark_count` int(11) DEFAULT 0,
  `share_count` int(11) DEFAULT 0,
  `scheduled_at` datetime DEFAULT NULL,
  `sent_at` datetime DEFAULT NULL,
  `published_at` datetime DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT NULL ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `slug` (`slug`),
  KEY `idx_listing` (`listing_id`),
  KEY `idx_status` (`status`),
  KEY `idx_published` (`published_at`),
  CONSTRAINT `fk_newsletter_listing` FOREIGN KEY (`listing_id`) REFERENCES `listings` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `content_podcasters` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `listing_id` int(11) DEFAULT NULL,
  `display_name` varchar(255) NOT NULL,
  `slug` varchar(255) DEFAULT NULL,
  `profile_image` varchar(500) DEFAULT NULL,
  `cover_image` varchar(500) DEFAULT NULL,
  `headline` varchar(255) DEFAULT NULL,
  `bio` text DEFAULT NULL,
  `location` varchar(255) DEFAULT NULL,
  `podcast_name` varchar(255) DEFAULT NULL,
  `hosting_platform` varchar(100) DEFAULT NULL,
  `rss_feed_url` varchar(500) DEFAULT NULL,
  `total_episodes` int(11) DEFAULT 0,
  `avg_episode_length` int(11) DEFAULT 0,
  `publishing_frequency` enum('daily','weekly','biweekly','monthly','irregular') DEFAULT 'weekly',
  `genres` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`genres`)),
  `guest_booking_info` text DEFAULT NULL,
  `monetization_methods` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`monetization_methods`)),
  `listener_count` int(11) DEFAULT 0,
  `download_count` int(11) DEFAULT 0,
  `platforms` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`platforms`)),
  `website_url` varchar(500) DEFAULT NULL,
  `social_links` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`social_links`)),
  `is_verified` tinyint(4) DEFAULT 0,
  `is_featured` tinyint(4) DEFAULT 0,
  `status` enum('pending','active','suspended','inactive') NOT NULL DEFAULT 'pending',
  `view_count` int(11) DEFAULT 0,
  `contact_count` int(11) DEFAULT 0,
  `rating_average` decimal(3,2) DEFAULT 0.00,
  `rating_count` int(11) DEFAULT 0,
  `published_at` datetime DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT NULL ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `slug` (`slug`),
  KEY `idx_user` (`user_id`),
  KEY `idx_status` (`status`),
  KEY `idx_featured` (`is_featured`),
  CONSTRAINT `fk_podcaster_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `content_podcasts` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `listing_id` int(10) unsigned DEFAULT NULL COMMENT 'Author listing (FK to listings)',
  `category_id` int(10) unsigned DEFAULT NULL COMMENT 'FK to categories',
  `title` varchar(255) NOT NULL,
  `slug` varchar(255) NOT NULL,
  `description` text DEFAULT NULL COMMENT 'Episode description',
  `thumbnail` varchar(500) DEFAULT NULL COMMENT 'Episode artwork URL',
  `audio_url` varchar(500) NOT NULL COMMENT 'Audio file URL',
  `episode_number` int(10) unsigned DEFAULT NULL,
  `season_number` int(10) unsigned DEFAULT NULL,
  `duration` int(10) unsigned DEFAULT NULL COMMENT 'Duration in seconds',
  `tags` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Array of tag strings' CHECK (json_valid(`tags`)),
  `view_count` int(10) unsigned DEFAULT 0,
  `bookmark_count` int(10) unsigned DEFAULT 0,
  `status` enum('draft','pending','published','archived') DEFAULT 'draft',
  `is_featured` tinyint(1) DEFAULT 0,
  `is_sponsored` tinyint(1) DEFAULT 0,
  `published_at` datetime DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_slug` (`slug`),
  KEY `idx_status` (`status`),
  KEY `idx_category` (`category_id`),
  KEY `idx_listing` (`listing_id`),
  KEY `idx_featured` (`is_featured`),
  KEY `idx_published` (`published_at`),
  KEY `idx_episode` (`season_number`,`episode_number`),
  KEY `idx_status_featured` (`status`,`is_featured`,`published_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Podcast episodes with season/episode tracking';
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `content_ratings` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `content_type` varchar(50) NOT NULL,
  `content_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `title` varchar(255) DEFAULT NULL,
  `rating` int(11) DEFAULT NULL,
  `is_helpful` tinyint(1) DEFAULT NULL,
  `comment` text DEFAULT NULL,
  `images` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`images`)),
  `status` varchar(20) DEFAULT 'approved',
  `helpful_count` int(11) DEFAULT 0,
  `not_helpful_count` int(11) DEFAULT 0,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_user_content` (`user_id`,`content_type`,`content_id`),
  KEY `idx_content` (`content_type`,`content_id`),
  KEY `idx_user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `content_videos` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `listing_id` int(10) unsigned DEFAULT NULL COMMENT 'Author listing (FK to listings)',
  `category_id` int(10) unsigned DEFAULT NULL COMMENT 'FK to categories',
  `title` varchar(255) NOT NULL,
  `slug` varchar(255) NOT NULL,
  `description` text DEFAULT NULL COMMENT 'Video description',
  `thumbnail` varchar(500) DEFAULT NULL COMMENT 'Thumbnail image URL',
  `video_url` varchar(500) NOT NULL COMMENT 'Video URL (YouTube, Vimeo, or direct)',
  `video_type` enum('youtube','vimeo','upload','embed') DEFAULT 'youtube',
  `duration` int(10) unsigned DEFAULT NULL COMMENT 'Duration in seconds',
  `tags` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Array of tag strings' CHECK (json_valid(`tags`)),
  `view_count` int(10) unsigned DEFAULT 0,
  `bookmark_count` int(10) unsigned DEFAULT 0,
  `status` enum('draft','pending','published','archived') DEFAULT 'draft',
  `is_featured` tinyint(1) DEFAULT 0,
  `is_sponsored` tinyint(1) DEFAULT 0,
  `published_at` datetime DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_slug` (`slug`),
  KEY `idx_status` (`status`),
  KEY `idx_category` (`category_id`),
  KEY `idx_listing` (`listing_id`),
  KEY `idx_featured` (`is_featured`),
  KEY `idx_published` (`published_at`),
  KEY `idx_video_type` (`video_type`),
  KEY `idx_status_featured` (`status`,`is_featured`,`published_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Video content with external platform support';
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `cron_job_runs` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `cron_job_id` int(11) NOT NULL,
  `started_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `completed_at` timestamp NULL DEFAULT NULL,
  `duration_ms` int(11) DEFAULT NULL,
  `status` enum('running','success','failure','timeout') NOT NULL DEFAULT 'running',
  `response_status` int(11) DEFAULT NULL COMMENT 'HTTP status code',
  `response_body` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Response data' CHECK (json_valid(`response_body`)),
  `error_message` text DEFAULT NULL COMMENT 'Error details if failed',
  `triggered_by` enum('scheduler','manual','system') NOT NULL DEFAULT 'scheduler',
  `triggered_by_user_id` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_cron_job_id` (`cron_job_id`),
  KEY `idx_started_at` (`started_at`),
  KEY `idx_status` (`status`),
  KEY `fk_cron_job_runs_user` (`triggered_by_user_id`),
  CONSTRAINT `fk_cron_job_runs_job` FOREIGN KEY (`cron_job_id`) REFERENCES `cron_jobs` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_cron_job_runs_user` FOREIGN KEY (`triggered_by_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `cron_jobs` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL COMMENT 'Human-readable job name',
  `slug` varchar(100) NOT NULL COMMENT 'URL-safe unique identifier',
  `description` text DEFAULT NULL COMMENT 'What this job does',
  `endpoint` varchar(255) NOT NULL COMMENT 'API route to call (e.g. /api/admin/jobs/cron/share-reminders)',
  `method` enum('POST','GET') NOT NULL DEFAULT 'POST',
  `schedule` varchar(50) NOT NULL COMMENT 'Cron expression (e.g. 0 10 * * *)',
  `schedule_description` varchar(255) DEFAULT NULL COMMENT 'Human-readable schedule (e.g. Daily at 10am)',
  `auth_type` enum('admin_rbac','cron_secret','none') NOT NULL DEFAULT 'admin_rbac',
  `request_body` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Optional JSON body to send with the request' CHECK (json_valid(`request_body`)),
  `request_headers` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Optional additional headers' CHECK (json_valid(`request_headers`)),
  `is_active` tinyint(1) NOT NULL DEFAULT 1 COMMENT 'Whether the job is enabled',
  `status` enum('implemented','planned','disabled') NOT NULL DEFAULT 'planned',
  `category` varchar(50) NOT NULL DEFAULT 'general' COMMENT 'Job category for grouping',
  `timeout_ms` int(11) NOT NULL DEFAULT 30000 COMMENT 'Request timeout in milliseconds',
  `last_run_at` timestamp NULL DEFAULT NULL,
  `last_run_status` enum('success','failure','timeout') DEFAULT NULL,
  `last_run_duration_ms` int(11) DEFAULT NULL,
  `last_run_result` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Last execution response data' CHECK (json_valid(`last_run_result`)),
  `run_count` int(11) NOT NULL DEFAULT 0,
  `failure_count` int(11) NOT NULL DEFAULT 0,
  `created_by` int(11) DEFAULT NULL,
  `updated_by` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_slug` (`slug`),
  KEY `idx_is_active` (`is_active`),
  KEY `idx_status` (`status`),
  KEY `idx_category` (`category`),
  KEY `fk_cron_jobs_created_by` (`created_by`),
  KEY `fk_cron_jobs_updated_by` (`updated_by`),
  CONSTRAINT `fk_cron_jobs_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_cron_jobs_updated_by` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `discount_codes` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `code` varchar(50) NOT NULL COMMENT 'Discount code (uppercase)',
  `discount_type` enum('percentage','fixed','free_tier_upgrade') NOT NULL,
  `discount_value` decimal(10,2) NOT NULL COMMENT 'Percentage (1-100) or fixed amount',
  `applies_to` enum('all','essentials','plus','preferred','premium') DEFAULT 'all' COMMENT 'Tier restriction',
  `max_uses` int(11) DEFAULT NULL COMMENT 'Max total uses (NULL = unlimited)',
  `current_uses` int(11) DEFAULT 0 COMMENT 'Current usage count',
  `max_uses_per_user` int(11) DEFAULT 1 COMMENT 'Max uses per user',
  `valid_from` timestamp NULL DEFAULT current_timestamp() COMMENT 'Code becomes valid',
  `valid_until` timestamp NULL DEFAULT NULL COMMENT 'Code expires (NULL = no expiration)',
  `is_active` tinyint(1) DEFAULT 1 COMMENT 'Active status',
  `description` text DEFAULT NULL COMMENT 'Internal description',
  `created_by` int(11) NOT NULL COMMENT 'Admin who created code',
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `code` (`code`),
  KEY `created_by` (`created_by`),
  KEY `idx_code` (`code`),
  KEY `idx_active` (`is_active`),
  KEY `idx_validity` (`valid_from`,`valid_until`),
  CONSTRAINT `discount_codes_ibfk_1` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Discount codes and coupons';
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `discount_usage` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `discount_id` int(11) NOT NULL COMMENT 'Reference to discount_codes',
  `user_id` int(11) NOT NULL COMMENT 'User who used the discount',
  `subscription_id` int(11) DEFAULT NULL COMMENT 'Reference to listing_subscriptions if used for subscription',
  `discount_amount` decimal(10,2) NOT NULL COMMENT 'Actual discount amount applied',
  `used_at` timestamp NULL DEFAULT current_timestamp() COMMENT 'When discount was used',
  PRIMARY KEY (`id`),
  KEY `subscription_id` (`subscription_id`),
  KEY `idx_discount` (`discount_id`),
  KEY `idx_user` (`user_id`),
  KEY `idx_used_at` (`used_at`),
  CONSTRAINT `discount_usage_ibfk_1` FOREIGN KEY (`discount_id`) REFERENCES `discount_codes` (`id`) ON DELETE CASCADE,
  CONSTRAINT `discount_usage_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `discount_usage_ibfk_3` FOREIGN KEY (`subscription_id`) REFERENCES `listing_subscriptions` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Discount code usage tracking';
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `email_templates` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `template_key` varchar(100) NOT NULL COMMENT 'welcome, verification, password_reset',
  `template_name` varchar(255) NOT NULL,
  `subject_template` varchar(255) NOT NULL,
  `body_template` text NOT NULL COMMENT 'HTML template with {{placeholders}}',
  `available_variables` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Array of variable names like ["user.name", "verification_link"]' CHECK (json_valid(`available_variables`)),
  `is_active` tinyint(1) DEFAULT 1,
  `is_default` tinyint(1) DEFAULT 0 COMMENT 'Is this the system default?',
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `updated_by` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `template_key` (`template_key`),
  KEY `updated_by` (`updated_by`),
  KEY `idx_key` (`template_key`),
  KEY `idx_active` (`is_active`),
  CONSTRAINT `email_templates_ibfk_1` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `email_verifications` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `user_id` bigint(20) NOT NULL,
  `token_hash` varbinary(32) NOT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `expires_at` datetime(3) NOT NULL,
  `used_at` datetime(3) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `token_hash` (`token_hash`),
  KEY `idx_user_id_expires_at` (`user_id`,`expires_at`),
  KEY `idx_token_hash` (`token_hash`),
  KEY `idx_expires_at` (`expires_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `employer_branding` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `listing_id` int(11) NOT NULL,
  `headline` varchar(255) DEFAULT NULL,
  `tagline` text DEFAULT NULL,
  `company_culture` text DEFAULT NULL,
  `benefits_highlight` text DEFAULT NULL,
  `team_size` varchar(50) DEFAULT NULL,
  `growth_stage` enum('startup','growing','established','enterprise') DEFAULT NULL,
  `hiring_urgency` enum('immediate','ongoing','seasonal','future') DEFAULT 'ongoing',
  `featured_media_url` varchar(500) DEFAULT NULL,
  `cta_text` varchar(100) DEFAULT 'View Open Positions',
  `cta_url` varchar(500) DEFAULT NULL,
  `status` enum('draft','published','archived') DEFAULT 'draft',
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `listing_id` (`listing_id`),
  KEY `idx_status` (`status`),
  KEY `idx_urgency` (`hiring_urgency`),
  CONSTRAINT `employer_branding_ibfk_1` FOREIGN KEY (`listing_id`) REFERENCES `listings` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `engagement_funnel_events` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `entity_type` enum('listing','offer','event','job') NOT NULL,
  `entity_id` int(11) NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `session_id` varchar(100) DEFAULT NULL,
  `stage` enum('impression','page_view','engagement','conversion','follow') NOT NULL,
  `source` enum('search','notification','direct','social','listing','homepage','category','email','sms','share_link') DEFAULT 'direct',
  `utm_source` varchar(100) DEFAULT NULL,
  `utm_medium` varchar(100) DEFAULT NULL,
  `utm_campaign` varchar(100) DEFAULT NULL,
  `utm_content` varchar(100) DEFAULT NULL,
  `metadata` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`metadata`)),
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_funnel_entity` (`entity_type`,`entity_id`),
  KEY `idx_funnel_stage` (`stage`),
  KEY `idx_funnel_source` (`source`),
  KEY `idx_funnel_date` (`created_at`),
  KEY `idx_funnel_user` (`user_id`),
  KEY `idx_funnel_session` (`session_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `entity_media_relationships` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `entity_type` varchar(50) NOT NULL COMMENT 'Entity type: user, listing, offer, event, site',
  `entity_id` int(11) NOT NULL COMMENT 'Foreign key to entity (polymorphic)',
  `media_file_id` int(11) NOT NULL,
  `media_type` enum('logo','cover','gallery','video','document','avatar','banner') NOT NULL,
  `is_primary` tinyint(1) DEFAULT 0 COMMENT 'Primary image for entity',
  `display_order` int(11) DEFAULT 0 COMMENT 'Order in gallery (0 = first)',
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_primary` (`entity_type`,`entity_id`,`media_type`,`is_primary`),
  KEY `media_file_id` (`media_file_id`),
  KEY `idx_entity` (`entity_type`,`entity_id`),
  KEY `idx_media_type` (`media_type`),
  KEY `idx_primary` (`entity_type`,`entity_id`,`is_primary`),
  KEY `idx_order` (`entity_type`,`entity_id`,`display_order`),
  CONSTRAINT `entity_media_relationships_ibfk_1` FOREIGN KEY (`media_file_id`) REFERENCES `media_files` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `error_logs` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `error_type` varchar(100) NOT NULL COMMENT 'TypeError, DatabaseError, ValidationError',
  `error_message` text NOT NULL,
  `stack_trace` text DEFAULT NULL COMMENT 'Full stack trace',
  `request_url` varchar(500) DEFAULT NULL COMMENT 'URL where error occurred',
  `request_method` varchar(10) DEFAULT NULL COMMENT 'GET, POST, PUT, DELETE',
  `user_id` int(11) DEFAULT NULL COMMENT 'User who encountered the error',
  `user_agent` text DEFAULT NULL COMMENT 'Browser user agent',
  `ip_address` varchar(45) DEFAULT NULL COMMENT 'IPv4/IPv6 address',
  `environment` varchar(20) DEFAULT 'production',
  `severity` enum('low','medium','high','critical') DEFAULT 'medium',
  `status` varchar(20) DEFAULT 'unresolved' COMMENT 'unresolved, investigating, resolved',
  `resolved_at` timestamp NULL DEFAULT NULL,
  `resolved_by` int(11) DEFAULT NULL COMMENT 'Admin who resolved',
  `metadata` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Request body, headers, additional context' CHECK (json_valid(`metadata`)),
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_error_type` (`error_type`),
  KEY `idx_severity` (`severity`),
  KEY `idx_status` (`status`),
  KEY `idx_created_at` (`created_at`),
  KEY `idx_environment` (`environment`),
  KEY `user_id` (`user_id`),
  KEY `resolved_by` (`resolved_by`),
  CONSTRAINT `error_logs_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `error_logs_ibfk_2` FOREIGN KEY (`resolved_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Centralized error tracking';
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `event_analytics` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `event_id` int(11) NOT NULL,
  `metric_type` enum('impression','page_view','save','share','external_click') NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `source` enum('search','notification','direct','social','listing','homepage') DEFAULT NULL,
  `platform` varchar(50) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_event_analytics_event` (`event_id`),
  KEY `idx_event_analytics_type` (`metric_type`),
  KEY `idx_event_analytics_date` (`created_at`),
  CONSTRAINT `event_analytics_ibfk_1` FOREIGN KEY (`event_id`) REFERENCES `events` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `event_check_ins` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `event_id` int(11) NOT NULL,
  `rsvp_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `check_in_code` varchar(36) NOT NULL,
  `check_in_method` enum('qr_scan','manual','self') NOT NULL,
  `checked_in_by` int(11) DEFAULT NULL,
  `checked_in_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `notes` text DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_check_in_code` (`check_in_code`),
  UNIQUE KEY `uq_event_rsvp` (`event_id`,`rsvp_id`),
  KEY `idx_check_ins_event` (`event_id`),
  KEY `idx_check_ins_user` (`user_id`),
  KEY `idx_check_ins_rsvp` (`rsvp_id`),
  CONSTRAINT `fk_check_ins_event` FOREIGN KEY (`event_id`) REFERENCES `events` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_check_ins_rsvp` FOREIGN KEY (`rsvp_id`) REFERENCES `event_rsvps` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_check_ins_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `event_co_hosts` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `event_id` int(11) NOT NULL,
  `co_host_listing_id` int(11) NOT NULL,
  `co_host_role` enum('organizer','vendor','performer','exhibitor') NOT NULL DEFAULT 'organizer',
  `display_order` int(11) DEFAULT 0,
  `invitation_message` varchar(500) DEFAULT NULL,
  `status` enum('pending','active','declined','removed') DEFAULT 'pending',
  `invited_by_user_id` int(11) DEFAULT NULL,
  `accepted_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_event_co_host` (`event_id`,`co_host_listing_id`),
  KEY `idx_event_co_hosts_event` (`event_id`),
  KEY `idx_event_co_hosts_listing` (`co_host_listing_id`),
  KEY `idx_event_co_hosts_status` (`status`),
  KEY `idx_event_co_hosts_invited_by` (`invited_by_user_id`),
  CONSTRAINT `event_co_hosts_ibfk_1` FOREIGN KEY (`event_id`) REFERENCES `events` (`id`) ON DELETE CASCADE,
  CONSTRAINT `event_co_hosts_ibfk_2` FOREIGN KEY (`co_host_listing_id`) REFERENCES `listings` (`id`) ON DELETE CASCADE,
  CONSTRAINT `event_co_hosts_ibfk_3` FOREIGN KEY (`invited_by_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `event_exhibitors` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `event_id` int(11) NOT NULL,
  `exhibitor_listing_id` int(11) NOT NULL,
  `booth_number` varchar(50) DEFAULT NULL,
  `booth_size` enum('small','medium','large','premium') DEFAULT 'medium',
  `exhibitor_description` varchar(1000) DEFAULT NULL,
  `exhibitor_logo` varchar(500) DEFAULT NULL,
  `display_order` int(11) DEFAULT 0,
  `invitation_message` varchar(500) DEFAULT NULL,
  `click_count` int(11) DEFAULT 0,
  `impression_count` int(11) DEFAULT 0,
  `status` enum('pending','active','declined','removed') DEFAULT 'pending',
  `invited_by_user_id` int(11) DEFAULT NULL,
  `accepted_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_event_exhibitor` (`event_id`,`exhibitor_listing_id`),
  KEY `idx_event_exhibitors_event` (`event_id`),
  KEY `idx_event_exhibitors_listing` (`exhibitor_listing_id`),
  KEY `idx_event_exhibitors_status` (`status`),
  KEY `idx_event_exhibitors_invited_by` (`invited_by_user_id`),
  CONSTRAINT `event_exhibitors_ibfk_1` FOREIGN KEY (`event_id`) REFERENCES `events` (`id`) ON DELETE CASCADE,
  CONSTRAINT `event_exhibitors_ibfk_2` FOREIGN KEY (`exhibitor_listing_id`) REFERENCES `listings` (`id`) ON DELETE CASCADE,
  CONSTRAINT `event_exhibitors_ibfk_3` FOREIGN KEY (`invited_by_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `event_follows` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `follow_type` enum('business','category','all_events') NOT NULL,
  `target_id` int(11) DEFAULT NULL,
  `notification_frequency` enum('realtime','daily','weekly') DEFAULT 'realtime',
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_event_follow` (`user_id`,`follow_type`,`target_id`),
  CONSTRAINT `event_follows_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `event_media` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `event_id` int(11) NOT NULL,
  `media_type` enum('image','video') NOT NULL,
  `file_url` varchar(500) NOT NULL,
  `sort_order` int(11) DEFAULT 0,
  `alt_text` varchar(255) DEFAULT NULL,
  `embed_url` varchar(500) DEFAULT NULL COMMENT 'Video embed URL (YouTube, Vimeo, etc.)',
  `platform` varchar(50) DEFAULT NULL COMMENT 'Video platform: youtube, vimeo, tiktok, rumble, dailymotion, direct',
  `source` enum('upload','embed') DEFAULT NULL COMMENT 'Media source: upload (file upload) or embed (URL)',
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_event_media_event` (`event_id`),
  KEY `idx_event_media_sort` (`event_id`,`sort_order`),
  CONSTRAINT `event_media_ibfk_1` FOREIGN KEY (`event_id`) REFERENCES `events` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Event media attachments (images + video embeds)';
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `event_reviews` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `event_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `rating` tinyint(4) NOT NULL CHECK (`rating` between 1 and 5),
  `review_text` text DEFAULT NULL,
  `images` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`images`)),
  `is_testimonial_approved` tinyint(1) DEFAULT 0,
  `status` enum('pending','approved','rejected','flagged') DEFAULT 'pending',
  `helpful_count` int(11) NOT NULL DEFAULT 0,
  `not_helpful_count` int(11) NOT NULL DEFAULT 0,
  `owner_response` text DEFAULT NULL,
  `owner_response_date` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_event_review` (`event_id`,`user_id`),
  KEY `user_id` (`user_id`),
  KEY `idx_event_reviews_event` (`event_id`),
  KEY `idx_event_reviews_rating` (`rating`),
  KEY `idx_event_reviews_status` (`status`),
  CONSTRAINT `event_reviews_ibfk_1` FOREIGN KEY (`event_id`) REFERENCES `events` (`id`) ON DELETE CASCADE,
  CONSTRAINT `event_reviews_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `event_rsvps` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `event_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `ticket_id` int(11) DEFAULT NULL,
  `rsvp_status` enum('pending','confirmed','cancelled') DEFAULT 'pending',
  `rsvp_date` timestamp NULL DEFAULT current_timestamp(),
  `attended` tinyint(1) DEFAULT 0,
  `check_in_code` varchar(36) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_user_event` (`user_id`,`event_id`),
  KEY `ticket_id` (`ticket_id`),
  KEY `idx_event` (`event_id`),
  KEY `idx_user` (`user_id`),
  KEY `idx_rsvps_check_in_code` (`check_in_code`),
  CONSTRAINT `event_rsvps_ibfk_1` FOREIGN KEY (`event_id`) REFERENCES `events` (`id`) ON DELETE CASCADE,
  CONSTRAINT `event_rsvps_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `event_rsvps_ibfk_3` FOREIGN KEY (`ticket_id`) REFERENCES `event_tickets` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `event_saves` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `event_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_event_save` (`event_id`,`user_id`),
  KEY `idx_event_saves_user` (`user_id`),
  KEY `idx_event_saves_event` (`event_id`),
  CONSTRAINT `event_saves_ibfk_1` FOREIGN KEY (`event_id`) REFERENCES `events` (`id`) ON DELETE CASCADE,
  CONSTRAINT `event_saves_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `event_service_requests` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `event_id` int(11) NOT NULL,
  `requester_listing_id` int(11) NOT NULL,
  `quote_id` int(11) DEFAULT NULL,
  `service_category` varchar(100) NOT NULL,
  `title` varchar(500) NOT NULL,
  `description` text DEFAULT NULL,
  `required_by_date` date DEFAULT NULL,
  `budget_min` decimal(10,2) DEFAULT NULL,
  `budget_max` decimal(10,2) DEFAULT NULL,
  `priority` enum('low','medium','high','urgent') DEFAULT 'medium',
  `status` enum('draft','open','in_progress','fulfilled','cancelled') DEFAULT 'draft',
  `fulfilled_by_listing_id` int(11) DEFAULT NULL,
  `fulfilled_quote_response_id` int(11) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_by_user_id` int(11) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_event_service_category` (`event_id`,`service_category`),
  KEY `idx_esr_event` (`event_id`),
  KEY `idx_esr_requester` (`requester_listing_id`),
  KEY `idx_esr_quote` (`quote_id`),
  KEY `idx_esr_status` (`status`),
  KEY `idx_esr_fulfilled_by` (`fulfilled_by_listing_id`),
  KEY `idx_esr_created_by` (`created_by_user_id`),
  CONSTRAINT `esr_ibfk_1` FOREIGN KEY (`event_id`) REFERENCES `events` (`id`) ON DELETE CASCADE,
  CONSTRAINT `esr_ibfk_2` FOREIGN KEY (`requester_listing_id`) REFERENCES `listings` (`id`) ON DELETE CASCADE,
  CONSTRAINT `esr_ibfk_3` FOREIGN KEY (`created_by_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `esr_ibfk_4` FOREIGN KEY (`fulfilled_by_listing_id`) REFERENCES `listings` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `event_shares` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `event_id` int(11) NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `share_type` enum('creator','consumer','exhibitor') DEFAULT 'consumer',
  `platform` varchar(50) NOT NULL,
  `share_url` varchar(500) DEFAULT NULL,
  `short_url` varchar(100) DEFAULT NULL,
  `clicks` int(11) DEFAULT 0,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_event_shares_event` (`event_id`),
  CONSTRAINT `event_shares_ibfk_1` FOREIGN KEY (`event_id`) REFERENCES `events` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `event_sponsors` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `event_id` int(11) NOT NULL,
  `sponsor_listing_id` int(11) NOT NULL,
  `sponsor_tier` enum('title','gold','silver','bronze','community') NOT NULL,
  `display_order` int(11) DEFAULT 0,
  `sponsor_logo` varchar(500) DEFAULT NULL,
  `sponsor_message` varchar(500) DEFAULT NULL,
  `click_count` int(11) DEFAULT 0,
  `impression_count` int(11) DEFAULT 0,
  `status` enum('pending','active','expired','cancelled') DEFAULT 'pending',
  `start_date` date DEFAULT NULL,
  `end_date` date DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_event_sponsor` (`event_id`,`sponsor_listing_id`),
  KEY `idx_event_sponsors_event` (`event_id`),
  KEY `idx_event_sponsors_listing` (`sponsor_listing_id`),
  KEY `idx_event_sponsors_status` (`status`),
  CONSTRAINT `event_sponsors_ibfk_1` FOREIGN KEY (`event_id`) REFERENCES `events` (`id`) ON DELETE CASCADE,
  CONSTRAINT `event_sponsors_ibfk_2` FOREIGN KEY (`sponsor_listing_id`) REFERENCES `listings` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `event_ticket_purchases` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `event_id` int(11) NOT NULL,
  `ticket_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `quantity` int(11) NOT NULL DEFAULT 1,
  `unit_price` decimal(10,2) NOT NULL,
  `total_amount` decimal(10,2) NOT NULL,
  `currency` varchar(3) NOT NULL DEFAULT 'usd',
  `stripe_checkout_session_id` varchar(255) DEFAULT NULL,
  `stripe_payment_intent_id` varchar(255) DEFAULT NULL,
  `payment_status` enum('pending','completed','failed','refunded','partially_refunded') NOT NULL DEFAULT 'pending',
  `purchased_at` timestamp NULL DEFAULT NULL,
  `refunded_at` timestamp NULL DEFAULT NULL,
  `refund_amount` decimal(10,2) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_event` (`event_id`),
  KEY `idx_ticket` (`ticket_id`),
  KEY `idx_user` (`user_id`),
  KEY `idx_stripe_session` (`stripe_checkout_session_id`),
  KEY `idx_payment_status` (`payment_status`),
  CONSTRAINT `etp_event_fk` FOREIGN KEY (`event_id`) REFERENCES `events` (`id`) ON DELETE CASCADE,
  CONSTRAINT `etp_ticket_fk` FOREIGN KEY (`ticket_id`) REFERENCES `event_tickets` (`id`) ON DELETE CASCADE,
  CONSTRAINT `etp_user_fk` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `event_tickets` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `event_id` int(11) NOT NULL,
  `ticket_name` varchar(100) NOT NULL,
  `ticket_price` decimal(10,2) NOT NULL,
  `quantity_total` int(11) NOT NULL,
  `quantity_sold` int(11) DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `idx_event` (`event_id`),
  CONSTRAINT `event_tickets_ibfk_1` FOREIGN KEY (`event_id`) REFERENCES `events` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `event_types` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `slug` varchar(100) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `sort_order` int(11) NOT NULL DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `slug` (`slug`),
  KEY `idx_event_types_is_active` (`is_active`),
  KEY `idx_event_types_sort_order` (`sort_order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `event_waitlist` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `event_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `position` int(11) NOT NULL,
  `status` enum('waiting','offered','claimed','expired','cancelled') DEFAULT 'waiting',
  `offered_at` timestamp NULL DEFAULT NULL,
  `claim_deadline` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_event_waitlist_user` (`event_id`,`user_id`),
  KEY `user_id` (`user_id`),
  KEY `idx_event_waitlist_event_status` (`event_id`,`status`),
  KEY `idx_event_waitlist_position` (`event_id`,`position`),
  CONSTRAINT `event_waitlist_ibfk_1` FOREIGN KEY (`event_id`) REFERENCES `events` (`id`) ON DELETE CASCADE,
  CONSTRAINT `event_waitlist_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `events` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `listing_id` int(11) DEFAULT NULL,
  `title` varchar(255) NOT NULL,
  `slug` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `event_type` varchar(50) DEFAULT NULL,
  `start_date` datetime NOT NULL,
  `end_date` datetime NOT NULL,
  `timezone` varchar(50) DEFAULT 'America/New_York',
  `location_type` enum('physical','virtual','hybrid') DEFAULT 'physical',
  `venue_name` varchar(255) DEFAULT NULL,
  `address` varchar(255) DEFAULT NULL,
  `city` varchar(100) DEFAULT NULL,
  `state` varchar(50) DEFAULT NULL,
  `zip` varchar(20) DEFAULT NULL,
  `age_restrictions` varchar(255) DEFAULT NULL,
  `parking_notes` text DEFAULT NULL,
  `weather_contingency` text DEFAULT NULL,
  `latitude` decimal(10,8) DEFAULT NULL COMMENT 'Event latitude (May differ from listing location)',
  `longitude` decimal(10,8) DEFAULT NULL COMMENT 'Event longitude (MAy differ from event location)',
  `virtual_link` varchar(500) DEFAULT NULL,
  `banner_image` varchar(500) DEFAULT NULL,
  `thumbnail` varchar(500) DEFAULT NULL,
  `is_ticketed` tinyint(1) DEFAULT 0,
  `registration_required` tinyint(1) NOT NULL DEFAULT 0 COMMENT 'Whether registration is required (separated from ticketed)',
  `ticket_price` decimal(10,2) DEFAULT NULL,
  `external_ticket_url` varchar(500) DEFAULT NULL,
  `total_capacity` int(11) DEFAULT NULL,
  `remaining_capacity` int(11) DEFAULT NULL,
  `rsvp_count` int(11) DEFAULT 0,
  `status` enum('draft','published','cancelled','completed','pending_moderation') DEFAULT 'draft',
  `is_featured` tinyint(1) DEFAULT 0,
  `waitlist_enabled` tinyint(1) NOT NULL DEFAULT 0,
  `check_in_enabled` tinyint(1) NOT NULL DEFAULT 0,
  `is_hiring_event` tinyint(1) DEFAULT 0,
  `is_mock` tinyint(1) DEFAULT 0,
  `is_community_event` tinyint(1) NOT NULL DEFAULT 0,
  `submitted_by_user_id` int(11) DEFAULT NULL,
  `moderation_notes` text DEFAULT NULL,
  `is_recurring` tinyint(1) NOT NULL DEFAULT 0,
  `recurrence_type` enum('none','daily','weekly','monthly','yearly') DEFAULT 'none',
  `recurrence_days` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`recurrence_days`)),
  `recurrence_end_date` date DEFAULT NULL,
  `parent_event_id` int(11) DEFAULT NULL,
  `series_index` int(11) DEFAULT NULL,
  `view_count` int(11) DEFAULT 0,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `slug` (`slug`),
  KEY `idx_listing` (`listing_id`),
  KEY `idx_slug` (`slug`),
  KEY `idx_status` (`status`),
  KEY `idx_dates` (`start_date`,`end_date`),
  KEY `idx_mock` (`is_mock`),
  KEY `idx_featured` (`is_featured`),
  KEY `idx_location_type` (`location_type`),
  KEY `idx_hiring_event` (`is_hiring_event`),
  KEY `idx_events_community` (`is_community_event`),
  KEY `idx_events_submitted_by` (`submitted_by_user_id`),
  KEY `idx_events_recurring` (`is_recurring`),
  KEY `idx_events_parent` (`parent_event_id`),
  CONSTRAINT `events_ibfk_1` FOREIGN KEY (`listing_id`) REFERENCES `listings` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `export_usage` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `listing_id` int(11) NOT NULL,
  `export_type` enum('claims','analytics') NOT NULL,
  `exported_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `listing_id` (`listing_id`),
  KEY `idx_monthly_usage` (`user_id`,`listing_id`,`exported_at`),
  KEY `idx_user_month` (`user_id`,`exported_at`),
  CONSTRAINT `export_usage_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `export_usage_ibfk_2` FOREIGN KEY (`listing_id`) REFERENCES `listings` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `external_review_sources` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `listing_id` int(11) NOT NULL,
  `provider` varchar(50) NOT NULL,
  `provider_entity_id` varchar(255) NOT NULL,
  `canonical_url` varchar(500) DEFAULT NULL,
  `rating_summary` decimal(3,2) DEFAULT NULL,
  `review_count` int(11) DEFAULT NULL,
  `last_sync_at` timestamp NULL DEFAULT NULL,
  `status` enum('connected','disconnected','error') NOT NULL DEFAULT 'connected',
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_listing_provider` (`listing_id`,`provider`),
  KEY `idx_listing` (`listing_id`),
  KEY `idx_provider` (`provider`),
  KEY `idx_status` (`status`),
  CONSTRAINT `fk_ers_listing` FOREIGN KEY (`listing_id`) REFERENCES `listings` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `feature_flags` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `flag_key` varchar(100) NOT NULL COMMENT 'Unique identifier for the feature flag',
  `name` varchar(255) NOT NULL COMMENT 'Human-readable name',
  `description` text DEFAULT NULL COMMENT 'Description of what this flag controls',
  `is_enabled` tinyint(1) NOT NULL DEFAULT 0 COMMENT 'Whether the flag is currently enabled',
  `rollout_percentage` int(11) NOT NULL DEFAULT 0 COMMENT 'Percentage of users to enable (0-100 for A/B testing)',
  `target_tiers` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Array of tiers this flag applies to (null = all tiers)' CHECK (json_valid(`target_tiers`)),
  `target_user_ids` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Array of specific user IDs to enable for (null = all users)' CHECK (json_valid(`target_user_ids`)),
  `environment` varchar(50) DEFAULT 'production' COMMENT 'Environment: production, staging, development',
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `flag_key` (`flag_key`),
  KEY `idx_flag_key` (`flag_key`),
  KEY `idx_is_enabled` (`is_enabled`),
  KEY `idx_environment` (`environment`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `group_activity` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `group_id` int(11) NOT NULL,
  `actor_user_id` int(11) NOT NULL,
  `activity_type` enum('message_posted','member_added','member_removed','listing_recommended','group_updated','member_joined','member_left') NOT NULL,
  `title` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `metadata` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`metadata`)),
  `target_type` varchar(50) DEFAULT NULL,
  `target_id` int(11) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_group_activity_group` (`group_id`,`created_at` DESC),
  KEY `idx_group_activity_actor` (`actor_user_id`),
  CONSTRAINT `group_activity_ibfk_1` FOREIGN KEY (`group_id`) REFERENCES `connection_groups` (`id`) ON DELETE CASCADE,
  CONSTRAINT `group_activity_ibfk_2` FOREIGN KEY (`actor_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `group_listing_recommendations` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `group_id` int(11) NOT NULL,
  `sender_user_id` int(11) NOT NULL,
  `listing_id` int(11) NOT NULL,
  `message` text DEFAULT NULL,
  `view_count` int(11) DEFAULT 0,
  `click_count` int(11) DEFAULT 0,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `sender_user_id` (`sender_user_id`),
  KEY `idx_group_listing_recs_group` (`group_id`,`created_at` DESC),
  KEY `idx_group_listing_recs_listing` (`listing_id`),
  CONSTRAINT `group_listing_recommendations_ibfk_1` FOREIGN KEY (`group_id`) REFERENCES `connection_groups` (`id`) ON DELETE CASCADE,
  CONSTRAINT `group_listing_recommendations_ibfk_2` FOREIGN KEY (`sender_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `group_listing_recommendations_ibfk_3` FOREIGN KEY (`listing_id`) REFERENCES `listings` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `group_member_departures` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `group_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `reason` text DEFAULT NULL,
  `departed_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `fk_member_departures_user` (`user_id`),
  KEY `idx_member_departures_group` (`group_id`),
  CONSTRAINT `fk_member_departures_group` FOREIGN KEY (`group_id`) REFERENCES `connection_groups` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_member_departures_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `group_member_suggestions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `group_id` int(11) NOT NULL,
  `suggested_by_user_id` int(11) NOT NULL,
  `suggested_user_id` int(11) NOT NULL,
  `message` text DEFAULT NULL,
  `status` enum('pending','approved','denied') DEFAULT 'pending',
  `reviewed_by_user_id` int(11) DEFAULT NULL,
  `reviewed_at` timestamp NULL DEFAULT NULL,
  `review_note` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_group_suggestion` (`group_id`,`suggested_user_id`,`status`),
  KEY `fk_member_suggestions_suggested` (`suggested_user_id`),
  KEY `fk_member_suggestions_reviewed_by` (`reviewed_by_user_id`),
  KEY `idx_member_suggestions_group_status` (`group_id`,`status`),
  KEY `idx_member_suggestions_suggested_by` (`suggested_by_user_id`),
  CONSTRAINT `fk_member_suggestions_group` FOREIGN KEY (`group_id`) REFERENCES `connection_groups` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_member_suggestions_reviewed_by` FOREIGN KEY (`reviewed_by_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_member_suggestions_suggested` FOREIGN KEY (`suggested_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_member_suggestions_suggested_by` FOREIGN KEY (`suggested_by_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `group_message_reactions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `message_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `emoji` varchar(10) NOT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_group_msg_user_emoji` (`message_id`,`user_id`,`emoji`),
  KEY `idx_group_msg_reactions_message` (`message_id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `group_message_reactions_ibfk_1` FOREIGN KEY (`message_id`) REFERENCES `group_messages` (`id`) ON DELETE CASCADE,
  CONSTRAINT `group_message_reactions_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `group_message_reads` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `group_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `last_read_message_id` int(11) NOT NULL,
  `last_read_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_group_user_read` (`group_id`,`user_id`),
  KEY `last_read_message_id` (`last_read_message_id`),
  KEY `idx_group_reads_user` (`user_id`),
  CONSTRAINT `group_message_reads_ibfk_1` FOREIGN KEY (`group_id`) REFERENCES `connection_groups` (`id`) ON DELETE CASCADE,
  CONSTRAINT `group_message_reads_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `group_message_reads_ibfk_3` FOREIGN KEY (`last_read_message_id`) REFERENCES `group_messages` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `group_messages` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `group_id` int(11) NOT NULL,
  `sender_user_id` int(11) NOT NULL,
  `subject` varchar(255) DEFAULT NULL,
  `content` text NOT NULL,
  `content_type` enum('text','html','markdown') DEFAULT 'text',
  `attachments` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`attachments`)),
  `metadata` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`metadata`)),
  `reply_to_id` int(11) DEFAULT NULL,
  `is_pinned` tinyint(1) DEFAULT 0,
  `is_deleted` tinyint(1) DEFAULT 0,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `deleted_by` int(11) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `deleted_by` (`deleted_by`),
  KEY `idx_group_messages_group` (`group_id`,`created_at` DESC),
  KEY `idx_group_messages_sender` (`sender_user_id`),
  KEY `idx_group_messages_pinned` (`group_id`,`is_pinned`,`created_at` DESC),
  KEY `idx_group_messages_reply` (`reply_to_id`),
  CONSTRAINT `group_messages_ibfk_1` FOREIGN KEY (`group_id`) REFERENCES `connection_groups` (`id`) ON DELETE CASCADE,
  CONSTRAINT `group_messages_ibfk_2` FOREIGN KEY (`sender_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `group_messages_ibfk_3` FOREIGN KEY (`deleted_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `health_alert_config` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `enabled` tinyint(1) NOT NULL DEFAULT 1 COMMENT 'Master toggle for health alerts',
  `admin_email` varchar(255) NOT NULL DEFAULT 'bthomasson@ebj-enterprises.com' COMMENT 'Email recipient for alerts',
  `throttle_minutes` int(10) unsigned NOT NULL DEFAULT 5 COMMENT 'Minimum minutes between alerts per service',
  `alert_on_unhealthy` tinyint(1) NOT NULL DEFAULT 1 COMMENT 'Send alerts when service becomes unhealthy',
  `alert_on_recovered` tinyint(1) NOT NULL DEFAULT 1 COMMENT 'Send alerts when service recovers',
  `alert_on_degraded` tinyint(1) NOT NULL DEFAULT 0 COMMENT 'Send alerts for degraded (warning) status',
  `updated_by` int(10) unsigned DEFAULT NULL COMMENT 'Admin user who last updated config',
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Health alert email configuration';
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `health_alert_log` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `service_name` varchar(100) NOT NULL COMMENT 'Name of the service that triggered alert',
  `alert_type` enum('unhealthy','recovered','degraded') NOT NULL COMMENT 'Type of health alert',
  `alert_level` enum('warning','critical') NOT NULL DEFAULT 'critical' COMMENT 'Severity level',
  `email_sent` tinyint(1) NOT NULL DEFAULT 0 COMMENT 'Whether email was successfully sent',
  `recipient_email` varchar(255) NOT NULL COMMENT 'Email address alert was sent to',
  `error_message` text DEFAULT NULL COMMENT 'Error message from unhealthy service',
  `error_component` varchar(100) DEFAULT NULL COMMENT 'Component that failed (pool, cache, etc.)',
  `was_throttled` tinyint(1) NOT NULL DEFAULT 0 COMMENT 'Whether this alert was throttled',
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_service_created` (`service_name`,`created_at`),
  KEY `idx_alert_type` (`alert_type`),
  KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Health alert email audit log';
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `hiring_campaigns` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `listing_id` int(11) NOT NULL,
  `campaign_name` varchar(255) NOT NULL,
  `campaign_type` enum('seasonal','event','blitz','evergreen') NOT NULL DEFAULT 'evergreen',
  `hiring_goal` int(11) DEFAULT NULL,
  `target_roles` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`target_roles`)),
  `target_categories` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`target_categories`)),
  `season` enum('spring','summer','fall','winter','holiday') DEFAULT NULL,
  `start_date` date NOT NULL,
  `end_date` date NOT NULL,
  `budget` decimal(10,2) DEFAULT NULL,
  `status` enum('draft','pending_approval','approved','active','paused','completed','archived') DEFAULT 'draft',
  `approved_by_user_id` int(11) DEFAULT NULL,
  `approved_at` timestamp NULL DEFAULT NULL,
  `performance_metrics` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`performance_metrics`)),
  `notes` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `approved_by_user_id` (`approved_by_user_id`),
  KEY `idx_listing` (`listing_id`),
  KEY `idx_status` (`status`),
  KEY `idx_dates` (`start_date`,`end_date`),
  KEY `idx_season` (`season`),
  CONSTRAINT `hiring_campaigns_ibfk_1` FOREIGN KEY (`listing_id`) REFERENCES `listings` (`id`) ON DELETE CASCADE,
  CONSTRAINT `hiring_campaigns_ibfk_2` FOREIGN KEY (`approved_by_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `hiring_events` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `event_id` int(11) NOT NULL,
  `event_type` enum('job_fair','career_expo','networking','hiring_sprint','webinar','info_session') NOT NULL,
  `participating_listings` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`participating_listings`)),
  `expected_openings` int(11) DEFAULT NULL,
  `featured_roles` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`featured_roles`)),
  `registration_required` tinyint(1) DEFAULT 0,
  `external_registration_url` varchar(500) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_event` (`event_id`),
  KEY `idx_type` (`event_type`),
  CONSTRAINT `hiring_events_ibfk_1` FOREIGN KEY (`event_id`) REFERENCES `events` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `internet_personality_collaborations` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `personality_id` int(11) NOT NULL,
  `brand_name` varchar(255) DEFAULT NULL,
  `brand_logo` varchar(500) DEFAULT NULL,
  `listing_id` int(11) DEFAULT NULL,
  `collaboration_type` varchar(100) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `content_url` varchar(500) DEFAULT NULL,
  `collaboration_date` date DEFAULT NULL,
  `sort_order` int(11) DEFAULT 0,
  `created_at` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_personality` (`personality_id`),
  CONSTRAINT `fk_collab_personality` FOREIGN KEY (`personality_id`) REFERENCES `content_internet_personalities` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `internet_personality_reviews` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `personality_id` int(11) NOT NULL,
  `reviewer_user_id` int(11) NOT NULL,
  `reviewer_listing_id` int(11) DEFAULT NULL,
  `rating` tinyint(4) NOT NULL,
  `review_text` text DEFAULT NULL,
  `images` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`images`)),
  `collaboration_type` varchar(100) DEFAULT NULL,
  `status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  `created_at` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_personality` (`personality_id`),
  KEY `fk_review_ip_user` (`reviewer_user_id`),
  CONSTRAINT `fk_review_ip_user` FOREIGN KEY (`reviewer_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_review_personality` FOREIGN KEY (`personality_id`) REFERENCES `content_internet_personalities` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `job_alert_subscriptions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `alert_type` enum('business','category','employment_type','keyword','all_jobs') NOT NULL,
  `target_id` int(11) DEFAULT NULL COMMENT 'business_id or category_id based on alert_type',
  `keyword_filter` varchar(255) DEFAULT NULL,
  `employment_type_filter` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Array of employment types' CHECK (json_valid(`employment_type_filter`)),
  `location_filter` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT '{city, state, radius_miles}' CHECK (json_valid(`location_filter`)),
  `compensation_min` decimal(10,2) DEFAULT NULL,
  `compensation_max` decimal(10,2) DEFAULT NULL,
  `notification_frequency` enum('realtime','daily','weekly') DEFAULT 'daily',
  `is_active` tinyint(1) DEFAULT 1,
  `last_sent_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_user` (`user_id`),
  KEY `idx_type` (`alert_type`),
  KEY `idx_active` (`is_active`),
  KEY `idx_frequency` (`notification_frequency`),
  CONSTRAINT `job_alert_subscriptions_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='User job alert subscriptions for matching notifications';
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `job_analytics` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `job_id` int(11) NOT NULL,
  `event_type` enum('impression','page_view','save','share','external_click','apply_click') NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `source` enum('search','notification','direct','social','listing','homepage') DEFAULT NULL,
  `referrer` varchar(500) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_job_event` (`job_id`,`event_type`),
  KEY `idx_created` (`created_at`),
  KEY `idx_user` (`user_id`),
  CONSTRAINT `job_analytics_ibfk_1` FOREIGN KEY (`job_id`) REFERENCES `job_postings` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `job_applications` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `job_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `full_name` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `phone` varchar(50) DEFAULT NULL,
  `resume_file_url` varchar(500) DEFAULT NULL,
  `cover_message` text DEFAULT NULL,
  `availability` enum('immediately','within_2_weeks','within_1_month','flexible') DEFAULT NULL,
  `custom_answers` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Answers to job custom_questions' CHECK (json_valid(`custom_answers`)),
  `application_source` enum('direct','social','notification','search','listing') DEFAULT 'direct',
  `status` enum('new','reviewed','contacted','interviewed','hired','declined') DEFAULT 'new',
  `employer_notes` text DEFAULT NULL COMMENT 'Private notes visible only to employer',
  `referred_by_user_id` int(11) DEFAULT NULL,
  `contacted_at` timestamp NULL DEFAULT NULL,
  `interviewed_at` timestamp NULL DEFAULT NULL,
  `status_changed_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_user_job_application` (`user_id`,`job_id`),
  KEY `referred_by_user_id` (`referred_by_user_id`),
  KEY `idx_job` (`job_id`),
  KEY `idx_user` (`user_id`),
  KEY `idx_status` (`status`),
  KEY `idx_created` (`created_at`),
  CONSTRAINT `job_applications_ibfk_1` FOREIGN KEY (`job_id`) REFERENCES `job_postings` (`id`) ON DELETE CASCADE,
  CONSTRAINT `job_applications_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `job_applications_ibfk_3` FOREIGN KEY (`referred_by_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='Native job applications submitted through the platform';
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `job_categories` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `job_id` int(11) NOT NULL,
  `category_id` int(11) NOT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_job_category` (`job_id`,`category_id`),
  KEY `category_id` (`category_id`),
  CONSTRAINT `job_categories_ibfk_1` FOREIGN KEY (`job_id`) REFERENCES `job_postings` (`id`) ON DELETE CASCADE,
  CONSTRAINT `job_categories_ibfk_2` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `job_hire_reports` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `job_id` int(11) NOT NULL,
  `application_id` int(11) DEFAULT NULL COMMENT 'Link to native application if applicable',
  `hire_source` enum('native_application','external','direct','referral') NOT NULL,
  `hired_user_id` int(11) DEFAULT NULL COMMENT 'Bizconekt user if known',
  `hire_date` date NOT NULL,
  `time_to_fill_days` int(11) DEFAULT NULL COMMENT 'Days from posting to hire',
  `salary_or_rate` decimal(10,2) DEFAULT NULL COMMENT 'Optional for analytics',
  `notes` text DEFAULT NULL,
  `reported_by_user_id` int(11) NOT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `application_id` (`application_id`),
  KEY `hired_user_id` (`hired_user_id`),
  KEY `idx_job` (`job_id`),
  KEY `idx_hire_date` (`hire_date`),
  KEY `idx_source` (`hire_source`),
  KEY `idx_reported_by` (`reported_by_user_id`),
  CONSTRAINT `job_hire_reports_ibfk_1` FOREIGN KEY (`job_id`) REFERENCES `job_postings` (`id`) ON DELETE CASCADE,
  CONSTRAINT `job_hire_reports_ibfk_2` FOREIGN KEY (`application_id`) REFERENCES `job_applications` (`id`) ON DELETE SET NULL,
  CONSTRAINT `job_hire_reports_ibfk_3` FOREIGN KEY (`hired_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `job_hire_reports_ibfk_4` FOREIGN KEY (`reported_by_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='Hire reports for analytics funnel completion';
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `job_market_content` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `content_type` enum('trends','salary_guide','skills_report','industry_outlook','hiring_tips') NOT NULL,
  `title` varchar(255) NOT NULL,
  `slug` varchar(300) NOT NULL,
  `summary` text DEFAULT NULL,
  `content` longtext NOT NULL,
  `data_json` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`data_json`)),
  `cover_image_url` varchar(500) DEFAULT NULL,
  `regions` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`regions`)),
  `job_categories` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`job_categories`)),
  `published_date` date DEFAULT NULL,
  `status` enum('draft','pending_review','published','archived') DEFAULT 'draft',
  `author_user_id` int(11) DEFAULT NULL,
  `view_count` int(11) DEFAULT 0,
  `is_featured` tinyint(1) DEFAULT 0,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `slug` (`slug`),
  KEY `author_user_id` (`author_user_id`),
  KEY `idx_content_type` (`content_type`),
  KEY `idx_status` (`status`),
  KEY `idx_published` (`published_date`),
  KEY `idx_featured` (`is_featured`),
  KEY `idx_slug` (`slug`),
  CONSTRAINT `job_market_content_ibfk_1` FOREIGN KEY (`author_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `job_media` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `job_id` int(11) NOT NULL,
  `media_type` enum('image','video') NOT NULL,
  `file_url` varchar(500) NOT NULL,
  `sort_order` int(11) DEFAULT 0,
  `alt_text` varchar(255) DEFAULT NULL,
  `embed_url` varchar(500) DEFAULT NULL COMMENT 'Video embed URL',
  `platform` varchar(50) DEFAULT NULL COMMENT 'Video platform identifier',
  `source` enum('upload','embed') DEFAULT NULL COMMENT 'Media source type',
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_job` (`job_id`),
  CONSTRAINT `job_media_ibfk_1` FOREIGN KEY (`job_id`) REFERENCES `job_postings` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `job_posting_templates` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `template_name` varchar(255) NOT NULL,
  `template_category` enum('restaurant','retail','office','trades','healthcare','agriculture','hospitality','custom') DEFAULT 'custom',
  `employment_type` enum('full_time','part_time','seasonal','temporary','contract','internship','gig') DEFAULT NULL,
  `description_template` text DEFAULT NULL,
  `required_qualifications_template` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`required_qualifications_template`)),
  `preferred_qualifications_template` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`preferred_qualifications_template`)),
  `benefits_defaults` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`benefits_defaults`)),
  `compensation_type` enum('hourly','salary','commission','tips_hourly','stipend','unpaid','competitive') DEFAULT NULL,
  `is_system_template` tinyint(1) DEFAULT 0,
  `business_id` int(11) DEFAULT NULL COMMENT 'NULL for system templates',
  `created_by_user_id` int(11) DEFAULT NULL,
  `usage_count` int(11) DEFAULT 0,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `created_by_user_id` (`created_by_user_id`),
  KEY `idx_business` (`business_id`),
  KEY `idx_system` (`is_system_template`),
  KEY `idx_category` (`template_category`),
  CONSTRAINT `job_posting_templates_ibfk_1` FOREIGN KEY (`business_id`) REFERENCES `listings` (`id`) ON DELETE CASCADE,
  CONSTRAINT `job_posting_templates_ibfk_2` FOREIGN KEY (`created_by_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='Reusable job posting templates for businesses';
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `job_postings` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `business_id` int(11) DEFAULT NULL COMMENT 'NULL for community gigs (Phase 2)',
  `creator_user_id` int(11) NOT NULL,
  `title` varchar(255) NOT NULL,
  `slug` varchar(300) NOT NULL,
  `employment_type` enum('full_time','part_time','seasonal','temporary','contract','internship','gig') NOT NULL,
  `description` text NOT NULL,
  `compensation_type` enum('hourly','salary','commission','tips_hourly','stipend','unpaid','competitive') NOT NULL,
  `compensation_min` decimal(10,2) DEFAULT NULL,
  `compensation_max` decimal(10,2) DEFAULT NULL,
  `compensation_currency` varchar(3) DEFAULT 'USD',
  `work_location_type` enum('onsite','remote','hybrid') NOT NULL DEFAULT 'onsite',
  `address` varchar(500) DEFAULT NULL,
  `city` varchar(100) DEFAULT NULL,
  `state` varchar(100) DEFAULT NULL,
  `zip_code` varchar(20) DEFAULT NULL,
  `latitude` decimal(10,8) DEFAULT NULL,
  `longitude` decimal(11,8) DEFAULT NULL,
  `department` varchar(255) DEFAULT NULL,
  `reports_to` varchar(255) DEFAULT NULL,
  `number_of_openings` int(11) DEFAULT 1,
  `schedule_info` text DEFAULT NULL,
  `start_date` date DEFAULT NULL,
  `application_deadline` date DEFAULT NULL,
  `application_method` enum('external','native') NOT NULL DEFAULT 'external',
  `external_application_url` varchar(500) DEFAULT NULL,
  `benefits` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Array of benefit strings' CHECK (json_valid(`benefits`)),
  `required_qualifications` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Array of qualification strings' CHECK (json_valid(`required_qualifications`)),
  `preferred_qualifications` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Array of qualification strings' CHECK (json_valid(`preferred_qualifications`)),
  `related_event_ids` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Array of linked event IDs' CHECK (json_valid(`related_event_ids`)),
  `related_offer_ids` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Array of linked offer IDs' CHECK (json_valid(`related_offer_ids`)),
  `custom_questions` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Phase 2: Array of max 3 screening questions' CHECK (json_valid(`custom_questions`)),
  `is_featured` tinyint(1) DEFAULT 0,
  `featured_until` timestamp NULL DEFAULT NULL,
  `template_id` int(11) DEFAULT NULL,
  `is_community_gig` tinyint(1) DEFAULT 0 COMMENT 'Phase 2: Community gig posting',
  `agency_posting_for_business_id` int(11) DEFAULT NULL COMMENT 'Phase 3: Agency posting',
  `is_recurring` tinyint(1) DEFAULT 0,
  `recurring_schedule` enum('weekly','biweekly','monthly','quarterly') DEFAULT NULL,
  `next_repost_date` date DEFAULT NULL,
  `moderation_notes` text DEFAULT NULL,
  `schema_generated_at` timestamp NULL DEFAULT NULL COMMENT 'Last Schema.org generation',
  `status` enum('draft','pending_moderation','active','paused','filled','expired','archived') DEFAULT 'draft',
  `view_count` int(11) DEFAULT 0,
  `application_count` int(11) DEFAULT 0,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `contact_email` varchar(255) DEFAULT NULL,
  `contact_phone` varchar(20) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `slug` (`slug`),
  KEY `creator_user_id` (`creator_user_id`),
  KEY `idx_business` (`business_id`),
  KEY `idx_status` (`status`),
  KEY `idx_employment_type` (`employment_type`),
  KEY `idx_location` (`city`,`state`),
  KEY `idx_created` (`created_at`),
  KEY `idx_featured` (`is_featured`,`status`),
  KEY `idx_slug` (`slug`),
  KEY `idx_featured_until` (`featured_until`),
  KEY `idx_recurring` (`is_recurring`,`next_repost_date`),
  KEY `idx_schema` (`schema_generated_at`),
  CONSTRAINT `job_postings_ibfk_1` FOREIGN KEY (`business_id`) REFERENCES `listings` (`id`) ON DELETE SET NULL,
  CONSTRAINT `job_postings_ibfk_2` FOREIGN KEY (`creator_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `job_seeker_profiles` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `headline` varchar(255) DEFAULT NULL,
  `bio` text DEFAULT NULL,
  `skills` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`skills`)),
  `experience_level` enum('entry','junior','mid','senior','lead','executive') DEFAULT 'entry',
  `years_experience` int(11) DEFAULT NULL,
  `resume_file_url` varchar(500) DEFAULT NULL,
  `resume_updated_at` timestamp NULL DEFAULT NULL,
  `employment_preferences` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`employment_preferences`)),
  `availability_date` date DEFAULT NULL,
  `is_actively_looking` tinyint(1) DEFAULT 0,
  `is_discoverable` tinyint(1) DEFAULT 0,
  `preferred_job_categories` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`preferred_job_categories`)),
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_id` (`user_id`),
  KEY `idx_actively_looking` (`is_actively_looking`),
  KEY `idx_discoverable` (`is_discoverable`),
  KEY `idx_experience` (`experience_level`),
  CONSTRAINT `job_seeker_profiles_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `job_shares` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `job_id` int(11) NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `share_type` enum('business_owner','job_seeker','referral') NOT NULL,
  `platform` enum('facebook','instagram','twitter','linkedin','nextdoor','whatsapp','sms','email','copy_link') NOT NULL,
  `share_url` varchar(500) NOT NULL,
  `short_url` varchar(100) DEFAULT NULL,
  `clicks` int(11) DEFAULT 0,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_job` (`job_id`),
  KEY `idx_platform` (`platform`),
  KEY `idx_user` (`user_id`),
  CONSTRAINT `job_shares_ibfk_1` FOREIGN KEY (`job_id`) REFERENCES `job_postings` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `listing_analytics_daily` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `listing_id` int(11) NOT NULL,
  `date` date NOT NULL,
  `impressions` int(11) NOT NULL DEFAULT 0,
  `page_views` int(11) NOT NULL DEFAULT 0,
  `engagements` int(11) NOT NULL DEFAULT 0,
  `conversions` int(11) NOT NULL DEFAULT 0,
  `follows` int(11) NOT NULL DEFAULT 0,
  `shares` int(11) NOT NULL DEFAULT 0,
  `share_clicks` int(11) NOT NULL DEFAULT 0,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_listing_date` (`listing_id`,`date`),
  KEY `idx_listing_analytics_daily_date` (`date`),
  KEY `idx_listing_analytics_daily_listing` (`listing_id`),
  CONSTRAINT `listing_analytics_daily_ibfk_1` FOREIGN KEY (`listing_id`) REFERENCES `listings` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `listing_attachments` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `listing_id` int(11) NOT NULL,
  `filename` varchar(255) NOT NULL COMMENT 'Storage filename',
  `display_name` varchar(255) NOT NULL COMMENT 'User-friendly display name',
  `file_type` varchar(100) DEFAULT NULL COMMENT 'MIME type',
  `file_size` int(11) DEFAULT 0 COMMENT 'File size in bytes',
  `category` varchar(50) DEFAULT 'other' COMMENT 'brochure, menu, catalog, legal, other',
  `download_count` int(11) DEFAULT 0 COMMENT 'Number of downloads',
  `url` text NOT NULL COMMENT 'Full URL to file',
  `alt_text` varchar(255) DEFAULT NULL COMMENT 'SEO alt text',
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_listing_attachments_listing` (`listing_id`),
  KEY `idx_listing_attachments_category` (`category`),
  CONSTRAINT `listing_attachments_ibfk_1` FOREIGN KEY (`listing_id`) REFERENCES `listings` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `listing_claim_verifications` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `claim_id` int(11) NOT NULL,
  `method` enum('email','phone','domain','document','manual') NOT NULL,
  `status` enum('pending','sent','completed','failed','expired') NOT NULL DEFAULT 'pending',
  `verification_code` varchar(10) DEFAULT NULL,
  `code_expires_at` datetime(3) DEFAULT NULL,
  `attempts` int(11) NOT NULL DEFAULT 0,
  `max_attempts` int(11) NOT NULL DEFAULT 5,
  `score` decimal(3,2) DEFAULT NULL,
  `details` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`details`)),
  `completed_at` datetime(3) DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  PRIMARY KEY (`id`),
  KEY `idx_claim_verifications_claim` (`claim_id`),
  KEY `idx_claim_verifications_status` (`status`),
  CONSTRAINT `fk_claim_verifications_claim` FOREIGN KEY (`claim_id`) REFERENCES `listing_claims` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci ROW_FORMAT=DYNAMIC;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `listing_claims` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `listing_id` int(11) NOT NULL,
  `claimant_user_id` int(11) NOT NULL,
  `claim_type` enum('owner','manager','authorized_representative') NOT NULL DEFAULT 'owner',
  `status` enum('initiated','verification_pending','under_review','approved','rejected','expired') NOT NULL DEFAULT 'initiated',
  `verification_score` decimal(3,2) DEFAULT NULL,
  `admin_reviewer_id` int(11) DEFAULT NULL,
  `admin_notes` text DEFAULT NULL,
  `admin_decision_at` datetime(3) DEFAULT NULL,
  `rejection_reason` text DEFAULT NULL,
  `claimant_description` text DEFAULT NULL,
  `expires_at` datetime(3) NOT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updated_at` datetime(3) NOT NULL DEFAULT current_timestamp(3) ON UPDATE current_timestamp(3),
  PRIMARY KEY (`id`),
  KEY `idx_listing_claims_listing` (`listing_id`),
  KEY `idx_listing_claims_user` (`claimant_user_id`),
  KEY `idx_listing_claims_status` (`status`),
  KEY `idx_listing_claims_expires` (`expires_at`),
  KEY `fk_listing_claims_admin` (`admin_reviewer_id`),
  CONSTRAINT `fk_listing_claims_admin` FOREIGN KEY (`admin_reviewer_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_listing_claims_listing` FOREIGN KEY (`listing_id`) REFERENCES `listings` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_listing_claims_user` FOREIGN KEY (`claimant_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci ROW_FORMAT=DYNAMIC;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `listing_inquiries` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `listing_id` int(11) NOT NULL,
  `listing_name` varchar(255) DEFAULT NULL,
  `sender_name` varchar(255) NOT NULL,
  `sender_email` varchar(255) NOT NULL,
  `sender_phone` varchar(50) DEFAULT NULL,
  `message` text NOT NULL,
  `preferred_date` date DEFAULT NULL,
  `inquiry_type` enum('quote_request','general_inquiry') NOT NULL DEFAULT 'general_inquiry',
  `status` enum('pending','responded','closed') NOT NULL DEFAULT 'pending',
  `response_text` text DEFAULT NULL,
  `responded_at` datetime DEFAULT NULL,
  `responded_by` int(11) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_listing_id` (`listing_id`),
  KEY `idx_sender_email` (`sender_email`),
  KEY `idx_inquiry_type` (`inquiry_type`),
  KEY `idx_status` (`status`),
  KEY `idx_created_at` (`created_at`),
  KEY `fk_listing_inquiries_responder` (`responded_by`),
  KEY `idx_listing_status` (`listing_id`,`status`),
  KEY `idx_listing_created` (`listing_id`,`created_at` DESC),
  CONSTRAINT `fk_listing_inquiries_listing` FOREIGN KEY (`listing_id`) REFERENCES `listings` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_listing_inquiries_responder` FOREIGN KEY (`responded_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Contact form submissions and quote requests for listings';
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `listing_leads` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `listing_id` int(11) NOT NULL,
  `user_id` int(11) DEFAULT NULL COMMENT 'Authenticated user who generated the lead (NULL for anonymous)',
  `name` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `phone` varchar(50) DEFAULT NULL,
  `interaction_type` enum('general_inquiry','quote_request','message','appointment','bookmark','contact_click','directions_click') NOT NULL,
  `source` enum('contact_form','bizwire','listing_detail','search_results','share_link','direct','social') NOT NULL DEFAULT 'contact_form',
  `source_url` varchar(500) DEFAULT NULL,
  `message_preview` varchar(500) DEFAULT NULL COMMENT 'First 500 chars of message/inquiry for quick reference',
  `source_record_id` int(11) DEFAULT NULL COMMENT 'ID in source table (listing_inquiries.id or listing_messages.id)',
  `source_record_type` enum('inquiry','message') DEFAULT NULL COMMENT 'Which table source_record_id references',
  `tier_at_capture` enum('essentials','plus','preferred','premium') NOT NULL DEFAULT 'essentials',
  `status` enum('new','contacted','converted','archived') NOT NULL DEFAULT 'new',
  `captured_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_listing_leads_listing` (`listing_id`),
  KEY `idx_listing_leads_captured` (`captured_at`),
  KEY `idx_listing_leads_type` (`interaction_type`),
  KEY `idx_listing_leads_status` (`status`),
  KEY `idx_listing_leads_listing_date` (`listing_id`,`captured_at`),
  CONSTRAINT `listing_leads_ibfk_1` FOREIGN KEY (`listing_id`) REFERENCES `listings` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `listing_memberships` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `listing_id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL COMMENT 'Name of the membership, certification, accolade, or award',
  `type` enum('membership','certification','accolade','award') NOT NULL DEFAULT 'membership',
  `issuer` varchar(255) DEFAULT NULL COMMENT 'Issuing organization name',
  `issuer_url` varchar(500) DEFAULT NULL COMMENT 'URL to issuing organization',
  `issued_date` date DEFAULT NULL COMMENT 'Date the membership/certification was issued',
  `expiry_date` date DEFAULT NULL COMMENT 'Expiry date (NULL = no expiry)',
  `verified` tinyint(1) NOT NULL DEFAULT 0 COMMENT 'Admin-verified badge',
  `logo_url` varchar(500) DEFAULT NULL COMMENT 'Logo/badge image URL',
  `display_order` int(11) NOT NULL DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_listing_memberships_listing` (`listing_id`),
  KEY `idx_listing_memberships_order` (`listing_id`,`display_order`),
  CONSTRAINT `listing_memberships_ibfk_1` FOREIGN KEY (`listing_id`) REFERENCES `listings` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Memberships, certifications, accolades, and awards for business listings';
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `listing_messages` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `listing_id` int(11) NOT NULL,
  `sender_user_id` int(11) NOT NULL,
  `subject` varchar(255) DEFAULT NULL,
  `content` text NOT NULL,
  `message_type` enum('inquiry','quote_request','appointment','feedback','other') DEFAULT 'inquiry',
  `is_read` tinyint(1) DEFAULT 0,
  `read_at` datetime DEFAULT NULL,
  `reply_id` int(11) DEFAULT NULL,
  `thread_id` varchar(100) DEFAULT NULL,
  `status` enum('new','read','replied','archived') DEFAULT 'new',
  `metadata` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`metadata`)),
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `source_page` varchar(100) DEFAULT NULL COMMENT 'Page where contact was initiated (listing_detail, job_detail, etc.)',
  `source_url` varchar(500) DEFAULT NULL COMMENT 'Full URL path of source page',
  PRIMARY KEY (`id`),
  KEY `idx_listing` (`listing_id`),
  KEY `idx_sender` (`sender_user_id`),
  KEY `idx_thread` (`thread_id`),
  KEY `idx_status` (`status`),
  KEY `idx_listing_messages_source` (`source_page`),
  CONSTRAINT `fk_lm_listing` FOREIGN KEY (`listing_id`) REFERENCES `listings` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_lm_sender` FOREIGN KEY (`sender_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `listing_milestones` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `listing_id` int(11) NOT NULL,
  `milestone_type` varchar(50) NOT NULL,
  `threshold` int(11) NOT NULL,
  `achieved_at` timestamp NULL DEFAULT current_timestamp(),
  `notified` tinyint(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_listing_milestone` (`listing_id`,`milestone_type`,`threshold`),
  KEY `idx_milestones_listing` (`listing_id`),
  KEY `idx_milestones_unnotified` (`notified`,`achieved_at`),
  CONSTRAINT `fk_milestones_listing` FOREIGN KEY (`listing_id`) REFERENCES `listings` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `listing_products` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `listing_id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `price` decimal(10,2) DEFAULT NULL,
  `price_display` varchar(100) DEFAULT NULL COMMENT 'Custom price text (e.g., "Starting at $99")',
  `image_url` varchar(500) DEFAULT NULL,
  `category` varchar(100) DEFAULT NULL,
  `sku` varchar(100) DEFAULT NULL,
  `is_featured` tinyint(1) DEFAULT 0,
  `is_visible` tinyint(1) DEFAULT 1,
  `display_order` int(11) DEFAULT 0,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_listing_id` (`listing_id`),
  KEY `idx_visible` (`is_visible`),
  KEY `idx_featured` (`is_featured`),
  KEY `idx_display_order` (`display_order`),
  KEY `idx_category` (`category`),
  CONSTRAINT `fk_products_listing` FOREIGN KEY (`listing_id`) REFERENCES `listings` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `listing_projects` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `listing_id` int(11) NOT NULL,
  `title` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `image_url` varchar(500) DEFAULT NULL,
  `gallery_images` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Array of additional image URLs' CHECK (json_valid(`gallery_images`)),
  `project_date` date DEFAULT NULL,
  `client_name` varchar(255) DEFAULT NULL,
  `category` varchar(100) DEFAULT NULL,
  `tags` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Array of project tags' CHECK (json_valid(`tags`)),
  `is_featured` tinyint(1) DEFAULT 0,
  `is_visible` tinyint(1) DEFAULT 1,
  `display_order` int(11) DEFAULT 0,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_listing_id` (`listing_id`),
  KEY `idx_visible` (`is_visible`),
  KEY `idx_featured` (`is_featured`),
  KEY `idx_display_order` (`display_order`),
  KEY `idx_category` (`category`),
  CONSTRAINT `fk_projects_listing` FOREIGN KEY (`listing_id`) REFERENCES `listings` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `listing_share_clicks` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `listing_share_id` int(11) NOT NULL,
  `listing_id` int(11) NOT NULL,
  `referrer_url` varchar(500) DEFAULT NULL,
  `user_agent` varchar(500) DEFAULT NULL,
  `ip_hash` varchar(64) DEFAULT NULL,
  `resulted_in_signup` tinyint(1) NOT NULL DEFAULT 0,
  `resulted_in_contact` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_listing_share_clicks_share` (`listing_share_id`),
  KEY `idx_listing_share_clicks_listing` (`listing_id`),
  CONSTRAINT `listing_share_clicks_ibfk_1` FOREIGN KEY (`listing_share_id`) REFERENCES `listing_shares` (`id`) ON DELETE CASCADE,
  CONSTRAINT `listing_share_clicks_ibfk_2` FOREIGN KEY (`listing_id`) REFERENCES `listings` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `listing_shares` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `listing_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `share_type` enum('business_owner','consumer') NOT NULL,
  `platform` enum('facebook','instagram','twitter','linkedin','nextdoor','whatsapp','sms','email','copy_link') NOT NULL,
  `share_url` varchar(500) NOT NULL,
  `short_url` varchar(100) DEFAULT NULL,
  `clicks` int(11) NOT NULL DEFAULT 0,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_listing_shares_listing` (`listing_id`),
  KEY `idx_listing_shares_user` (`user_id`),
  KEY `idx_listing_shares_platform` (`platform`),
  CONSTRAINT `listing_shares_ibfk_1` FOREIGN KEY (`listing_id`) REFERENCES `listings` (`id`) ON DELETE CASCADE,
  CONSTRAINT `listing_shares_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `listing_subscription_addons` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `listing_subscription_id` int(11) NOT NULL,
  `addon_suite_id` int(11) NOT NULL,
  `started_at` timestamp NOT NULL,
  `renews_at` timestamp NULL DEFAULT NULL,
  `status` enum('active','cancelled','expired') DEFAULT 'active',
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_subscription` (`listing_subscription_id`),
  KEY `idx_addon` (`addon_suite_id`),
  CONSTRAINT `listing_subscription_addons_ibfk_1` FOREIGN KEY (`listing_subscription_id`) REFERENCES `listing_subscriptions` (`id`) ON DELETE CASCADE,
  CONSTRAINT `listing_subscription_addons_ibfk_2` FOREIGN KEY (`addon_suite_id`) REFERENCES `addon_suites` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `listing_subscriptions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `listing_id` int(11) NOT NULL,
  `plan_id` int(11) NOT NULL,
  `plan_version` varchar(50) NOT NULL,
  `started_at` timestamp NOT NULL,
  `renews_at` timestamp NULL DEFAULT NULL,
  `is_grandfathered` tinyint(1) DEFAULT 0,
  `override_features` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`override_features`)),
  `status` enum('active','cancelled','expired','suspended') DEFAULT 'active',
  `stripe_subscription_id` varchar(255) DEFAULT NULL,
  `stripe_price_id` varchar(255) DEFAULT NULL,
  `next_billing_date` date DEFAULT NULL,
  `failed_payment_count` int(11) NOT NULL DEFAULT 0,
  `pending_tier_change` varchar(20) DEFAULT NULL,
  `billing_cycle` enum('monthly','annual') DEFAULT 'monthly',
  `cancel_at_period_end` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_stripe_subscription` (`stripe_subscription_id`),
  KEY `idx_listing` (`listing_id`),
  KEY `idx_plan` (`plan_id`),
  KEY `idx_status` (`status`),
  CONSTRAINT `listing_subscriptions_ibfk_1` FOREIGN KEY (`listing_id`) REFERENCES `listings` (`id`) ON DELETE CASCADE,
  CONSTRAINT `listing_subscriptions_ibfk_2` FOREIGN KEY (`plan_id`) REFERENCES `subscription_plans` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `listing_team_members` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `listing_id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `role` varchar(100) DEFAULT NULL,
  `bio` text DEFAULT NULL,
  `photo_url` varchar(500) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `phone` varchar(50) DEFAULT NULL,
  `social_links` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`social_links`)),
  `display_order` int(11) DEFAULT 0,
  `is_visible` tinyint(1) DEFAULT 1,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_listing` (`listing_id`),
  CONSTRAINT `fk_team_listing` FOREIGN KEY (`listing_id`) REFERENCES `listings` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `listing_templates` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `industry` enum('restaurant','retail','professional_services','home_services','healthcare','automotive','beauty_salon','fitness','real_estate','technology','education','entertainment','custom') DEFAULT 'custom',
  `description` text DEFAULT NULL COMMENT 'Template description shown in selector',
  `default_type` varchar(50) DEFAULT NULL COMMENT 'Pre-filled listing type value',
  `default_tier` enum('essentials','plus','preferred','premium') DEFAULT NULL COMMENT 'Suggested tier',
  `template_fields` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT '{"description":"...","keywords":["..."],"hours":{...}}' CHECK (json_valid(`template_fields`)),
  `example_content` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Example data for preview in selector' CHECK (json_valid(`example_content`)),
  `icon` varchar(50) DEFAULT NULL COMMENT 'Lucide icon name for template card',
  `is_system` tinyint(1) DEFAULT 0 COMMENT 'System templates visible to all users',
  `business_id` int(11) DEFAULT NULL COMMENT 'NULL for system templates, listing_id for custom',
  `created_by_user_id` int(11) DEFAULT NULL,
  `usage_count` int(11) DEFAULT 0,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `created_by_user_id` (`created_by_user_id`),
  KEY `idx_system` (`is_system`),
  KEY `idx_industry` (`industry`),
  KEY `idx_business` (`business_id`),
  KEY `idx_active` (`is_active`),
  CONSTRAINT `listing_templates_ibfk_1` FOREIGN KEY (`business_id`) REFERENCES `listings` (`id`) ON DELETE CASCADE,
  CONSTRAINT `listing_templates_ibfk_2` FOREIGN KEY (`created_by_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='Industry-specific listing templates for creation flow';
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `listing_testimonials` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `listing_id` int(11) NOT NULL,
  `author_name` varchar(255) NOT NULL,
  `author_title` varchar(255) DEFAULT NULL,
  `author_photo_url` varchar(500) DEFAULT NULL,
  `testimonial` text NOT NULL,
  `rating` tinyint(3) unsigned DEFAULT NULL COMMENT '1-5 star rating',
  `date` date DEFAULT NULL COMMENT 'Date of testimonial',
  `is_featured` tinyint(1) DEFAULT 0,
  `is_visible` tinyint(1) DEFAULT 1,
  `display_order` int(11) DEFAULT 0,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_listing_id` (`listing_id`),
  KEY `idx_visible` (`is_visible`),
  KEY `idx_featured` (`is_featured`),
  KEY `idx_display_order` (`display_order`),
  CONSTRAINT `fk_testimonials_listing` FOREIGN KEY (`listing_id`) REFERENCES `listings` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `listing_users` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `listing_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `role` enum('owner','manager','user') NOT NULL DEFAULT 'user',
  `permissions` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Granular permissions for user role' CHECK (json_valid(`permissions`)),
  `invited_by` int(11) DEFAULT NULL,
  `invited_at` timestamp NULL DEFAULT NULL,
  `accepted_at` timestamp NULL DEFAULT NULL,
  `status` enum('pending','active','suspended','removed') DEFAULT 'pending',
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_listing_user` (`listing_id`,`user_id`),
  KEY `fk_listing_users_invited_by` (`invited_by`),
  KEY `idx_listing_users_listing` (`listing_id`),
  KEY `idx_listing_users_user` (`user_id`),
  KEY `idx_listing_users_role` (`role`),
  KEY `idx_listing_users_status` (`status`),
  CONSTRAINT `fk_listing_users_invited_by` FOREIGN KEY (`invited_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_listing_users_listing` FOREIGN KEY (`listing_id`) REFERENCES `listings` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_listing_users_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Multi-user listing permissions with role-based access';
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `listings` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) DEFAULT NULL COMMENT 'Owner user ID - NULL for unclaimed listings',
  `name` varchar(255) NOT NULL,
  `slug` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `type` varchar(100) NOT NULL COMMENT 'From types table (Business, Non-Profit, etc.)',
  `year_established` year(4) DEFAULT NULL,
  `employee_count` int(11) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `phone` varchar(50) DEFAULT NULL,
  `website` varchar(500) DEFAULT NULL,
  `address` varchar(500) DEFAULT NULL,
  `city` varchar(100) DEFAULT NULL,
  `state` varchar(50) DEFAULT NULL,
  `zip_code` varchar(20) DEFAULT NULL,
  `country` varchar(2) DEFAULT 'US',
  `latitude` decimal(10,8) DEFAULT NULL,
  `longitude` decimal(11,8) DEFAULT NULL,
  `category_id` int(11) DEFAULT NULL,
  `active_categories` longtext DEFAULT NULL,
  `logo_url` text DEFAULT NULL COMMENT 'Can be URL or base64 data URI',
  `cover_image_url` text DEFAULT NULL COMMENT 'Can be URL or base64 data URI',
  `gallery_images` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Array of image URLs' CHECK (json_valid(`gallery_images`)),
  `video_gallery` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT '[]' CHECK (json_valid(`video_gallery`)),
  `video_url` text DEFAULT NULL,
  `audio_url` text DEFAULT NULL,
  `business_hours` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Array of {day, open, close}' CHECK (json_valid(`business_hours`)),
  `social_media` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT '{twitter, facebook, linkedin, instagram}' CHECK (json_valid(`social_media`)),
  `features` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Array of feature strings' CHECK (json_valid(`features`)),
  `amenities` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Array of amenity strings' CHECK (json_valid(`amenities`)),
  `tier` enum('essentials','plus','preferred','premium') DEFAULT 'essentials',
  `add_ons` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Array of purchased add-ons' CHECK (json_valid(`add_ons`)),
  `claimed` tinyint(1) DEFAULT 0,
  `status` varchar(50) DEFAULT 'active',
  `approved` varchar(50) DEFAULT 'pending',
  `rejection_reason` text DEFAULT NULL,
  `admin_reviewer_id` int(11) DEFAULT NULL,
  `admin_notes` text DEFAULT NULL,
  `admin_decision_at` timestamp NULL DEFAULT NULL,
  `meta_title` varchar(255) DEFAULT NULL,
  `meta_description` varchar(500) DEFAULT NULL,
  `meta_keywords` text DEFAULT NULL,
  `custom_fields` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'User-defined custom fields' CHECK (json_valid(`custom_fields`)),
  `metadata` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'System metadata (timezone, owner info, etc.)' CHECK (json_valid(`metadata`)),
  `contact_name` varchar(255) DEFAULT NULL,
  `contact_email` varchar(255) DEFAULT NULL,
  `contact_phone` varchar(50) DEFAULT NULL,
  `annual_revenue` decimal(15,2) DEFAULT NULL,
  `certifications` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Array of certification strings' CHECK (json_valid(`certifications`)),
  `languages_spoken` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Array of language strings' CHECK (json_valid(`languages_spoken`)),
  `payment_methods` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Array of payment method strings' CHECK (json_valid(`payment_methods`)),
  `view_count` int(11) DEFAULT 0,
  `click_count` int(11) DEFAULT 0,
  `favorite_count` int(11) DEFAULT 0,
  `import_source` varchar(100) DEFAULT NULL,
  `import_date` timestamp NULL DEFAULT NULL,
  `import_batch_id` varchar(100) DEFAULT NULL,
  `mock` tinyint(1) DEFAULT 0 COMMENT 'Is this a mock/sample listing',
  `keywords` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'SEO keywords array' CHECK (json_valid(`keywords`)),
  `slogan` varchar(500) DEFAULT NULL,
  `date_created` timestamp NULL DEFAULT current_timestamp(),
  `last_update` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `bank_categories` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Banked categories for quick swap (max 24 total with active)' CHECK (json_valid(`bank_categories`)),
  `section_layout` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`section_layout`)),
  `gallery_layout` enum('grid','masonry','carousel','justified') DEFAULT 'grid' COMMENT 'User-selected gallery display layout preference',
  `video_gallery_layout` enum('grid','masonry','carousel','inline','showcase') DEFAULT 'grid',
  `combine_video_gallery` tinyint(1) NOT NULL DEFAULT 0,
  `hours_status` varchar(20) NOT NULL DEFAULT 'timetable' COMMENT 'timetable | 24-7 | closed',
  `timezone` varchar(50) NOT NULL DEFAULT 'America/New_York',
  `is_featured` tinyint(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `slug` (`slug`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_category_id` (`category_id`),
  KEY `idx_type` (`type`),
  KEY `idx_tier` (`tier`),
  KEY `idx_status` (`status`),
  KEY `idx_slug` (`slug`),
  KEY `idx_city` (`city`),
  KEY `idx_state` (`state`),
  KEY `idx_zip_code` (`zip_code`),
  KEY `idx_mock` (`mock`),
  KEY `idx_claimed` (`claimed`),
  KEY `idx_listings_admin_reviewer` (`admin_reviewer_id`),
  KEY `idx_listings_admin_decision_at` (`admin_decision_at`),
  KEY `idx_listings_is_featured` (`is_featured`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `media_files` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `storage_type` enum('local','cloudinary') NOT NULL DEFAULT 'cloudinary',
  `path` varchar(500) NOT NULL COMMENT 'Relative path (local) or public_id (cloudinary)',
  `url` varchar(1000) NOT NULL COMMENT 'Public URL for access',
  `cloudinary_public_id` varchar(500) DEFAULT NULL,
  `file_type` varchar(50) NOT NULL COMMENT 'MIME type: image/jpeg, video/mp4, etc.',
  `file_size` int(11) NOT NULL COMMENT 'File size in bytes',
  `width` int(11) DEFAULT NULL COMMENT 'Image/video width in pixels',
  `height` int(11) DEFAULT NULL COMMENT 'Image/video height in pixels',
  `metadata` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Additional Cloudinary metadata' CHECK (json_valid(`metadata`)),
  `is_mock` tinyint(1) DEFAULT 0,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `alt_text` varchar(255) DEFAULT NULL COMMENT 'SEO alt text for accessibility and search',
  `title_text` varchar(60) DEFAULT NULL COMMENT 'SEO title/tooltip text',
  `seo_filename` varchar(255) DEFAULT NULL COMMENT 'SEO-optimized filename',
  PRIMARY KEY (`id`),
  KEY `idx_storage_type` (`storage_type`),
  KEY `idx_cloudinary_id` (`cloudinary_public_id`),
  KEY `idx_mock` (`is_mock`),
  KEY `idx_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `media_type` (
  `id` int(11) NOT NULL DEFAULT 0,
  `name` varchar(100) NOT NULL,
  `slug` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `icon` varchar(50) DEFAULT NULL,
  `color` varchar(7) DEFAULT NULL,
  `is_system` tinyint(1) DEFAULT 0,
  `is_active` tinyint(1) DEFAULT 1,
  `metadata` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`metadata`)),
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `message_reactions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `message_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `emoji` varchar(10) NOT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_message_user_emoji` (`message_id`,`user_id`,`emoji`),
  KEY `idx_message_reactions_message` (`message_id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `message_reactions_ibfk_1` FOREIGN KEY (`message_id`) REFERENCES `user_message` (`id`) ON DELETE CASCADE,
  CONSTRAINT `message_reactions_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `monthly_statements` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `statement_month` varchar(7) NOT NULL,
  `subscription_charges` decimal(10,2) NOT NULL DEFAULT 0.00,
  `addon_charges` decimal(10,2) NOT NULL DEFAULT 0.00,
  `campaign_bank_deposits` decimal(10,2) NOT NULL DEFAULT 0.00,
  `campaign_bank_spend` decimal(10,2) NOT NULL DEFAULT 0.00,
  `refunds` decimal(10,2) NOT NULL DEFAULT 0.00,
  `credits` decimal(10,2) NOT NULL DEFAULT 0.00,
  `adjustments` decimal(10,2) NOT NULL DEFAULT 0.00,
  `total_charges` decimal(10,2) NOT NULL DEFAULT 0.00,
  `opening_balance` decimal(10,2) NOT NULL DEFAULT 0.00,
  `closing_balance` decimal(10,2) NOT NULL DEFAULT 0.00,
  `amount_paid` decimal(10,2) NOT NULL DEFAULT 0.00,
  `amount_due` decimal(10,2) NOT NULL DEFAULT 0.00,
  `status` enum('draft','sent','paid') NOT NULL DEFAULT 'draft',
  `pdf_url` varchar(500) DEFAULT NULL,
  `pdf_generated_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_user_month` (`user_id`,`statement_month`),
  KEY `idx_user` (`user_id`),
  KEY `idx_month` (`statement_month`),
  KEY `idx_status` (`status`),
  CONSTRAINT `ms_user_fk` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `newsletter_analytics` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `newsletter_id` int(11) NOT NULL,
  `event_type` enum('open','click','page_view','share','bookmark') NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `subscriber_id` int(11) DEFAULT NULL,
  `link_url` varchar(2000) DEFAULT NULL,
  `source` enum('email','web','direct','social') DEFAULT 'email',
  `user_agent` varchar(500) DEFAULT NULL,
  `ip_hash` varchar(64) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_newsletter` (`newsletter_id`),
  KEY `idx_event_type` (`event_type`),
  KEY `idx_created` (`created_at`),
  KEY `idx_newsletter_event` (`newsletter_id`,`event_type`),
  CONSTRAINT `fk_na_newsletter` FOREIGN KEY (`newsletter_id`) REFERENCES `content_newsletters` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `newsletter_subscribers` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `listing_id` int(11) NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `email` varchar(255) NOT NULL,
  `name` varchar(255) DEFAULT NULL,
  `status` enum('pending','active','unsubscribed','bounced') NOT NULL DEFAULT 'pending',
  `confirmation_token` varchar(255) DEFAULT NULL,
  `subscribed_at` datetime DEFAULT NULL,
  `unsubscribed_at` datetime DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_subscriber` (`listing_id`,`email`),
  KEY `idx_listing_status` (`listing_id`,`status`),
  CONSTRAINT `fk_subscriber_listing` FOREIGN KEY (`listing_id`) REFERENCES `listings` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `notification_admin_config` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `config_key` varchar(100) NOT NULL,
  `config_value` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`config_value`)),
  `description` varchar(500) DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `updated_by` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `config_key` (`config_key`),
  KEY `idx_key` (`config_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `notification_dispatch_metrics` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `timestamp` datetime NOT NULL,
  `period_minutes` int(11) NOT NULL DEFAULT 1,
  `dispatched_count` int(11) NOT NULL DEFAULT 0,
  `delivered_count` int(11) NOT NULL DEFAULT 0,
  `failed_count` int(11) NOT NULL DEFAULT 0,
  `avg_latency_ms` int(11) NOT NULL DEFAULT 0,
  `p95_latency_ms` int(11) NOT NULL DEFAULT 0,
  `p99_latency_ms` int(11) NOT NULL DEFAULT 0,
  `in_app_count` int(11) NOT NULL DEFAULT 0,
  `push_count` int(11) NOT NULL DEFAULT 0,
  `email_count` int(11) NOT NULL DEFAULT 0,
  `event_type_counts` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`event_type_counts`)),
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_timestamp_period` (`timestamp`,`period_minutes`),
  KEY `idx_timestamp` (`timestamp`),
  KEY `idx_period_timestamp` (`period_minutes`,`timestamp`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `notification_email_logs` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `notification_id` int(11) DEFAULT NULL,
  `email_type` enum('immediate','digest') NOT NULL,
  `event_type` varchar(100) DEFAULT NULL,
  `recipient_email` varchar(255) NOT NULL,
  `subject` varchar(255) NOT NULL,
  `status` enum('sent','failed','bounced') DEFAULT 'sent',
  `provider` varchar(50) DEFAULT NULL,
  `error_message` text DEFAULT NULL,
  `sent_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `notification_id` (`notification_id`),
  KEY `idx_user_emails` (`user_id`,`sent_at`),
  KEY `idx_status` (`status`,`sent_at`),
  CONSTRAINT `notification_email_logs_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `notification_email_logs_ibfk_2` FOREIGN KEY (`notification_id`) REFERENCES `user_notifications` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `notification_email_queue` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `notification_id` int(11) NOT NULL,
  `event_type` varchar(100) NOT NULL,
  `category` varchar(50) NOT NULL,
  `title` varchar(255) NOT NULL,
  `message` text DEFAULT NULL,
  `action_url` varchar(500) DEFAULT NULL,
  `priority` enum('low','normal','high','urgent') DEFAULT 'normal',
  `digest_frequency` enum('daily','weekly') NOT NULL,
  `scheduled_for` date NOT NULL,
  `processed_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `notification_id` (`notification_id`),
  KEY `idx_pending_digests` (`scheduled_for`,`processed_at`),
  KEY `idx_user_pending` (`user_id`,`scheduled_for`,`processed_at`),
  CONSTRAINT `notification_email_queue_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `notification_email_queue_ibfk_2` FOREIGN KEY (`notification_id`) REFERENCES `user_notifications` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `notification_push_logs` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `notification_id` int(11) DEFAULT NULL,
  `user_id` int(11) NOT NULL,
  `device_id` int(11) DEFAULT NULL,
  `device_token` varchar(500) DEFAULT NULL,
  `status` enum('sent','delivered','failed','invalid_token') NOT NULL,
  `fcm_message_id` varchar(255) DEFAULT NULL,
  `error_code` varchar(100) DEFAULT NULL,
  `error_message` text DEFAULT NULL,
  `latency_ms` int(11) DEFAULT NULL,
  `payload_type` varchar(100) DEFAULT NULL,
  `sent_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_status` (`status`),
  KEY `idx_sent_at` (`sent_at`),
  KEY `idx_notification_id` (`notification_id`),
  KEY `idx_device_id` (`device_id`),
  KEY `idx_status_sent` (`status`,`sent_at`),
  CONSTRAINT `notification_push_logs_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `notification_push_logs_ibfk_2` FOREIGN KEY (`device_id`) REFERENCES `user_push_devices` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `notification_schedule` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `entity_type` varchar(50) NOT NULL,
  `entity_id` int(11) NOT NULL,
  `notification_type` varchar(50) NOT NULL,
  `scheduled_at` timestamp NOT NULL,
  `sent_at` timestamp NULL DEFAULT NULL,
  `cancelled_at` timestamp NULL DEFAULT NULL,
  `metadata` longtext DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_schedule_user` (`user_id`),
  KEY `idx_schedule_entity` (`entity_type`,`entity_id`),
  KEY `idx_schedule_pending` (`scheduled_at`,`sent_at`),
  KEY `idx_schedule_type` (`notification_type`),
  CONSTRAINT `fk_schedule_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `notification_unsubscribe_tokens` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `token_hash` varchar(64) NOT NULL,
  `category` varchar(50) DEFAULT NULL,
  `expires_at` timestamp NOT NULL,
  `consumed_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `token_hash` (`token_hash`),
  KEY `idx_token` (`token_hash`),
  KEY `idx_user_tokens` (`user_id`,`expires_at`),
  CONSTRAINT `notification_unsubscribe_tokens_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `offer_ab_tests` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `offer_id` int(11) NOT NULL,
  `variant_type` enum('title','image','price') NOT NULL,
  `variant_a_value` text NOT NULL,
  `variant_b_value` text NOT NULL,
  `variant_a_impressions` int(11) NOT NULL DEFAULT 0,
  `variant_a_claims` int(11) NOT NULL DEFAULT 0,
  `variant_b_impressions` int(11) NOT NULL DEFAULT 0,
  `variant_b_claims` int(11) NOT NULL DEFAULT 0,
  `winning_variant` enum('a','b','none') DEFAULT 'none',
  `status` enum('running','completed','stopped') NOT NULL DEFAULT 'running',
  `started_at` timestamp NULL DEFAULT current_timestamp(),
  `ended_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_ab_tests_offer` (`offer_id`),
  KEY `idx_ab_tests_status` (`status`),
  CONSTRAINT `offer_ab_tests_ibfk_1` FOREIGN KEY (`offer_id`) REFERENCES `offers` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `offer_analytics` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `offer_id` int(11) NOT NULL,
  `event_type` enum('impression','page_view','engagement','share','claim','redemption') NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `source` enum('search','notification','direct','social','listing','homepage','category') DEFAULT 'direct',
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_analytics_offer` (`offer_id`),
  KEY `idx_analytics_type` (`event_type`),
  KEY `idx_analytics_date` (`created_at`),
  CONSTRAINT `offer_analytics_ibfk_1` FOREIGN KEY (`offer_id`) REFERENCES `offers` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `offer_bundle_items` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `bundle_id` int(11) NOT NULL,
  `offer_id` int(11) NOT NULL,
  `sort_order` int(11) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_bundle_offer` (`bundle_id`,`offer_id`),
  KEY `offer_id` (`offer_id`),
  KEY `idx_bundle_items_bundle` (`bundle_id`),
  CONSTRAINT `offer_bundle_items_ibfk_1` FOREIGN KEY (`bundle_id`) REFERENCES `offer_bundles` (`id`) ON DELETE CASCADE,
  CONSTRAINT `offer_bundle_items_ibfk_2` FOREIGN KEY (`offer_id`) REFERENCES `offers` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `offer_bundles` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `slug` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `total_value` decimal(10,2) DEFAULT NULL,
  `bundle_price` decimal(10,2) DEFAULT NULL,
  `start_date` date NOT NULL,
  `end_date` date NOT NULL,
  `max_claims` int(11) DEFAULT NULL,
  `claims_count` int(11) NOT NULL DEFAULT 0,
  `status` enum('draft','active','expired','sold_out') NOT NULL DEFAULT 'draft',
  `created_by` int(11) NOT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `slug` (`slug`),
  KEY `created_by` (`created_by`),
  KEY `idx_bundles_status` (`status`),
  KEY `idx_bundles_dates` (`start_date`,`end_date`),
  KEY `idx_bundles_slug` (`slug`),
  CONSTRAINT `offer_bundles_ibfk_1` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `offer_categories` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `offer_id` int(11) NOT NULL,
  `category_id` int(11) NOT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_offer_category` (`offer_id`,`category_id`),
  KEY `idx_offer_categories_offer` (`offer_id`),
  KEY `idx_offer_categories_category` (`category_id`),
  CONSTRAINT `offer_categories_ibfk_1` FOREIGN KEY (`offer_id`) REFERENCES `offers` (`id`) ON DELETE CASCADE,
  CONSTRAINT `offer_categories_ibfk_2` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `offer_claims` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `offer_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `promo_code` varchar(50) NOT NULL,
  `claimed_at` timestamp NULL DEFAULT current_timestamp(),
  `redeemed_at` timestamp NULL DEFAULT NULL,
  `redemption_method` enum('qr_scan','manual_entry','in_app','self_reported') DEFAULT NULL,
  `status` enum('claimed','redeemed','expired') NOT NULL DEFAULT 'claimed',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_offer_user` (`offer_id`,`user_id`),
  KEY `idx_claims_offer` (`offer_id`),
  KEY `idx_claims_user` (`user_id`),
  KEY `idx_claims_status` (`status`),
  CONSTRAINT `offer_claims_ibfk_1` FOREIGN KEY (`offer_id`) REFERENCES `offers` (`id`) ON DELETE CASCADE,
  CONSTRAINT `offer_claims_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `offer_disputes` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `claim_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `reason` enum('code_not_working','already_used','wrong_offer','technical_issue','other') NOT NULL,
  `details` text DEFAULT NULL,
  `status` enum('open','investigating','resolved','closed') NOT NULL DEFAULT 'open',
  `resolution` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `resolved_at` timestamp NULL DEFAULT NULL,
  `resolved_by` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `resolved_by` (`resolved_by`),
  KEY `idx_claim` (`claim_id`),
  KEY `idx_user` (`user_id`),
  KEY `idx_status` (`status`),
  KEY `idx_created` (`created_at`),
  CONSTRAINT `offer_disputes_ibfk_1` FOREIGN KEY (`claim_id`) REFERENCES `offer_claims` (`id`) ON DELETE CASCADE,
  CONSTRAINT `offer_disputes_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `offer_disputes_ibfk_3` FOREIGN KEY (`resolved_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `offer_follows` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `follow_type` enum('business','category','all_offers') NOT NULL,
  `target_id` int(11) DEFAULT NULL,
  `notification_frequency` enum('realtime','daily','weekly') NOT NULL DEFAULT 'realtime',
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_follow` (`user_id`,`follow_type`,`target_id`),
  KEY `idx_follows_user` (`user_id`),
  KEY `idx_follows_type` (`follow_type`),
  CONSTRAINT `offer_follows_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `offer_geo_triggers` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `offer_id` int(11) NOT NULL,
  `latitude` decimal(10,8) NOT NULL,
  `longitude` decimal(11,8) NOT NULL,
  `radius_meters` int(11) NOT NULL DEFAULT 500,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `notification_message` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_geo_triggers_offer` (`offer_id`),
  KEY `idx_geo_triggers_coords` (`latitude`,`longitude`),
  KEY `idx_geo_triggers_active` (`is_active`),
  CONSTRAINT `offer_geo_triggers_ibfk_1` FOREIGN KEY (`offer_id`) REFERENCES `offers` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `offer_loyalty` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `listing_id` int(11) NOT NULL,
  `total_claims` int(11) NOT NULL DEFAULT 0,
  `total_redemptions` int(11) NOT NULL DEFAULT 0,
  `total_value` decimal(10,2) NOT NULL DEFAULT 0.00,
  `first_claim_at` timestamp NULL DEFAULT NULL,
  `last_claim_at` timestamp NULL DEFAULT NULL,
  `loyalty_tier` enum('new','bronze','silver','gold','platinum') DEFAULT 'new',
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_listing_loyalty` (`user_id`,`listing_id`),
  KEY `idx_loyalty_listing` (`listing_id`),
  KEY `idx_loyalty_tier` (`loyalty_tier`),
  KEY `idx_loyalty_user` (`user_id`),
  CONSTRAINT `offer_loyalty_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `offer_loyalty_ibfk_2` FOREIGN KEY (`listing_id`) REFERENCES `listings` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `offer_media` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `offer_id` int(11) NOT NULL,
  `media_type` enum('image','video') NOT NULL DEFAULT 'image',
  `file_url` varchar(500) NOT NULL,
  `thumbnail_url` varchar(500) DEFAULT NULL,
  `sort_order` int(11) NOT NULL DEFAULT 0,
  `alt_text` varchar(255) DEFAULT NULL,
  `embed_url` varchar(500) DEFAULT NULL COMMENT 'Video embed URL',
  `platform` varchar(50) DEFAULT NULL COMMENT 'Video platform identifier',
  `source` enum('upload','embed') DEFAULT NULL COMMENT 'Media source type',
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_media_offer` (`offer_id`),
  KEY `idx_media_sort` (`offer_id`,`sort_order`),
  CONSTRAINT `offer_media_ibfk_1` FOREIGN KEY (`offer_id`) REFERENCES `offers` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `offer_redemptions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `offer_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `redeemed_at` timestamp NULL DEFAULT current_timestamp(),
  `redemption_code` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_user_offer` (`user_id`,`offer_id`),
  KEY `idx_offer` (`offer_id`),
  KEY `idx_user` (`user_id`),
  CONSTRAINT `offer_redemptions_ibfk_1` FOREIGN KEY (`offer_id`) REFERENCES `offers` (`id`) ON DELETE CASCADE,
  CONSTRAINT `offer_redemptions_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `offer_reviews` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `offer_id` int(11) NOT NULL,
  `claim_id` int(11) DEFAULT NULL,
  `user_id` int(11) NOT NULL,
  `rating` tinyint(4) NOT NULL,
  `was_as_described` tinyint(1) DEFAULT NULL,
  `was_easy_to_redeem` tinyint(1) DEFAULT NULL,
  `comment` text DEFAULT NULL,
  `images` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`images`)),
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `helpful_count` int(11) NOT NULL DEFAULT 0,
  `not_helpful_count` int(11) NOT NULL DEFAULT 0,
  `owner_response` text DEFAULT NULL,
  `owner_response_date` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_offer_review` (`user_id`,`offer_id`),
  KEY `idx_reviews_offer` (`offer_id`),
  KEY `idx_reviews_rating` (`rating`),
  KEY `offer_reviews_ibfk_2` (`claim_id`),
  CONSTRAINT `offer_reviews_ibfk_1` FOREIGN KEY (`offer_id`) REFERENCES `offers` (`id`) ON DELETE CASCADE,
  CONSTRAINT `offer_reviews_ibfk_2` FOREIGN KEY (`claim_id`) REFERENCES `offer_claims` (`id`) ON DELETE SET NULL,
  CONSTRAINT `offer_reviews_ibfk_3` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `offer_share_clicks` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `offer_share_id` int(11) NOT NULL,
  `offer_id` int(11) NOT NULL,
  `referrer_url` varchar(500) DEFAULT NULL,
  `user_agent` varchar(500) DEFAULT NULL,
  `ip_hash` varchar(64) DEFAULT NULL,
  `resulted_in_signup` tinyint(1) NOT NULL DEFAULT 0,
  `resulted_in_claim` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_clicks_share` (`offer_share_id`),
  KEY `idx_clicks_offer` (`offer_id`),
  CONSTRAINT `offer_share_clicks_ibfk_1` FOREIGN KEY (`offer_share_id`) REFERENCES `offer_shares` (`id`) ON DELETE CASCADE,
  CONSTRAINT `offer_share_clicks_ibfk_2` FOREIGN KEY (`offer_id`) REFERENCES `offers` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `offer_shares` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `offer_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `share_type` enum('business_owner','consumer') NOT NULL,
  `platform` enum('facebook','instagram','twitter','linkedin','nextdoor','whatsapp','sms','email','copy_link') NOT NULL,
  `share_url` varchar(500) NOT NULL,
  `short_url` varchar(100) DEFAULT NULL,
  `clicks` int(11) NOT NULL DEFAULT 0,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  KEY `idx_shares_offer` (`offer_id`),
  KEY `idx_shares_platform` (`platform`),
  CONSTRAINT `offer_shares_ibfk_1` FOREIGN KEY (`offer_id`) REFERENCES `offers` (`id`) ON DELETE CASCADE,
  CONSTRAINT `offer_shares_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `offer_templates` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `listing_id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `template_data` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`template_data`)),
  `recurrence_type` enum('none','daily','weekly','monthly','yearly') DEFAULT 'none',
  `recurrence_days` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`recurrence_days`)),
  `recurrence_end_date` date DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_templates_listing` (`listing_id`),
  KEY `idx_templates_active` (`is_active`),
  CONSTRAINT `offer_templates_ibfk_1` FOREIGN KEY (`listing_id`) REFERENCES `listings` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `offers` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `listing_id` int(11) NOT NULL,
  `title` varchar(255) NOT NULL,
  `slug` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `offer_type` enum('percentage_discount','fixed_discount','bogo','bundle','freebie','custom','discount','coupon','product','service') NOT NULL,
  `original_price` decimal(10,2) DEFAULT NULL,
  `sale_price` decimal(10,2) DEFAULT NULL,
  `discount_percentage` int(11) DEFAULT NULL,
  `image` varchar(500) DEFAULT NULL,
  `thumbnail` varchar(500) DEFAULT NULL,
  `start_date` datetime NOT NULL,
  `end_date` datetime NOT NULL,
  `quantity_total` int(11) DEFAULT NULL,
  `quantity_remaining` int(11) DEFAULT NULL,
  `max_per_user` int(11) DEFAULT 1,
  `redemption_code` varchar(50) DEFAULT NULL,
  `redemption_instructions` text DEFAULT NULL,
  `redemption_count` int(11) DEFAULT 0,
  `promo_code_mode` enum('universal','unique') NOT NULL DEFAULT 'universal',
  `universal_code` varchar(50) DEFAULT NULL,
  `terms_conditions` text DEFAULT NULL,
  `min_purchase_amount` decimal(10,2) DEFAULT NULL,
  `applicable_products` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`applicable_products`)),
  `status` enum('draft','active','paused','expired','sold_out') DEFAULT 'draft',
  `is_featured` tinyint(1) DEFAULT 0,
  `is_flash` tinyint(1) NOT NULL DEFAULT 0,
  `flash_start_time` time DEFAULT NULL,
  `flash_end_time` time DEFAULT NULL,
  `flash_urgency_level` enum('normal','high','critical') DEFAULT 'normal',
  `is_b2b` tinyint(1) NOT NULL DEFAULT 0,
  `template_id` int(11) DEFAULT NULL,
  `social_proof_count` int(11) NOT NULL DEFAULT 0,
  `offline_code_cached` tinyint(1) NOT NULL DEFAULT 0,
  `is_mock` tinyint(1) DEFAULT 0,
  `view_count` int(11) DEFAULT 0,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `slug` (`slug`),
  KEY `idx_listing` (`listing_id`),
  KEY `idx_slug` (`slug`),
  KEY `idx_status` (`status`),
  KEY `idx_dates` (`start_date`,`end_date`),
  KEY `idx_mock` (`is_mock`),
  KEY `idx_featured` (`is_featured`),
  KEY `idx_offer_type` (`offer_type`),
  KEY `idx_offers_flash` (`is_flash`,`flash_start_time`,`flash_end_time`),
  KEY `idx_offers_b2b` (`is_b2b`),
  CONSTRAINT `offers_ibfk_1` FOREIGN KEY (`listing_id`) REFERENCES `listings` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `password_resets` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `user_id` bigint(20) NOT NULL,
  `token_hash` varbinary(32) NOT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `expires_at` datetime(3) NOT NULL,
  `used_at` datetime(3) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `token_hash` (`token_hash`),
  KEY `idx_user_id_expires_at` (`user_id`,`expires_at`),
  KEY `idx_token_hash` (`token_hash`),
  KEY `idx_expires_at` (`expires_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `payment_methods` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `stripe_payment_method_id` varchar(255) NOT NULL,
  `type` enum('card','us_bank_account','paypal','link') NOT NULL DEFAULT 'card',
  `brand` varchar(50) DEFAULT NULL,
  `last_four` varchar(4) DEFAULT NULL,
  `exp_month` tinyint(3) unsigned DEFAULT NULL,
  `exp_year` smallint(5) unsigned DEFAULT NULL,
  `is_default` tinyint(1) NOT NULL DEFAULT 0,
  `billing_name` varchar(255) DEFAULT NULL,
  `billing_zip` varchar(20) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_stripe_pm` (`stripe_payment_method_id`),
  KEY `idx_user` (`user_id`),
  KEY `idx_default` (`user_id`,`is_default`),
  CONSTRAINT `pm_user_fk` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `performance_metrics` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `metric_type` varchar(50) NOT NULL COMMENT 'api_response, db_query, memory, cpu',
  `metric_name` varchar(255) NOT NULL COMMENT 'Endpoint or query identifier',
  `value` decimal(10,2) NOT NULL COMMENT 'Response time (ms), memory (MB), CPU (%)',
  `status_code` int(11) DEFAULT NULL COMMENT 'HTTP status code (for API metrics)',
  `user_id` int(11) DEFAULT NULL COMMENT 'User who triggered the metric',
  `metadata` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Additional context: query params, headers, error details' CHECK (json_valid(`metadata`)),
  `environment` varchar(20) DEFAULT 'production' COMMENT 'dev, staging, prod',
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_metric_type_name` (`metric_type`,`metric_name`),
  KEY `idx_created_at` (`created_at`),
  KEY `idx_environment` (`environment`),
  KEY `idx_status_code` (`status_code`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `performance_metrics_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Performance metrics for APM';
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `platform_metrics_history` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `profile_id` int(11) NOT NULL,
  `profile_type` enum('affiliate_marketer','internet_personality') NOT NULL DEFAULT 'internet_personality',
  `platform` enum('youtube','instagram','tiktok') NOT NULL,
  `follower_count` int(11) DEFAULT 0,
  `following_count` int(11) DEFAULT 0,
  `post_count` int(11) DEFAULT 0,
  `avg_engagement_rate` decimal(5,2) DEFAULT NULL,
  `avg_views` int(11) DEFAULT 0,
  `subscriber_count` int(11) DEFAULT 0,
  `total_views` bigint(20) DEFAULT 0,
  `audience_demographics` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`audience_demographics`)),
  `raw_metrics` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`raw_metrics`)),
  `recorded_at` datetime DEFAULT current_timestamp(),
  `sync_run_id` varchar(36) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_profile_platform` (`profile_id`,`profile_type`,`platform`),
  KEY `idx_recorded` (`recorded_at`),
  KEY `idx_sync_run` (`sync_run_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `platform_oauth_tokens` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `profile_type` enum('affiliate_marketer','internet_personality') NOT NULL DEFAULT 'internet_personality',
  `profile_id` int(11) NOT NULL,
  `platform` enum('youtube','instagram','tiktok') NOT NULL,
  `platform_user_id` varchar(255) DEFAULT NULL,
  `platform_username` varchar(255) DEFAULT NULL,
  `access_token_encrypted` varbinary(512) NOT NULL,
  `refresh_token_encrypted` varbinary(512) DEFAULT NULL,
  `token_iv` varbinary(16) NOT NULL,
  `token_expires_at` datetime DEFAULT NULL,
  `scope` varchar(500) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `linked_at` datetime DEFAULT current_timestamp(),
  `last_synced_at` datetime DEFAULT NULL,
  `last_sync_status` enum('success','failure','pending') DEFAULT 'pending',
  `last_sync_error` varchar(500) DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT NULL ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_profile_platform` (`profile_type`,`profile_id`,`platform`),
  KEY `idx_user` (`user_id`),
  KEY `idx_profile` (`profile_type`,`profile_id`),
  KEY `idx_platform` (`platform`),
  KEY `idx_active` (`is_active`),
  CONSTRAINT `fk_oauth_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `podcaster_episodes` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `podcaster_id` int(11) NOT NULL,
  `episode_title` varchar(255) DEFAULT NULL,
  `episode_number` int(11) DEFAULT NULL,
  `season_number` int(11) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `audio_url` varchar(500) DEFAULT NULL,
  `duration` int(11) DEFAULT NULL,
  `guest_names` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`guest_names`)),
  `published_at` datetime DEFAULT NULL,
  `sort_order` int(11) DEFAULT 0,
  `created_at` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_podcaster` (`podcaster_id`),
  CONSTRAINT `fk_episode_podcaster` FOREIGN KEY (`podcaster_id`) REFERENCES `content_podcasters` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `podcaster_reviews` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `podcaster_id` int(11) NOT NULL,
  `reviewer_user_id` int(11) NOT NULL,
  `reviewer_listing_id` int(11) DEFAULT NULL,
  `rating` tinyint(4) NOT NULL,
  `review_text` text DEFAULT NULL,
  `images` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`images`)),
  `episode_reference` varchar(255) DEFAULT NULL,
  `status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  `created_at` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_podcaster` (`podcaster_id`),
  KEY `idx_reviewer` (`reviewer_user_id`),
  CONSTRAINT `fk_review_pod_user` FOREIGN KEY (`reviewer_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_review_podcaster` FOREIGN KEY (`podcaster_id`) REFERENCES `content_podcasters` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `profile_view` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `viewer_user_id` int(11) DEFAULT NULL,
  `profile_owner_id` int(11) NOT NULL,
  `view_type` varchar(50) DEFAULT 'profile_view',
  `referrer` text DEFAULT NULL,
  `user_agent` text DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `country` varchar(100) DEFAULT NULL,
  `city` varchar(100) DEFAULT NULL,
  `session_id` varchar(255) DEFAULT NULL,
  `duration` int(11) DEFAULT NULL,
  `viewed_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_profile_view_viewer` (`viewer_user_id`),
  KEY `idx_profile_view_owner` (`profile_owner_id`),
  KEY `idx_profile_view_type` (`view_type`),
  KEY `idx_profile_view_viewed_at` (`viewed_at`),
  KEY `idx_profile_view_ip` (`ip_address`),
  CONSTRAINT `profile_view_ibfk_1` FOREIGN KEY (`viewer_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `profile_view_ibfk_2` FOREIGN KEY (`profile_owner_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `quote_messages` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `quote_id` int(11) NOT NULL,
  `quote_response_id` int(11) DEFAULT NULL,
  `sender_user_id` int(11) NOT NULL,
  `content` text NOT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `sender_user_id` (`sender_user_id`),
  KEY `idx_quote_messages_quote` (`quote_id`,`created_at`),
  KEY `idx_quote_messages_response` (`quote_response_id`),
  CONSTRAINT `quote_messages_ibfk_1` FOREIGN KEY (`quote_id`) REFERENCES `quotes` (`id`) ON DELETE CASCADE,
  CONSTRAINT `quote_messages_ibfk_2` FOREIGN KEY (`quote_response_id`) REFERENCES `quote_responses` (`id`) ON DELETE CASCADE,
  CONSTRAINT `quote_messages_ibfk_3` FOREIGN KEY (`sender_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `quote_pool_invitations` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `group_id` int(11) NOT NULL,
  `quote_id` int(11) DEFAULT NULL,
  `inviter_user_id` int(11) NOT NULL,
  `invitee_email` varchar(255) NOT NULL,
  `invitee_name` varchar(100) DEFAULT NULL,
  `status` enum('pending','accepted','expired','cancelled') DEFAULT 'pending',
  `token` varchar(255) NOT NULL,
  `expires_at` timestamp NOT NULL,
  `accepted_at` timestamp NULL DEFAULT NULL,
  `accepted_user_id` int(11) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_group_email` (`group_id`,`invitee_email`),
  KEY `quote_id` (`quote_id`),
  KEY `inviter_user_id` (`inviter_user_id`),
  KEY `accepted_user_id` (`accepted_user_id`),
  KEY `idx_invitation_token` (`token`),
  KEY `idx_invitation_status` (`status`,`expires_at`),
  CONSTRAINT `quote_pool_invitations_ibfk_1` FOREIGN KEY (`group_id`) REFERENCES `connection_groups` (`id`) ON DELETE CASCADE,
  CONSTRAINT `quote_pool_invitations_ibfk_2` FOREIGN KEY (`quote_id`) REFERENCES `quotes` (`id`) ON DELETE SET NULL,
  CONSTRAINT `quote_pool_invitations_ibfk_3` FOREIGN KEY (`inviter_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `quote_pool_invitations_ibfk_4` FOREIGN KEY (`accepted_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `quote_requests` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `quote_id` int(11) NOT NULL,
  `target_type` enum('listing','group','user') NOT NULL,
  `target_listing_id` int(11) DEFAULT NULL,
  `target_group_id` int(11) DEFAULT NULL,
  `target_user_id` int(11) DEFAULT NULL,
  `invited_at` timestamp NULL DEFAULT current_timestamp(),
  `viewed_at` timestamp NULL DEFAULT NULL,
  `status` enum('pending','viewed','responded','declined','expired') DEFAULT 'pending',
  PRIMARY KEY (`id`),
  KEY `idx_quote_requests_quote` (`quote_id`),
  KEY `idx_quote_requests_listing` (`target_listing_id`,`status`),
  KEY `idx_quote_requests_group` (`target_group_id`),
  KEY `idx_quote_requests_user` (`target_user_id`,`status`),
  CONSTRAINT `quote_requests_ibfk_1` FOREIGN KEY (`quote_id`) REFERENCES `quotes` (`id`) ON DELETE CASCADE,
  CONSTRAINT `quote_requests_ibfk_2` FOREIGN KEY (`target_listing_id`) REFERENCES `listings` (`id`) ON DELETE CASCADE,
  CONSTRAINT `quote_requests_ibfk_3` FOREIGN KEY (`target_group_id`) REFERENCES `connection_groups` (`id`) ON DELETE CASCADE,
  CONSTRAINT `quote_requests_ibfk_4` FOREIGN KEY (`target_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `quote_responses` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `quote_id` int(11) NOT NULL,
  `quote_request_id` int(11) DEFAULT NULL,
  `responder_user_id` int(11) NOT NULL,
  `responder_listing_id` int(11) DEFAULT NULL,
  `bid_amount` decimal(12,2) DEFAULT NULL,
  `bid_description` text NOT NULL,
  `estimated_duration` varchar(100) DEFAULT NULL,
  `valid_until` date DEFAULT NULL,
  `attachments` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`attachments`)),
  `status` enum('pending','viewed','accepted','rejected','withdrawn') DEFAULT 'pending',
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_quote_response` (`quote_id`,`responder_user_id`),
  KEY `quote_request_id` (`quote_request_id`),
  KEY `responder_listing_id` (`responder_listing_id`),
  KEY `idx_quote_responses_quote` (`quote_id`,`status`),
  KEY `idx_quote_responses_responder` (`responder_user_id`),
  CONSTRAINT `quote_responses_ibfk_1` FOREIGN KEY (`quote_id`) REFERENCES `quotes` (`id`) ON DELETE CASCADE,
  CONSTRAINT `quote_responses_ibfk_2` FOREIGN KEY (`quote_request_id`) REFERENCES `quote_requests` (`id`) ON DELETE SET NULL,
  CONSTRAINT `quote_responses_ibfk_3` FOREIGN KEY (`responder_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `quote_responses_ibfk_4` FOREIGN KEY (`responder_listing_id`) REFERENCES `listings` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `quotes` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `requester_user_id` int(11) DEFAULT NULL,
  `requester_name` varchar(100) NOT NULL,
  `requester_email` varchar(255) NOT NULL,
  `requester_phone` varchar(30) DEFAULT NULL,
  `title` varchar(200) NOT NULL,
  `description` text NOT NULL,
  `service_category` varchar(100) DEFAULT NULL,
  `timeline` enum('asap','1_week','2_weeks','1_month','flexible') DEFAULT 'flexible',
  `budget_min` decimal(12,2) DEFAULT NULL,
  `budget_max` decimal(12,2) DEFAULT NULL,
  `preferred_start_date` date DEFAULT NULL,
  `location_address` varchar(255) DEFAULT NULL,
  `location_city` varchar(100) DEFAULT NULL,
  `location_state` varchar(50) DEFAULT NULL,
  `location_zip` varchar(20) DEFAULT NULL,
  `status` enum('draft','open','in_progress','completed','cancelled','expired') DEFAULT 'draft',
  `expires_at` timestamp NULL DEFAULT NULL,
  `visibility` enum('public','group','direct') DEFAULT 'direct',
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_quotes_requester` (`requester_user_id`),
  KEY `idx_quotes_status` (`status`),
  KEY `idx_quotes_category` (`service_category`),
  KEY `idx_quotes_created` (`created_at` DESC),
  CONSTRAINT `quotes_ibfk_1` FOREIGN KEY (`requester_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `recommendation_algorithm_variants` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `variant_id` varchar(50) NOT NULL,
  `name` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `weight_overrides` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`weight_overrides`)),
  `is_control` tinyint(1) DEFAULT 0,
  `is_active` tinyint(1) DEFAULT 1,
  `rollout_percentage` tinyint(3) unsigned DEFAULT 0,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `variant_id` (`variant_id`),
  KEY `idx_rav_active` (`is_active`),
  KEY `idx_rav_control` (`is_control`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `recommendation_analytics_events` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `event_type` enum('impression','click_profile','click_connect','click_dismiss','swipe_connect','swipe_dismiss','feedback_submitted','connection_accepted','connection_declined','message_sent') NOT NULL,
  `user_id` int(10) unsigned NOT NULL,
  `recommended_user_id` int(10) unsigned NOT NULL,
  `score` decimal(5,2) NOT NULL,
  `position` tinyint(3) unsigned NOT NULL DEFAULT 0,
  `source` enum('homepage_widget','connections_page','mobile_list','profile_sidebar') NOT NULL,
  `variant_id` varchar(50) DEFAULT NULL,
  `session_id` varchar(100) DEFAULT NULL,
  `dwell_time_ms` int(10) unsigned DEFAULT NULL,
  `reasons` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`reasons`)),
  `metadata` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`metadata`)),
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_rae_user_id` (`user_id`),
  KEY `idx_rae_recommended_user_id` (`recommended_user_id`),
  KEY `idx_rae_event_type` (`event_type`),
  KEY `idx_rae_variant_id` (`variant_id`),
  KEY `idx_rae_created_at` (`created_at`),
  KEY `idx_rae_source` (`source`),
  KEY `idx_rae_user_event_date` (`user_id`,`event_type`,`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `recommendation_daily_aggregates` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `date` date NOT NULL,
  `variant_id` varchar(50) DEFAULT NULL,
  `source` enum('homepage_widget','connections_page','mobile_list','profile_sidebar','all') NOT NULL DEFAULT 'all',
  `impressions` int(10) unsigned DEFAULT 0,
  `profile_clicks` int(10) unsigned DEFAULT 0,
  `connect_clicks` int(10) unsigned DEFAULT 0,
  `dismiss_clicks` int(10) unsigned DEFAULT 0,
  `swipe_connects` int(10) unsigned DEFAULT 0,
  `swipe_dismisses` int(10) unsigned DEFAULT 0,
  `requests_sent` int(10) unsigned DEFAULT 0,
  `requests_accepted` int(10) unsigned DEFAULT 0,
  `first_messages` int(10) unsigned DEFAULT 0,
  `feedback_count` int(10) unsigned DEFAULT 0,
  `relevance_rating_sum` decimal(10,2) DEFAULT 0.00,
  `reasons_helpful_count` int(10) unsigned DEFAULT 0,
  `reasons_not_helpful_count` int(10) unsigned DEFAULT 0,
  `unique_users` int(10) unsigned DEFAULT 0,
  `avg_score` decimal(5,2) DEFAULT 0.00,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_rda_date_variant_source` (`date`,`variant_id`,`source`),
  KEY `idx_rda_date` (`date`),
  KEY `idx_rda_variant_id` (`variant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `recommendation_engagement` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `recommendation_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `engagement_type` enum('viewed','entity_viewed','entity_saved','entity_contacted','helpful_yes','helpful_no','thanked','shared') NOT NULL,
  `metadata` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`metadata`)),
  `points_awarded` int(11) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_engagement_recommendation` (`recommendation_id`),
  KEY `idx_engagement_user` (`user_id`),
  KEY `idx_engagement_type` (`engagement_type`),
  KEY `idx_engagement_created` (`created_at`),
  CONSTRAINT `fk_engagement_recommendation` FOREIGN KEY (`recommendation_id`) REFERENCES `user_referrals` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_engagement_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `recommendation_feedback` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `recommended_user_id` int(11) NOT NULL,
  `action` enum('connected','dismissed','not_interested') NOT NULL,
  `not_interested_reason` enum('dont_know','not_relevant','spam','already_contacted','other') DEFAULT NULL,
  `other_reason` text DEFAULT NULL,
  `score_at_feedback` decimal(5,2) DEFAULT NULL COMMENT 'The recommendation score when feedback was given',
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_feedback` (`user_id`,`recommended_user_id`),
  KEY `idx_user_action` (`user_id`,`action`),
  KEY `idx_recommended` (`recommended_user_id`),
  KEY `idx_reason` (`not_interested_reason`),
  CONSTRAINT `recommendation_feedback_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `recommendation_feedback_ibfk_2` FOREIGN KEY (`recommended_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `recommendation_relevance_feedback` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int(10) unsigned NOT NULL,
  `recommended_user_id` int(10) unsigned NOT NULL,
  `action` enum('connected','dismissed','not_interested') NOT NULL,
  `relevance_rating` tinyint(3) unsigned DEFAULT NULL CHECK (`relevance_rating` between 1 and 5),
  `reasons_helpful` tinyint(1) DEFAULT NULL,
  `feedback_text` text DEFAULT NULL,
  `variant_id` varchar(50) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_rrf_user_pair` (`user_id`,`recommended_user_id`),
  KEY `idx_rrf_user_id` (`user_id`),
  KEY `idx_rrf_variant_id` (`variant_id`),
  KEY `idx_rrf_created_at` (`created_at`),
  KEY `idx_rrf_relevance` (`relevance_rating`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `refund_audit_trail` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `refund_request_id` int(11) NOT NULL,
  `admin_user_id` int(11) DEFAULT NULL,
  `action_type` enum('submitted','status_changed','review_assigned','reviewed','approved','denied','escalated','processing','completed','failed') NOT NULL,
  `action_description` text DEFAULT NULL,
  `before_status` varchar(50) DEFAULT NULL,
  `after_status` varchar(50) DEFAULT NULL,
  `before_amount` decimal(10,2) DEFAULT NULL,
  `after_amount` decimal(10,2) DEFAULT NULL,
  `metadata` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`metadata`)),
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_refund` (`refund_request_id`),
  KEY `idx_admin` (`admin_user_id`),
  KEY `idx_action` (`action_type`),
  KEY `idx_created` (`created_at`),
  CONSTRAINT `rat_admin_fk` FOREIGN KEY (`admin_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `rat_refund_fk` FOREIGN KEY (`refund_request_id`) REFERENCES `refund_requests` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `refund_requests` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `entity_type` enum('subscription','event_ticket','addon','other') NOT NULL,
  `entity_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `listing_id` int(11) DEFAULT NULL,
  `original_amount` decimal(10,2) NOT NULL,
  `requested_amount` decimal(10,2) NOT NULL,
  `approved_amount` decimal(10,2) DEFAULT NULL,
  `processed_amount` decimal(10,2) DEFAULT NULL,
  `currency` varchar(3) NOT NULL DEFAULT 'usd',
  `reason_category` enum('customer_request','service_issue','billing_error','duplicate_charge','cancellation_mid_cycle','other') NOT NULL,
  `reason_details` text DEFAULT NULL,
  `status` enum('submitted','under_review','approved','denied','processing','completed','failed') NOT NULL DEFAULT 'submitted',
  `reviewed_by` int(11) DEFAULT NULL,
  `reviewed_at` timestamp NULL DEFAULT NULL,
  `review_notes` text DEFAULT NULL,
  `approved_by` int(11) DEFAULT NULL,
  `approved_at` timestamp NULL DEFAULT NULL,
  `stripe_refund_id` varchar(255) DEFAULT NULL,
  `stripe_payment_intent_id` varchar(255) DEFAULT NULL,
  `processed_at` timestamp NULL DEFAULT NULL,
  `requires_escalation` tinyint(1) NOT NULL DEFAULT 0,
  `escalated_to` int(11) DEFAULT NULL,
  `escalated_at` timestamp NULL DEFAULT NULL,
  `escalation_reason` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_user` (`user_id`),
  KEY `idx_entity` (`entity_type`,`entity_id`),
  KEY `idx_status` (`status`),
  KEY `idx_listing` (`listing_id`),
  KEY `idx_created_at` (`created_at`),
  KEY `idx_stripe_refund` (`stripe_refund_id`),
  KEY `rr_reviewed_by_fk` (`reviewed_by`),
  KEY `rr_approved_by_fk` (`approved_by`),
  KEY `rr_escalated_to_fk` (`escalated_to`),
  CONSTRAINT `rr_approved_by_fk` FOREIGN KEY (`approved_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `rr_escalated_to_fk` FOREIGN KEY (`escalated_to`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `rr_listing_fk` FOREIGN KEY (`listing_id`) REFERENCES `listings` (`id`) ON DELETE SET NULL,
  CONSTRAINT `rr_reviewed_by_fk` FOREIGN KEY (`reviewed_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `rr_user_fk` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `review_helpfulness` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `review_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `is_helpful` tinyint(1) NOT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_user_review` (`user_id`,`review_id`),
  KEY `idx_review` (`review_id`),
  KEY `idx_user` (`user_id`),
  CONSTRAINT `review_helpfulness_ibfk_1` FOREIGN KEY (`review_id`) REFERENCES `reviews` (`id`) ON DELETE CASCADE,
  CONSTRAINT `review_helpfulness_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `reviews` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `listing_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `rating` int(11) NOT NULL CHECK (`rating` between 1 and 5),
  `title` varchar(255) DEFAULT NULL,
  `review_text` text DEFAULT NULL,
  `images` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`images`)),
  `status` enum('pending','approved','rejected','flagged') DEFAULT 'pending',
  `moderation_reason` text DEFAULT NULL,
  `moderated_by` int(11) DEFAULT NULL,
  `moderated_at` timestamp NULL DEFAULT NULL,
  `is_verified_purchase` tinyint(1) DEFAULT 0,
  `helpful_count` int(11) DEFAULT 0,
  `not_helpful_count` int(11) DEFAULT 0,
  `owner_response` text DEFAULT NULL,
  `owner_response_date` timestamp NULL DEFAULT NULL,
  `is_mock` tinyint(1) DEFAULT 0,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `is_featured` tinyint(1) DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_user_listing` (`user_id`,`listing_id`),
  KEY `moderated_by` (`moderated_by`),
  KEY `idx_listing` (`listing_id`),
  KEY `idx_user` (`user_id`),
  KEY `idx_status` (`status`),
  KEY `idx_rating` (`rating`),
  KEY `idx_mock` (`is_mock`),
  KEY `idx_created_at` (`created_at`),
  KEY `idx_is_featured` (`is_featured`),
  CONSTRAINT `reviews_ibfk_1` FOREIGN KEY (`listing_id`) REFERENCES `listings` (`id`) ON DELETE CASCADE,
  CONSTRAINT `reviews_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `reviews_ibfk_3` FOREIGN KEY (`moderated_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `seo_metadata` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `entity_type` varchar(50) NOT NULL COMMENT 'listing, category, event, offer',
  `entity_id` int(11) NOT NULL,
  `meta_title` varchar(200) DEFAULT NULL,
  `meta_description` varchar(320) DEFAULT NULL,
  `meta_keywords` varchar(500) DEFAULT NULL,
  `canonical_url` varchar(500) DEFAULT NULL,
  `og_title` varchar(200) DEFAULT NULL,
  `og_description` varchar(320) DEFAULT NULL,
  `og_image` varchar(500) DEFAULT NULL,
  `og_type` varchar(50) DEFAULT NULL COMMENT 'website, article, product',
  `twitter_card` varchar(50) DEFAULT NULL COMMENT 'summary, summary_large_image',
  `twitter_title` varchar(200) DEFAULT NULL,
  `twitter_description` varchar(320) DEFAULT NULL,
  `twitter_image` varchar(500) DEFAULT NULL,
  `schema_type` varchar(50) DEFAULT NULL COMMENT 'LocalBusiness, Event, Offer, Review',
  `schema_data` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Full schema.org object' CHECK (json_valid(`schema_data`)),
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_entity` (`entity_type`,`entity_id`),
  KEY `idx_entity_type` (`entity_type`),
  KEY `idx_entity_id` (`entity_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='SEO metadata for entities';
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `site_menus` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `menu_key` varchar(100) NOT NULL COMMENT 'main_nav, footer_nav, admin_nav',
  `menu_name` varchar(255) NOT NULL,
  `menu_location` varchar(50) NOT NULL COMMENT 'header, footer, sidebar',
  `menu_items` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'Array of menu items with label, url, children' CHECK (json_valid(`menu_items`)),
  `is_active` tinyint(1) DEFAULT 1,
  `display_order` int(11) DEFAULT 0,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `updated_by` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `menu_key` (`menu_key`),
  KEY `updated_by` (`updated_by`),
  KEY `idx_key` (`menu_key`),
  KEY `idx_location` (`menu_location`),
  KEY `idx_active` (`is_active`),
  KEY `idx_order` (`display_order`),
  CONSTRAINT `site_menus_ibfk_1` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `site_settings` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `setting_key` varchar(100) NOT NULL,
  `setting_value` text DEFAULT NULL,
  `setting_type` enum('string','number','boolean','json') DEFAULT 'string',
  `setting_group` varchar(50) NOT NULL COMMENT 'site, email, payment, analytics, features',
  `description` text DEFAULT NULL,
  `is_public` tinyint(1) DEFAULT 0 COMMENT 'Can non-admin users see this setting?',
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `updated_by` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `setting_key` (`setting_key`),
  KEY `updated_by` (`updated_by`),
  KEY `idx_group` (`setting_group`),
  KEY `idx_key` (`setting_key`),
  CONSTRAINT `site_settings_ibfk_1` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `social_activity` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `creator_user_id` int(11) NOT NULL,
  `target_user_id` int(11) DEFAULT NULL,
  `activity_type` varchar(100) NOT NULL,
  `title` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `metadata` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`metadata`)),
  `visibility` enum('public','connections','private') DEFAULT 'connections',
  `view_count` int(11) DEFAULT 0,
  `like_count` int(11) DEFAULT 0,
  `comment_count` int(11) DEFAULT 0,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_social_activity_creator` (`creator_user_id`),
  KEY `idx_social_activity_target` (`target_user_id`),
  KEY `idx_social_activity_type` (`activity_type`),
  KEY `idx_social_activity_visibility` (`visibility`),
  KEY `idx_social_activity_created` (`created_at`),
  CONSTRAINT `social_activity_ibfk_1` FOREIGN KEY (`creator_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `social_activity_ibfk_2` FOREIGN KEY (`target_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `social_activity_interaction` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `activity_id` int(11) NOT NULL,
  `interaction_type` enum('like','view','comment','share') NOT NULL,
  `metadata` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`metadata`)),
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_interaction` (`activity_id`,`user_id`,`interaction_type`),
  KEY `idx_social_interaction_user` (`user_id`),
  KEY `idx_social_interaction_activity` (`activity_id`),
  KEY `idx_social_interaction_type` (`interaction_type`),
  KEY `idx_social_interaction_created` (`created_at`),
  CONSTRAINT `social_activity_interaction_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `social_activity_interaction_ibfk_2` FOREIGN KEY (`activity_id`) REFERENCES `social_activity` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `social_media_connections` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `listing_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `platform` enum('facebook','twitter','instagram','linkedin','tiktok','pinterest','youtube') NOT NULL,
  `platform_user_id` varchar(255) DEFAULT NULL,
  `platform_username` varchar(255) DEFAULT NULL,
  `platform_page_name` varchar(255) DEFAULT NULL,
  `access_token_encrypted` varbinary(512) DEFAULT NULL,
  `refresh_token_encrypted` varbinary(512) DEFAULT NULL,
  `token_iv` varbinary(16) DEFAULT NULL,
  `token_expires_at` datetime DEFAULT NULL,
  `scopes` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`scopes`)),
  `is_active` tinyint(4) DEFAULT 1,
  `connected_at` datetime DEFAULT NULL,
  `last_used_at` datetime DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT NULL ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_connection` (`listing_id`,`platform`),
  KEY `idx_listing` (`listing_id`),
  KEY `idx_user` (`user_id`),
  CONSTRAINT `fk_social_conn_listing` FOREIGN KEY (`listing_id`) REFERENCES `listings` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_social_conn_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `social_media_posts` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `connection_id` int(11) NOT NULL,
  `listing_id` int(11) NOT NULL,
  `content_type` varchar(50) DEFAULT NULL,
  `content_id` int(11) NOT NULL,
  `platform` enum('facebook','twitter','instagram','linkedin','tiktok','pinterest','youtube') NOT NULL,
  `post_text` text DEFAULT NULL,
  `post_image_url` varchar(500) DEFAULT NULL,
  `post_link` varchar(500) DEFAULT NULL,
  `platform_post_id` varchar(255) DEFAULT NULL,
  `platform_post_url` varchar(500) DEFAULT NULL,
  `status` enum('pending','posted','failed','scheduled','deleted') NOT NULL DEFAULT 'pending',
  `scheduled_at` datetime DEFAULT NULL,
  `posted_at` datetime DEFAULT NULL,
  `error_message` text DEFAULT NULL,
  `impressions` int(11) DEFAULT 0,
  `engagements` int(11) DEFAULT 0,
  `clicks` int(11) DEFAULT 0,
  `last_metrics_sync` datetime DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_post_listing` (`listing_id`),
  KEY `idx_post_connection` (`connection_id`),
  KEY `idx_post_status` (`status`),
  KEY `idx_post_content` (`content_type`,`content_id`),
  CONSTRAINT `fk_post_connection` FOREIGN KEY (`connection_id`) REFERENCES `social_media_connections` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `stripe_events` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `stripe_event_id` varchar(255) NOT NULL,
  `event_type` varchar(100) NOT NULL,
  `processing_status` enum('processing','completed','failed') NOT NULL DEFAULT 'processing',
  `error_message` text DEFAULT NULL,
  `raw_event` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`raw_event`)),
  `processed_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_stripe_event_id` (`stripe_event_id`),
  KEY `idx_event_type` (`event_type`),
  KEY `idx_processing_status` (`processing_status`),
  KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `subscription_plans` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `tier` enum('essentials','plus','preferred','premium') NOT NULL,
  `version` varchar(10) NOT NULL,
  `name` varchar(100) NOT NULL,
  `pricing_monthly` decimal(10,2) DEFAULT NULL,
  `pricing_annual` decimal(10,2) DEFAULT NULL,
  `features` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`features`)),
  `effective_date` date NOT NULL,
  `deprecated_date` date DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `status` enum('active','inactive','archived') DEFAULT 'active' COMMENT 'Admin management status for plan visibility',
  `description` text DEFAULT NULL COMMENT 'Admin-facing description for plan management',
  `is_displayed` tinyint(1) DEFAULT 1 COMMENT 'Whether this plan version is publicly displayed',
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_tier_version` (`tier`,`version`),
  KEY `idx_tier` (`tier`),
  KEY `idx_effective_date` (`effective_date`),
  KEY `idx_subscription_plans_displayed` (`is_displayed`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `types` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `slug` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `slug` (`slug`),
  KEY `idx_types_slug` (`slug`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `url_shortcodes` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `short_code` varchar(8) NOT NULL,
  `full_url` text NOT NULL,
  `entity_type` enum('offer','listing','event') NOT NULL DEFAULT 'offer',
  `entity_id` int(11) DEFAULT NULL,
  `clicks` int(11) DEFAULT 0,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `expires_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `short_code` (`short_code`),
  KEY `idx_short_code` (`short_code`),
  KEY `idx_entity` (`entity_type`,`entity_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `user_badges` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL COMMENT 'User who earned the badge',
  `badge_type` varchar(100) NOT NULL,
  `badge_name` varchar(255) NOT NULL,
  `badge_icon` varchar(100) DEFAULT NULL COMMENT 'Icon identifier or emoji',
  `badge_description` text DEFAULT NULL,
  `badge_category` varchar(50) NOT NULL,
  `earned_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_user_badge` (`user_id`,`badge_type`),
  KEY `idx_user_badges` (`user_id`),
  KEY `idx_badge_type` (`badge_type`),
  KEY `idx_earned_at` (`earned_at`),
  CONSTRAINT `user_badges_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `user_blocks` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `blocker_user_id` int(11) NOT NULL COMMENT 'User who blocked',
  `blocked_user_id` int(11) NOT NULL COMMENT 'User who is blocked',
  `block_messages` tinyint(1) NOT NULL DEFAULT 1 COMMENT 'Block in Messages',
  `block_connections` tinyint(1) NOT NULL DEFAULT 1 COMMENT 'Block in Connections/requests',
  `block_pymk` tinyint(1) NOT NULL DEFAULT 1 COMMENT 'Block in People You May Know',
  `block_reason` varchar(255) DEFAULT NULL COMMENT 'Reason for blocking',
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_block` (`blocker_user_id`,`blocked_user_id`),
  KEY `idx_blocker` (`blocker_user_id`),
  KEY `idx_blocked` (`blocked_user_id`),
  CONSTRAINT `user_blocks_ibfk_1` FOREIGN KEY (`blocker_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `user_blocks_ibfk_2` FOREIGN KEY (`blocked_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='User blocking with granular controls';
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `user_bookmarks` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `entity_type` varchar(50) NOT NULL COMMENT 'listing, event, offer, content',
  `entity_id` int(11) NOT NULL,
  `notes` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_bookmark` (`user_id`,`entity_type`,`entity_id`),
  KEY `idx_user_bookmarks_user` (`user_id`),
  KEY `idx_user_bookmarks_entity` (`entity_type`,`entity_id`),
  CONSTRAINT `user_bookmarks_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `user_connection` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `sender_user_id` int(11) NOT NULL,
  `receiver_user_id` int(11) NOT NULL,
  `status` enum('connected','blocked','restricted') DEFAULT 'connected',
  `connection_type` varchar(50) DEFAULT NULL,
  `interaction_count` int(11) DEFAULT 0,
  `last_interaction` timestamp NULL DEFAULT NULL,
  `mutual_connections` int(11) DEFAULT 0,
  `notes` text DEFAULT NULL,
  `tags` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`tags`)),
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_connection` (`sender_user_id`,`receiver_user_id`),
  KEY `idx_user_connection_sender` (`sender_user_id`),
  KEY `idx_user_connection_receiver` (`receiver_user_id`),
  KEY `idx_user_connection_status` (`status`),
  KEY `idx_user_connection_type` (`connection_type`),
  KEY `idx_user_connection_created` (`created_at`),
  CONSTRAINT `user_connection_ibfk_1` FOREIGN KEY (`sender_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `user_connection_ibfk_2` FOREIGN KEY (`receiver_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `user_contacts` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL COMMENT 'Owner of this contact entry',
  `contact_user_id` int(11) DEFAULT NULL COMMENT 'The contact user ID (NULL for manual contacts)',
  `connection_id` int(11) DEFAULT NULL COMMENT 'FK to user_connection (null for manual contacts in Phase C)',
  `contact_name` varchar(255) DEFAULT NULL COMMENT 'Manual contact name (required when contact_user_id is NULL)',
  `contact_email` varchar(255) DEFAULT NULL COMMENT 'Manual contact email',
  `contact_phone` varchar(50) DEFAULT NULL COMMENT 'Manual contact phone',
  `contact_company` varchar(255) DEFAULT NULL COMMENT 'Manual contact company/organization',
  `contact_address` varchar(500) DEFAULT NULL COMMENT 'Manual contact address',
  `contact_social_links` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Social links JSON: { facebook, instagram, linkedin, twitter, bizconekt, website }' CHECK (json_valid(`contact_social_links`)),
  `source` enum('connection','listing_inquiry','event','referral','import','manual') DEFAULT 'connection' COMMENT 'How this contact was added',
  `source_details` varchar(500) DEFAULT NULL COMMENT 'Additional source info (event name, referrer, etc.)',
  `notes` text DEFAULT NULL COMMENT 'Private notes about this contact',
  `tags` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Custom tags array ["client", "partner", "lead"]' CHECK (json_valid(`tags`)),
  `category` varchar(50) DEFAULT NULL COMMENT 'Primary category (client/partner/lead/friend/other)',
  `priority` enum('high','medium','low') DEFAULT NULL COMMENT 'Contact priority level',
  `follow_up_date` date DEFAULT NULL COMMENT 'Next follow-up date',
  `follow_up_note` text DEFAULT NULL COMMENT 'What to follow up about',
  `last_contacted_at` timestamp NULL DEFAULT NULL COMMENT 'When user last reached out',
  `is_starred` tinyint(1) DEFAULT 0 COMMENT 'Starred/favorite contacts',
  `is_archived` tinyint(1) DEFAULT 0 COMMENT 'Soft archive',
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_user_connected_contact` (`user_id`,`contact_user_id`),
  KEY `contact_user_id` (`contact_user_id`),
  KEY `connection_id` (`connection_id`),
  KEY `idx_user_contacts_user_id` (`user_id`),
  KEY `idx_user_contacts_follow_up` (`user_id`,`follow_up_date`),
  KEY `idx_user_contacts_starred` (`user_id`,`is_starred`),
  KEY `idx_user_contacts_category` (`user_id`,`category`),
  KEY `idx_user_contacts_source` (`user_id`,`source`),
  KEY `idx_user_contacts_name` (`user_id`,`contact_name`(100)),
  CONSTRAINT `user_contacts_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `user_contacts_ibfk_2` FOREIGN KEY (`contact_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `user_contacts_ibfk_3` FOREIGN KEY (`connection_id`) REFERENCES `user_connection` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `user_follows` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `follower_user_id` int(11) NOT NULL COMMENT 'User who is following',
  `following_user_id` int(11) NOT NULL COMMENT 'User being followed',
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_follow` (`follower_user_id`,`following_user_id`),
  KEY `idx_follower` (`follower_user_id`),
  KEY `idx_following` (`following_user_id`),
  KEY `idx_user_follows_created_at` (`created_at`),
  CONSTRAINT `user_follows_ibfk_1` FOREIGN KEY (`follower_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `user_follows_ibfk_2` FOREIGN KEY (`following_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='One-way follow relationships between users';
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `user_interests` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `interest_type` enum('category','custom','group','membership') NOT NULL DEFAULT 'category',
  `category_id` int(11) DEFAULT NULL,
  `custom_value` varchar(255) DEFAULT NULL,
  `group_name` varchar(255) DEFAULT NULL,
  `group_purpose` text DEFAULT NULL,
  `group_role` varchar(100) DEFAULT NULL,
  `membership_name` varchar(255) DEFAULT NULL,
  `membership_description` text DEFAULT NULL,
  `display_order` int(11) DEFAULT 0,
  `is_visible` tinyint(1) DEFAULT 1,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_user_category` (`user_id`,`category_id`),
  KEY `idx_user_interests_user` (`user_id`),
  KEY `idx_user_interests_type` (`interest_type`),
  KEY `idx_user_interests_category` (`category_id`),
  KEY `idx_user_interests_order` (`user_id`,`display_order`),
  KEY `idx_user_interests_user_type` (`user_id`,`interest_type`),
  KEY `idx_user_interests_group_name` (`group_name`),
  CONSTRAINT `user_interests_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `user_interests_ibfk_2` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `user_log` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) DEFAULT NULL,
  `user_name` varchar(255) DEFAULT NULL,
  `user_email` varchar(255) DEFAULT NULL,
  `action` varchar(255) NOT NULL,
  `action_type` varchar(50) NOT NULL,
  `description` text NOT NULL,
  `entity_type` varchar(50) DEFAULT NULL,
  `entity_id` varchar(255) DEFAULT NULL,
  `entity_name` varchar(255) DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` text DEFAULT NULL,
  `browser_info` varchar(255) DEFAULT NULL,
  `device_type` varchar(50) DEFAULT NULL,
  `location` varchar(255) DEFAULT NULL,
  `referrer` text DEFAULT NULL,
  `session_id` varchar(255) DEFAULT NULL,
  `duration` int(11) DEFAULT NULL,
  `success` tinyint(1) DEFAULT 1,
  `error_message` text DEFAULT NULL,
  `metadata` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`metadata`)),
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_user_log_user` (`user_id`),
  KEY `idx_user_log_action_type` (`action_type`),
  KEY `idx_user_log_entity` (`entity_type`,`entity_id`(100)),
  KEY `idx_user_log_created` (`created_at`),
  KEY `idx_user_log_success` (`success`),
  CONSTRAINT `user_log_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `user_message` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `sender_user_id` int(11) NOT NULL,
  `receiver_user_id` int(11) NOT NULL,
  `subject` varchar(255) DEFAULT NULL,
  `content` text NOT NULL,
  `message_type` varchar(50) DEFAULT 'text',
  `attachments` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`attachments`)),
  `metadata` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`metadata`)),
  `status` varchar(50) DEFAULT 'sent',
  `read_at` timestamp NULL DEFAULT NULL,
  `thread_id` varchar(255) DEFAULT NULL,
  `reply_to_id` int(11) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_user_message_sender` (`sender_user_id`),
  KEY `idx_user_message_receiver` (`receiver_user_id`),
  KEY `idx_user_message_thread` (`thread_id`),
  KEY `idx_user_message_reply_to` (`reply_to_id`),
  KEY `idx_user_message_created` (`created_at`),
  KEY `idx_user_message_status` (`status`),
  CONSTRAINT `user_message_ibfk_1` FOREIGN KEY (`sender_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `user_message_ibfk_2` FOREIGN KEY (`receiver_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `user_message_ibfk_3` FOREIGN KEY (`reply_to_id`) REFERENCES `user_message` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `user_mfa` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint(20) unsigned NOT NULL,
  `method` enum('totp') NOT NULL,
  `secret_enc` varbinary(512) NOT NULL,
  `recovery_salt` varbinary(32) NOT NULL,
  `enabled_at` datetime(3) DEFAULT NULL,
  `last_used_at` datetime(3) DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updated_at` datetime(3) NOT NULL DEFAULT current_timestamp(3) ON UPDATE current_timestamp(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_user_method` (`user_id`,`method`),
  KEY `idx_user_mfa_user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci ROW_FORMAT=DYNAMIC;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `user_mfa_recovery_codes` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `user_mfa_id` bigint(20) unsigned NOT NULL,
  `code_hash` varbinary(32) NOT NULL,
  `used_at` datetime(3) DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_code_hash` (`code_hash`),
  KEY `idx_recovery_mfa` (`user_mfa_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci ROW_FORMAT=DYNAMIC;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `user_notifications` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `notification_type` varchar(50) NOT NULL COMMENT 'connection_request, message, review, mention, system',
  `title` varchar(255) NOT NULL,
  `message` text DEFAULT NULL,
  `entity_type` varchar(50) DEFAULT NULL COMMENT 'listing, event, offer, user, review',
  `entity_id` int(11) DEFAULT NULL,
  `action_url` varchar(500) DEFAULT NULL,
  `is_read` tinyint(1) DEFAULT 0,
  `read_at` timestamp NULL DEFAULT NULL,
  `metadata` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`metadata`)),
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_user_notifications_user` (`user_id`),
  KEY `idx_user_notifications_read` (`user_id`,`is_read`),
  KEY `idx_user_notifications_type` (`notification_type`),
  KEY `idx_user_notifications_created` (`created_at`),
  CONSTRAINT `user_notifications_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `user_profiles` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `display_name` text DEFAULT NULL,
  `bio` text DEFAULT NULL,
  `avatar_url` text DEFAULT NULL,
  `cover_image_url` text DEFAULT NULL,
  `phone` text DEFAULT NULL,
  `website` text DEFAULT NULL,
  `social_links` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`social_links`)),
  `occupation` text DEFAULT NULL,
  `company` text DEFAULT NULL,
  `interests` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`interests`)),
  `goals` text DEFAULT NULL,
  `city` text DEFAULT NULL,
  `state` text DEFAULT NULL,
  `country` varchar(100) NOT NULL DEFAULT 'US',
  `timezone` text DEFAULT NULL,
  `preferences` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`preferences`)),
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_id` (`user_id`),
  KEY `idx_user_profiles_user_id` (`user_id`),
  KEY `idx_user_profiles_country` (`country`),
  KEY `idx_user_profiles_city` (`city`(100)),
  CONSTRAINT `user_profiles_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `user_push_devices` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `device_token` varchar(512) NOT NULL,
  `platform` enum('web','ios','android') NOT NULL DEFAULT 'web',
  `browser` varchar(100) DEFAULT NULL,
  `device_name` varchar(255) DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `last_used_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_user_device` (`user_id`,`device_token`(255)),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_device_token` (`device_token`(255)),
  KEY `idx_active` (`is_active`),
  CONSTRAINT `user_push_devices_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `user_recommendation_preferences` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `weight_mutual_connections` tinyint(3) unsigned NOT NULL DEFAULT 35,
  `weight_industry_match` tinyint(3) unsigned NOT NULL DEFAULT 20,
  `weight_location` tinyint(3) unsigned NOT NULL DEFAULT 15,
  `weight_engagement` tinyint(3) unsigned NOT NULL DEFAULT 10,
  `weight_reputation` tinyint(3) unsigned NOT NULL DEFAULT 10,
  `weight_profile_completeness` tinyint(3) unsigned NOT NULL DEFAULT 10,
  `min_score_threshold` tinyint(3) unsigned NOT NULL DEFAULT 0,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `weight_skills_overlap` tinyint(3) unsigned DEFAULT 10,
  `weight_goals_alignment` tinyint(3) unsigned DEFAULT 8,
  `weight_interest_overlap` tinyint(3) unsigned DEFAULT 10,
  `weight_hobbies_alignment` tinyint(3) unsigned DEFAULT 5,
  `weight_education_match` tinyint(3) unsigned DEFAULT 8,
  `weight_hometown_match` tinyint(3) unsigned DEFAULT 4,
  `weight_group_overlap` tinyint(3) unsigned DEFAULT 3,
  `preset_profile` enum('balanced','professional','personal','alumni','local') DEFAULT 'balanced',
  `last_preset_change` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_user` (`user_id`),
  CONSTRAINT `fk_urp_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='User preferences for PYMK recommendation scoring weights';
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `user_referrals` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `referrer_user_id` int(11) NOT NULL COMMENT 'User who sent the referral',
  `contact_id` int(11) DEFAULT NULL COMMENT 'FK to user_contacts if referring existing contact',
  `referred_email` varchar(255) DEFAULT NULL COMMENT 'Email of person being referred (NULL for recommendations to registered users)',
  `referred_phone` varchar(50) DEFAULT NULL COMMENT 'Phone of person being referred',
  `referred_name` varchar(255) DEFAULT NULL COMMENT 'Name of person being referred',
  `referral_code` varchar(50) NOT NULL COMMENT 'Unique referral code (BIZ-XXXXXXXX)',
  `referral_message` text DEFAULT NULL COMMENT 'Custom message from referrer',
  `referral_link` varchar(500) DEFAULT NULL COMMENT 'Full referral URL',
  `entity_type` enum('platform_invite','user','listing','event','offer','product','service','article','newsletter','podcast','video','job_posting') NOT NULL DEFAULT 'platform_invite' COMMENT 'Type of entity being shared',
  `entity_id` varchar(36) DEFAULT NULL COMMENT 'UUID or ID of shared entity',
  `recipient_user_id` int(11) DEFAULT NULL COMMENT 'Bizconekt user receiving the recommendation',
  `status` enum('pending','sent','viewed','registered','connected') DEFAULT 'pending' COMMENT 'Current referral status',
  `reward_status` enum('pending','earned','redeemed') DEFAULT 'pending' COMMENT 'Reward status for this referral',
  `reward_points` int(11) DEFAULT 0 COMMENT 'Points earned from this referral',
  `sent_at` timestamp NULL DEFAULT NULL COMMENT 'When referral was sent',
  `viewed_at` timestamp NULL DEFAULT NULL COMMENT 'When referral link was clicked',
  `registered_at` timestamp NULL DEFAULT NULL COMMENT 'When referred user registered',
  `registered_user_id` int(11) DEFAULT NULL COMMENT 'User ID of referred person after registration',
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `is_saved` tinyint(1) NOT NULL DEFAULT 0 COMMENT 'Whether recipient saved/bookmarked this recommendation',
  `is_helpful` tinyint(1) DEFAULT NULL COMMENT 'Whether recipient found recommendation helpful (NULL = not rated)',
  `helpful_at` timestamp NULL DEFAULT NULL COMMENT 'When recipient rated the recommendation',
  `thank_message` text DEFAULT NULL COMMENT 'Thank you message from recipient to sender',
  `thanked_at` timestamp NULL DEFAULT NULL COMMENT 'When recipient thanked the sender',
  `quality_score` decimal(5,2) DEFAULT NULL COMMENT 'Quality score for this recommendation (0-100)',
  `job_id` int(11) DEFAULT NULL,
  `source_type` enum('manual','connection_group','pymk_algorithm') DEFAULT 'manual',
  `source_group_id` int(11) DEFAULT NULL,
  `auto_generated` tinyint(1) DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_referral_code` (`referral_code`),
  KEY `contact_id` (`contact_id`),
  KEY `registered_user_id` (`registered_user_id`),
  KEY `idx_referrer` (`referrer_user_id`),
  KEY `idx_referral_code` (`referral_code`),
  KEY `idx_status` (`status`),
  KEY `idx_referred_email` (`referred_email`),
  KEY `idx_reward_status` (`reward_status`),
  KEY `idx_entity_type` (`entity_type`),
  KEY `idx_entity_lookup` (`entity_type`,`entity_id`),
  KEY `idx_recipient` (`recipient_user_id`),
  KEY `idx_user_referrals_saved` (`recipient_user_id`,`is_saved`,`created_at` DESC),
  KEY `idx_user_referrals_unviewed` (`recipient_user_id`,`viewed_at`,`created_at` DESC),
  KEY `idx_user_referrals_helpful` (`referrer_user_id`,`is_helpful`,`helpful_at` DESC),
  KEY `idx_user_referrals_thanked` (`referrer_user_id`,`thanked_at` DESC),
  KEY `idx_user_referrals_quality_score` (`referrer_user_id`,`quality_score`),
  KEY `idx_job` (`job_id`),
  KEY `idx_user_referrals_source_group` (`source_group_id`),
  KEY `idx_user_referrals_source_type` (`source_type`,`status`),
  CONSTRAINT `fk_recipient_user` FOREIGN KEY (`recipient_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `user_referrals_ibfk_1` FOREIGN KEY (`referrer_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `user_referrals_ibfk_2` FOREIGN KEY (`contact_id`) REFERENCES `user_contacts` (`id`) ON DELETE SET NULL,
  CONSTRAINT `user_referrals_ibfk_3` FOREIGN KEY (`registered_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `user_referrals_ibfk_4` FOREIGN KEY (`job_id`) REFERENCES `job_postings` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `user_rewards` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL COMMENT 'User who earned the reward',
  `reward_type` varchar(50) NOT NULL COMMENT 'referral_sent, referral_registered, recommendation_sent, review_submitted, etc.',
  `points_earned` int(11) DEFAULT 0 COMMENT 'Points awarded for this event',
  `badge_id` varchar(100) DEFAULT NULL,
  `milestone_type` varchar(100) DEFAULT NULL,
  `referral_id` int(11) DEFAULT NULL COMMENT 'FK to user_referrals if referral-related',
  `description` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `referral_id` (`referral_id`),
  KEY `idx_user_rewards` (`user_id`,`reward_type`),
  KEY `idx_created_at` (`created_at`),
  KEY `idx_badge_id` (`badge_id`),
  CONSTRAINT `user_rewards_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `user_rewards_ibfk_2` FOREIGN KEY (`referral_id`) REFERENCES `user_referrals` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `user_saved_jobs` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `job_id` int(11) NOT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_user_job` (`user_id`,`job_id`),
  KEY `idx_user` (`user_id`),
  KEY `idx_job` (`job_id`),
  CONSTRAINT `user_saved_jobs_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `user_saved_jobs_ibfk_2` FOREIGN KEY (`job_id`) REFERENCES `job_postings` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `user_sessions` (
  `id` varchar(255) NOT NULL,
  `user_id` int(11) NOT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `expires_at` timestamp NOT NULL,
  `session_token_hash` varbinary(32) NOT NULL,
  `user_agent_hash` varbinary(32) DEFAULT NULL,
  `ip_coarse` varbinary(16) DEFAULT NULL,
  `revoked_at` datetime(3) DEFAULT NULL,
  `rotated_from` bigint(20) DEFAULT NULL,
  UNIQUE KEY `session_token_hash` (`session_token_hash`),
  KEY `idx_user_sessions_user_id` (`user_id`),
  KEY `idx_user_sessions_expires` (`expires_at`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_expires_at` (`expires_at`),
  CONSTRAINT `user_sessions_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `user_sessions_analytics` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) DEFAULT NULL,
  `session_token` text NOT NULL,
  `ip_address` text DEFAULT NULL,
  `user_agent` text DEFAULT NULL,
  `location` text DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `expires_at` timestamp NULL DEFAULT NULL,
  `metadata` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`metadata`)),
  `revoked` tinyint(1) DEFAULT 0,
  `revoked_at` timestamp NULL DEFAULT NULL,
  `revoked_reason` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_user_sessions_analytics_user` (`user_id`),
  KEY `idx_user_sessions_analytics_token` (`session_token`(255)),
  KEY `idx_user_sessions_analytics_is_active` (`is_active`),
  KEY `idx_user_sessions_analytics_expires` (`expires_at`),
  KEY `idx_user_sessions_analytics_created` (`created_at`),
  CONSTRAINT `user_sessions_analytics_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `user_sharing_rate_limits` (
  `user_id` int(11) NOT NULL,
  `max_shares_per_hour` int(11) NOT NULL DEFAULT 5 COMMENT 'Maximum shares allowed per hour',
  `expires_at` datetime NOT NULL COMMENT 'When rate limit expires',
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`user_id`),
  KEY `idx_expires_at` (`expires_at`),
  CONSTRAINT `fk_rate_limit_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `user_sharing_spam_alerts` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `alert_type` enum('rate_limit','duplicate_message','bulk_send','suspicious_pattern') NOT NULL,
  `severity` enum('low','medium','high') NOT NULL DEFAULT 'medium',
  `description` varchar(500) NOT NULL,
  `metadata` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Additional context: shares_per_hour, duplicate_message_count, etc.' CHECK (json_valid(`metadata`)),
  `status` enum('pending','reviewed','dismissed','action_taken') NOT NULL DEFAULT 'pending',
  `reviewed_by` int(11) DEFAULT NULL COMMENT 'Admin user who reviewed the alert',
  `reviewed_at` timestamp NULL DEFAULT NULL,
  `action_taken` varchar(500) DEFAULT NULL COMMENT 'Description of action taken if status = action_taken',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `fk_spam_alert_reviewer` (`reviewed_by`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_status` (`status`),
  KEY `idx_severity` (`severity`),
  KEY `idx_alert_type` (`alert_type`),
  KEY `idx_created_at` (`created_at`),
  CONSTRAINT `fk_spam_alert_reviewer` FOREIGN KEY (`reviewed_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_spam_alert_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `user_sharing_streaks` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `current_streak` int(11) NOT NULL DEFAULT 0 COMMENT 'Current consecutive weeks with activity',
  `longest_streak` int(11) NOT NULL DEFAULT 0 COMMENT 'All-time best streak',
  `streak_start_date` date DEFAULT NULL COMMENT 'When current streak started',
  `last_activity_date` date DEFAULT NULL COMMENT 'Last date user had recommendation activity',
  `last_activity_week` varchar(10) DEFAULT NULL COMMENT 'ISO week format: 2026-W08',
  `freezes_available` int(11) NOT NULL DEFAULT 1 COMMENT 'Freezes remaining this month',
  `freezes_used_this_month` int(11) NOT NULL DEFAULT 0 COMMENT 'Freezes used in current month',
  `last_freeze_used_at` timestamp NULL DEFAULT NULL COMMENT 'When last freeze was used',
  `freeze_reset_at` timestamp NOT NULL DEFAULT current_timestamp() COMMENT 'When freezes reset (monthly)',
  `bonus_multiplier` decimal(3,2) NOT NULL DEFAULT 1.00 COMMENT 'Current points multiplier based on streak',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_sharing_streaks_user` (`user_id`),
  KEY `idx_user_sharing_streaks_streak` (`current_streak` DESC),
  KEY `idx_user_sharing_streaks_activity` (`last_activity_date`),
  CONSTRAINT `fk_user_sharing_streaks_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Weekly recommendation activity streaks with tier-based freeze system';
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `user_smart_lists` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `criteria` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`criteria`)),
  `icon` varchar(50) DEFAULT 'list',
  `color` varchar(50) DEFAULT 'gray',
  `contact_count` int(11) DEFAULT 0,
  `is_system` tinyint(1) DEFAULT 0,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_smart_lists_user` (`user_id`),
  CONSTRAINT `user_smart_lists_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `users` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `uuid` char(36) DEFAULT NULL COMMENT 'Unique user identifier UUID',
  `email` varchar(255) NOT NULL,
  `username` varchar(50) NOT NULL,
  `first_name` varchar(100) DEFAULT NULL,
  `last_name` varchar(100) DEFAULT NULL,
  `display_name` varchar(100) DEFAULT NULL,
  `contact_phone` varchar(30) DEFAULT NULL COMMENT 'User contact phone number (optional, visibility controlled by showPhone setting)',
  `avatar_url` varchar(500) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `email_verified_at` timestamp NULL DEFAULT NULL,
  `last_login_at` timestamp NULL DEFAULT NULL,
  `password_changed_at` timestamp NULL DEFAULT current_timestamp(),
  `failed_login_attempts` int(11) DEFAULT 0,
  `locked_until` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `email_normalized` varchar(255) NOT NULL DEFAULT '"',
  `password_hash` varbinary(60) NOT NULL DEFAULT '"',
  `role` enum('general','listing_member','admin') NOT NULL DEFAULT 'general',
  `is_verified` tinyint(1) NOT NULL DEFAULT 0,
  `email_verified` tinyint(1) NOT NULL DEFAULT 0,
  `last_login` datetime DEFAULT NULL,
  `is_mock` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updated_at` datetime(3) NOT NULL DEFAULT current_timestamp(3) ON UPDATE current_timestamp(3),
  `user_group` varchar(50) DEFAULT NULL COMMENT 'User categorization group',
  `permissions` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'User permissions {create_listing, edit_profile, etc}' CHECK (json_valid(`permissions`)),
  `stripe_customer_id` varchar(255) DEFAULT NULL,
  `billing_email` varchar(255) DEFAULT NULL,
  `is_business_owner` tinyint(1) DEFAULT 0 COMMENT 'Does user own a business listing',
  `privacy_settings` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'User privacy preferences {profile_visible, email_visible, etc}' CHECK (json_valid(`privacy_settings`)),
  `login_count` int(11) DEFAULT 0 COMMENT 'Total number of successful logins',
  `last_ip_address` varchar(45) DEFAULT NULL COMMENT 'Last login IP address (supports IPv6)',
  `last_user_agent` varchar(255) DEFAULT NULL COMMENT 'Last login user agent string',
  `terms_accepted_at` timestamp NULL DEFAULT NULL COMMENT 'When user accepted terms of service',
  `terms_version` varchar(20) DEFAULT NULL COMMENT 'Version of terms accepted',
  `status` enum('active','suspended','banned','deleted','pending') DEFAULT 'active' COMMENT 'User account status',
  `bio` text DEFAULT NULL,
  `occupation` varchar(100) DEFAULT NULL,
  `goals` text DEFAULT NULL,
  `cover_image_url` varchar(500) DEFAULT NULL,
  `social_links` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Object with platform: url pairs' CHECK (json_valid(`social_links`)),
  `profile_visibility` enum('public','connections','private') DEFAULT 'public',
  `city` varchar(100) DEFAULT NULL,
  `state` varchar(100) DEFAULT NULL,
  `country` varchar(100) DEFAULT NULL,
  `hometown` varchar(255) DEFAULT NULL COMMENT 'Where user grew up',
  `high_school` varchar(255) DEFAULT NULL COMMENT 'High school name',
  `high_school_year` int(11) DEFAULT NULL COMMENT 'High school graduation year',
  `college` varchar(255) DEFAULT NULL COMMENT 'College/University name',
  `college_year` int(11) DEFAULT NULL COMMENT 'College graduation year',
  `degree` varchar(255) DEFAULT NULL COMMENT 'Degree/Field of study',
  `skills` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Skills array stored as JSON' CHECK (json_valid(`skills`)),
  `hobbies` text DEFAULT NULL COMMENT 'Hobbies and activities',
  `visibility_settings` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`visibility_settings`)),
  `connection_privacy` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Connection privacy settings {whoCanConnect, requireMessage, autoDecline, etc}' CHECK (json_valid(`connection_privacy`)),
  `user_preferences` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`user_preferences`)),
  `profile_layout` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'User profile panel layout preferences' CHECK (json_valid(`profile_layout`)),
  `avatar_bg_color` varchar(7) DEFAULT '#022641',
  `suspension_reason` varchar(500) DEFAULT NULL COMMENT 'Reason for account suspension',
  `suspension_until` datetime DEFAULT NULL COMMENT 'When suspension expires (NULL = permanent)',
  `ban_reason` varchar(500) DEFAULT NULL COMMENT 'Reason for account ban',
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`),
  UNIQUE KEY `username` (`username`),
  UNIQUE KEY `idx_email_normalized` (`email_normalized`),
  UNIQUE KEY `uuid` (`uuid`),
  UNIQUE KEY `idx_stripe_customer` (`stripe_customer_id`),
  KEY `idx_users_email` (`email`),
  KEY `idx_users_username` (`username`),
  KEY `idx_users_active` (`is_active`),
  KEY `idx_users_last_login` (`last_login_at`),
  KEY `idx_users_deleted` (`deleted_at`),
  KEY `idx_users_uuid` (`uuid`),
  KEY `idx_users_is_business_owner` (`is_business_owner`),
  KEY `idx_users_status` (`status`),
  KEY `idx_users_login_count` (`login_count`),
  KEY `idx_users_profile_visibility` (`profile_visibility`),
  KEY `idx_users_college` (`college`),
  KEY `idx_users_hometown` (`hometown`),
  FULLTEXT KEY `ft_users_goals` (`goals`),
  FULLTEXT KEY `ft_users_hobbies` (`hobbies`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `websocket_connections` (
  `id` varchar(255) NOT NULL,
  `user_id` varchar(255) NOT NULL,
  `socket_id` varchar(255) NOT NULL,
  `connection_time` timestamp NULL DEFAULT current_timestamp(),
  `last_activity` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `metadata` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`metadata`)),
  `is_active` tinyint(1) DEFAULT 1,
  `disconnected_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_websocket_connections_user` (`user_id`),
  KEY `idx_websocket_connections_socket` (`socket_id`),
  KEY `idx_websocket_connections_is_active` (`is_active`),
  KEY `idx_websocket_connections_connection_time` (`connection_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'IGNORE_SPACE,STRICT_TRANS_TABLES,ERROR_FOR_DIVISION_BY_ZERO,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION' */ ;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_ci */ ;
DELIMITER ;;
CREATE PROCEDURE `aggregate_recommendation_analytics`(IN target_date DATE)
BEGIN
        -- Aggregate events by variant and source for the target date
        INSERT INTO recommendation_daily_aggregates (
          date, variant_id, source,
          impressions, profile_clicks, connect_clicks, dismiss_clicks,
          swipe_connects, swipe_dismisses, requests_sent, requests_accepted,
          first_messages, unique_users, avg_score
        )
        SELECT
          target_date,
          COALESCE(variant_id, 'control'),
          source,
          SUM(CASE WHEN event_type = 'impression' THEN 1 ELSE 0 END),
          SUM(CASE WHEN event_type = 'click_profile' THEN 1 ELSE 0 END),
          SUM(CASE WHEN event_type = 'click_connect' THEN 1 ELSE 0 END),
          SUM(CASE WHEN event_type = 'click_dismiss' THEN 1 ELSE 0 END),
          SUM(CASE WHEN event_type = 'swipe_connect' THEN 1 ELSE 0 END),
          SUM(CASE WHEN event_type = 'swipe_dismiss' THEN 1 ELSE 0 END),
          SUM(CASE WHEN event_type = 'connection_accepted' THEN 1 ELSE 0 END),
          SUM(CASE WHEN event_type = 'connection_accepted' THEN 1 ELSE 0 END),
          SUM(CASE WHEN event_type = 'message_sent' THEN 1 ELSE 0 END),
          COUNT(DISTINCT user_id),
          AVG(score)
        FROM recommendation_analytics_events
        WHERE DATE(created_at) = target_date
        GROUP BY variant_id, source
        ON DUPLICATE KEY UPDATE
          impressions = VALUES(impressions),
          profile_clicks = VALUES(profile_clicks),
          connect_clicks = VALUES(connect_clicks),
          dismiss_clicks = VALUES(dismiss_clicks),
          swipe_connects = VALUES(swipe_connects),
          swipe_dismisses = VALUES(swipe_dismisses),
          requests_sent = VALUES(requests_sent),
          requests_accepted = VALUES(requests_accepted),
          first_messages = VALUES(first_messages),
          unique_users = VALUES(unique_users),
          avg_score = VALUES(avg_score),
          updated_at = NOW();

        -- Update feedback aggregates
        UPDATE recommendation_daily_aggregates rda
        SET
          feedback_count = (
            SELECT COUNT(*) FROM recommendation_relevance_feedback
            WHERE DATE(created_at) = target_date
            AND COALESCE(variant_id, 'control') = rda.variant_id
          ),
          relevance_rating_sum = (
            SELECT COALESCE(SUM(relevance_rating), 0) FROM recommendation_relevance_feedback
            WHERE DATE(created_at) = target_date
            AND COALESCE(variant_id, 'control') = rda.variant_id
            AND relevance_rating IS NOT NULL
          ),
          reasons_helpful_count = (
            SELECT COUNT(*) FROM recommendation_relevance_feedback
            WHERE DATE(created_at) = target_date
            AND COALESCE(variant_id, 'control') = rda.variant_id
            AND reasons_helpful = TRUE
          ),
          reasons_not_helpful_count = (
            SELECT COUNT(*) FROM recommendation_relevance_feedback
            WHERE DATE(created_at) = target_date
            AND COALESCE(variant_id, 'control') = rda.variant_id
            AND reasons_helpful = FALSE
          )
        WHERE rda.date = target_date;
      END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

