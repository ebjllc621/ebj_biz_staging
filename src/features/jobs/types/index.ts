/**
 * Jobs System Type Definitions
 *
 * GOVERNANCE COMPLIANCE:
 * - Feature-level interfaces for Jobs System
 * - Type-safe enums for all job-related data
 * - Pagination and filter interfaces
 *
 * @authority docs/pages/layouts/job_ops/build/phases/PHASE_1_BRAIN_PLAN.md
 * @phase Jobs Phase 1 - Core Job CRUD & Display
 */

// ============================================================================
// Core Job Interface
// ============================================================================

export interface Job {
  id: number;
  business_id: number | null;
  creator_user_id: number;
  title: string;
  slug: string;
  employment_type: EmploymentType;
  description: string;
  compensation_type: CompensationType;
  compensation_min: number | null;
  compensation_max: number | null;
  compensation_currency: string;
  work_location_type: WorkLocationType;
  address: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  latitude: number | null;
  longitude: number | null;
  department: string | null;
  reports_to: string | null;
  number_of_openings: number;
  schedule_info: string | null;
  start_date: Date | null;
  application_deadline: Date | null;
  application_method: ApplicationMethod;
  external_application_url: string | null;
  benefits: string[] | null;
  required_qualifications: string[] | null;
  preferred_qualifications: string[] | null;
  custom_questions: CustomQuestion[] | null;
  is_featured: boolean;
  is_community_gig?: boolean;
  moderation_notes?: string | null;
  agency_posting_for_business_id?: number | null;
  agency_business_name?: string;
  status: JobStatus;
  view_count: number;
  application_count: number;
  created_at: Date;
  updated_at: Date;
}

export interface JobWithCoordinates extends Job {
  listing_name?: string;
  listing_logo?: string;
  listing_slug?: string;
  listing_claimed?: boolean;
  listing_tier?: 'essentials' | 'plus' | 'preferred' | 'premium';
}

// ============================================================================
// Input Interfaces
// ============================================================================

export interface CreateJobInput {
  title: string;
  slug?: string;
  employment_type: EmploymentType;
  description: string;
  compensation_type: CompensationType;
  compensation_min?: number;
  compensation_max?: number;
  compensation_currency?: string;
  work_location_type: WorkLocationType;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  latitude?: number;
  longitude?: number;
  department?: string;
  reports_to?: string;
  number_of_openings?: number;
  schedule_info?: string;
  start_date?: Date | string;
  application_deadline?: Date | string;
  application_method: ApplicationMethod;
  external_application_url?: string;
  benefits?: string[];
  required_qualifications?: string[];
  preferred_qualifications?: string[];
  is_featured?: boolean;
  agency_posting_for_business_id?: number;
}

export interface UpdateJobInput {
  title?: string;
  slug?: string;
  employment_type?: EmploymentType;
  description?: string;
  compensation_type?: CompensationType;
  compensation_min?: number;
  compensation_max?: number;
  compensation_currency?: string;
  work_location_type?: WorkLocationType;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  latitude?: number;
  longitude?: number;
  department?: string;
  reports_to?: string;
  number_of_openings?: number;
  schedule_info?: string;
  start_date?: Date | string;
  application_deadline?: Date | string;
  application_method?: ApplicationMethod;
  external_application_url?: string;
  benefits?: string[];
  required_qualifications?: string[];
  preferred_qualifications?: string[];
  status?: JobStatus;
  is_featured?: boolean;
}

// ============================================================================
// Filter & Pagination Interfaces
// ============================================================================

export interface JobFilters {
  listingId?: number;
  employmentType?: EmploymentType;
  compensationType?: CompensationType;
  workLocationType?: WorkLocationType;
  status?: JobStatus;
  isFeatured?: boolean;
  isActive?: boolean; // Active = status=active, not expired
  isCommunityGig?: boolean; // Phase 5 - Community Gig Board
  creatorUserId?: number; // Filter by user who created the gig
  searchQuery?: string;
  city?: string;
  state?: string;
  minCompensation?: number;
  maxCompensation?: number;
  postedWithinDays?: number; // Last N days
}

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export type MyJobsTab = 'applications' | 'saved' | 'alerts';

// ============================================================================
// Enum Types
// ============================================================================

export enum EmploymentType {
  FULL_TIME = 'full_time',
  PART_TIME = 'part_time',
  SEASONAL = 'seasonal',
  TEMPORARY = 'temporary',
  CONTRACT = 'contract',
  INTERNSHIP = 'internship',
  GIG = 'gig'
}

export enum CompensationType {
  HOURLY = 'hourly',
  SALARY = 'salary',
  COMMISSION = 'commission',
  TIPS_HOURLY = 'tips_hourly',
  STIPEND = 'stipend',
  UNPAID = 'unpaid',
  COMPETITIVE = 'competitive'
}

export enum WorkLocationType {
  ONSITE = 'onsite',
  REMOTE = 'remote',
  HYBRID = 'hybrid'
}

export enum ApplicationMethod {
  EXTERNAL = 'external',
  NATIVE = 'native'
}

export enum JobStatus {
  DRAFT = 'draft',
  PENDING_MODERATION = 'pending_moderation',
  ACTIVE = 'active',
  PAUSED = 'paused',
  FILLED = 'filled',
  EXPIRED = 'expired',
  ARCHIVED = 'archived'
}

export enum JobDisplayMode {
  GRID = 'grid',
  LIST = 'list'
}

// ============================================================================
// Analytics & Tracking Types
// ============================================================================

export type AnalyticsEventType = 'impression' | 'page_view' | 'save' | 'share' | 'external_click' | 'apply_click';
export type AnalyticsSource = 'search' | 'notification' | 'direct' | 'social' | 'listing' | 'homepage';
export type ShareType = 'business_owner' | 'job_seeker' | 'referral';
export type SharePlatform = 'facebook' | 'instagram' | 'twitter' | 'linkedin' | 'nextdoor' | 'whatsapp' | 'sms' | 'email' | 'copy_link';

export interface JobAnalyticsEvent {
  job_id: number;
  event_type: AnalyticsEventType;
  user_id?: number;
  source?: AnalyticsSource;
  referrer?: string;
}

export interface JobShare {
  job_id: number;
  user_id?: number;
  share_type: ShareType;
  platform: SharePlatform;
  share_url: string;
  short_url?: string;
}

// ============================================================================
// Phase 2 Types - Native Applications & Engagement
// ============================================================================

/**
 * Job Application Interface
 * Native in-platform job applications
 */
export interface JobApplication {
  id: number;
  job_id: number;
  user_id: number;
  full_name: string;
  email: string;
  phone: string | null;
  resume_file_url: string | null;
  cover_message: string | null;
  availability: ApplicationAvailability | null;
  custom_answers: Record<string, string> | null;
  application_source: ApplicationSource;
  status: ApplicationStatus;
  employer_notes: string | null;
  referred_by_user_id: number | null;
  contacted_at: Date | null;
  interviewed_at: Date | null;
  status_changed_at: Date | null;
  created_at: Date;
  updated_at: Date;
  // Joined fields
  job?: Job;
  applicant?: { id: number; display_name: string; avatar_url: string | null };
}

export type ApplicationAvailability = 'immediately' | 'within_2_weeks' | 'within_1_month' | 'flexible';
export type ApplicationSource = 'direct' | 'social' | 'notification' | 'search' | 'listing';
export type ApplicationStatus = 'new' | 'reviewed' | 'contacted' | 'interviewed' | 'hired' | 'declined';

export interface SubmitApplicationInput {
  job_id: number;
  full_name: string;
  email: string;
  phone?: string;
  resume_file_url?: string;
  cover_message?: string;
  availability?: ApplicationAvailability;
  custom_answers?: Record<string, string>;
  application_source?: ApplicationSource;
  referred_by_user_id?: number;
}

export interface ApplicationFilters {
  status?: ApplicationStatus;
  page?: number;
  limit?: number;
}

/**
 * Job Alert Subscription Interface
 * User job alert subscriptions
 */
export interface JobAlertSubscription {
  id: number;
  user_id: number;
  alert_type: AlertType;
  target_id: number | null;
  keyword_filter: string | null;
  employment_type_filter: EmploymentType[] | null;
  location_filter: LocationFilter | null;
  compensation_min: number | null;
  compensation_max: number | null;
  notification_frequency: AlertFrequency;
  is_active: boolean;
  last_sent_at: Date | null;
  created_at: Date;
  updated_at: Date;
  // Joined fields
  target_name?: string; // Business or category name
}

export type AlertType = 'business' | 'category' | 'employment_type' | 'keyword' | 'all_jobs';
export type AlertFrequency = 'realtime' | 'daily' | 'weekly';

export interface LocationFilter {
  city?: string;
  state?: string;
  radius_miles?: number;
}

export interface CreateAlertInput {
  alert_type: AlertType;
  target_id?: number;
  keyword_filter?: string;
  employment_type_filter?: EmploymentType[];
  location_filter?: LocationFilter;
  compensation_min?: number;
  compensation_max?: number;
  notification_frequency?: AlertFrequency;
}

export interface UpdateAlertInput {
  keyword_filter?: string;
  employment_type_filter?: EmploymentType[];
  location_filter?: LocationFilter;
  compensation_min?: number;
  compensation_max?: number;
  notification_frequency?: AlertFrequency;
  is_active?: boolean;
}

/**
 * Job Posting Template Interface
 * Reusable job posting templates
 */
export interface JobPostingTemplate {
  id: number;
  template_name: string;
  template_category: TemplateCategory;
  employment_type: EmploymentType | null;
  description_template: string | null;
  required_qualifications_template: string[] | null;
  preferred_qualifications_template: string[] | null;
  benefits_defaults: string[] | null;
  compensation_type: CompensationType | null;
  is_system_template: boolean;
  business_id: number | null;
  created_by_user_id: number | null;
  usage_count: number;
  created_at: Date;
  updated_at: Date;
}

export type TemplateCategory = 'restaurant' | 'retail' | 'office' | 'trades' | 'healthcare' | 'agriculture' | 'hospitality' | 'custom';

export interface CreateTemplateInput {
  template_name: string;
  template_category: TemplateCategory;
  employment_type?: EmploymentType;
  description_template?: string;
  required_qualifications_template?: string[];
  preferred_qualifications_template?: string[];
  benefits_defaults?: string[];
  compensation_type?: CompensationType;
  business_id?: number;
}

export interface UpdateTemplateInput {
  template_name?: string;
  template_category?: TemplateCategory;
  employment_type?: EmploymentType;
  description_template?: string;
  required_qualifications_template?: string[];
  preferred_qualifications_template?: string[];
  benefits_defaults?: string[];
  compensation_type?: CompensationType;
}

// ============================================================================
// PHASE 3 TYPES - SEO, Analytics & Advanced Features
// ============================================================================

export interface JobAnalyticsFunnel {
  job_id: number;
  impressions: number;
  page_views: number;
  saves: number;
  applications: number;
  hires: number;
  conversion_rates: {
    view_rate: number;
    save_rate: number;
    apply_rate: number;
    hire_rate: number;
  };
}

export interface ListingJobsAnalytics {
  listing_id: number;
  total_jobs: number;
  active_jobs: number;
  total_applications: number;
  total_hires: number;
  avg_time_to_fill: number | null;
  top_performing_job_id: number | null;
  funnel: JobAnalyticsFunnel;
}

export interface PlatformJobsAnalytics {
  total_jobs_posted: number;
  active_jobs: number;
  total_applications: number;
  total_hires: number;
  top_categories: { category_id: number; count: number }[];
  top_cities: { city: string; count: number }[];
  avg_time_to_fill: number | null;
}

export interface SharePlatformData {
  platform: SharePlatform;
  shares: number;
  clicks: number;
  clickRate: number;
}

export interface RecordShareInput {
  job_id: number;
  user_id?: number;
  share_type: ShareType;
  platform: SharePlatform;
  share_url: string;
}

export interface JobAnalyticsDashboardData {
  funnel: JobAnalyticsFunnel;
  shares: SharePlatformData[];
  hires: JobHireReport[];
  referrals: number;
  job: {
    id: number;
    title: string;
    status: JobStatus;
    created_at: Date;
  };
}

export interface JobHireReport {
  id: number;
  job_id: number;
  application_id: number | null;
  hire_source: HireSource;
  hired_user_id: number | null;
  hire_date: Date;
  time_to_fill_days: number | null;
  salary_or_rate: number | null;
  notes: string | null;
  reported_by_user_id: number;
  created_at: Date;
}

export type HireSource = 'native_application' | 'external' | 'direct' | 'referral';

export interface ReportHireInput {
  job_id: number;
  application_id?: number;
  hire_source: HireSource;
  hired_user_id?: number;
  hire_date: Date | string;
  salary_or_rate?: number;
  notes?: string;
}

export type RecurringSchedule = 'weekly' | 'biweekly' | 'monthly' | 'quarterly';

export interface CustomQuestion {
  id: string;
  question: string;
  type: 'text' | 'yes_no' | 'multiple_choice';
  options?: string[];
  required: boolean;
}

// ============================================================================
// PHASE 4 TYPES - Platform Growth & Future Features
// ============================================================================

/**
 * Job Seeker Profile Interface
 * Extended user profile for job seekers with skills and resume
 */
export interface JobSeekerProfile {
  id: number;
  user_id: number;
  headline: string | null;
  bio: string | null;
  skills: string[] | null;
  experience_level: ExperienceLevel;
  years_experience: number | null;
  resume_file_url: string | null;
  resume_updated_at: Date | null;
  employment_preferences: EmploymentPreferences | null;
  availability_date: Date | null;
  is_actively_looking: boolean;
  is_discoverable: boolean;
  preferred_job_categories: number[] | null;
  created_at: Date;
  updated_at: Date;
}

export type ExperienceLevel = 'entry' | 'junior' | 'mid' | 'senior' | 'lead' | 'executive';

export interface EmploymentPreferences {
  types: EmploymentType[];
  locations: LocationPreference[];
  remote: boolean;
  min_salary?: number;
}

export interface LocationPreference {
  city?: string;
  state?: string;
  radius_miles?: number;
}

export interface CreateJobSeekerProfileInput {
  headline?: string;
  bio?: string;
  skills?: string[];
  experience_level?: ExperienceLevel;
  years_experience?: number;
  resume_file_url?: string;
  employment_preferences?: EmploymentPreferences;
  availability_date?: Date | string;
  is_actively_looking?: boolean;
  is_discoverable?: boolean;
  preferred_job_categories?: number[];
}

export interface UpdateJobSeekerProfileInput {
  headline?: string;
  bio?: string;
  skills?: string[];
  experience_level?: ExperienceLevel;
  years_experience?: number;
  resume_file_url?: string;
  employment_preferences?: EmploymentPreferences;
  availability_date?: Date | string;
  is_actively_looking?: boolean;
  is_discoverable?: boolean;
  preferred_job_categories?: number[];
}

/**
 * Employer Branding Interface
 * Work With Us branding section for listings
 */
export interface EmployerBranding {
  id: number;
  listing_id: number;
  headline: string | null;
  tagline: string | null;
  company_culture: string | null;
  benefits_highlight: string | null;
  team_size: string | null;
  growth_stage: GrowthStage | null;
  hiring_urgency: HiringUrgency;
  featured_media_url: string | null;
  cta_text: string;
  cta_url: string | null;
  status: BrandingStatus;
  created_at: Date;
  updated_at: Date;
}

export type GrowthStage = 'startup' | 'growing' | 'established' | 'enterprise';
export type HiringUrgency = 'immediate' | 'ongoing' | 'seasonal' | 'future';
export type BrandingStatus = 'draft' | 'published' | 'archived';

export interface CreateEmployerBrandingInput {
  listing_id: number;
  headline?: string;
  tagline?: string;
  company_culture?: string;
  benefits_highlight?: string;
  team_size?: string;
  growth_stage?: GrowthStage;
  hiring_urgency?: HiringUrgency;
  featured_media_url?: string;
  cta_text?: string;
  cta_url?: string;
  status?: BrandingStatus;
}

export interface UpdateEmployerBrandingInput {
  headline?: string;
  tagline?: string;
  company_culture?: string;
  benefits_highlight?: string;
  team_size?: string;
  growth_stage?: GrowthStage;
  hiring_urgency?: HiringUrgency;
  featured_media_url?: string;
  cta_text?: string;
  cta_url?: string;
  status?: BrandingStatus;
}

/**
 * Hiring Campaign Interface
 * Seasonal and event-based hiring campaigns
 */
export interface HiringCampaign {
  id: number;
  listing_id: number;
  campaign_name: string;
  campaign_type: CampaignType;
  hiring_goal: number | null;
  target_roles: string[] | null;
  target_categories: number[] | null;
  season: Season | null;
  start_date: Date;
  end_date: Date;
  budget: number | null;
  status: CampaignStatus;
  approved_by_user_id: number | null;
  approved_at: Date | null;
  performance_metrics: CampaignMetrics | null;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
}

export type CampaignType = 'seasonal' | 'event' | 'blitz' | 'evergreen';
export type Season = 'spring' | 'summer' | 'fall' | 'winter' | 'holiday';
export type CampaignStatus = 'draft' | 'pending_approval' | 'approved' | 'active' | 'paused' | 'completed' | 'archived';

export interface CampaignMetrics {
  impressions?: number;
  applications?: number;
  hires?: number;
  cost_per_hire?: number;
}

export interface CreateHiringCampaignInput {
  listing_id: number;
  campaign_name: string;
  campaign_type: CampaignType;
  hiring_goal?: number;
  target_roles?: string[];
  target_categories?: number[];
  season?: Season;
  start_date: Date | string;
  end_date: Date | string;
  budget?: number;
  notes?: string;
}

export interface UpdateHiringCampaignInput {
  campaign_name?: string;
  campaign_type?: CampaignType;
  hiring_goal?: number;
  target_roles?: string[];
  target_categories?: number[];
  season?: Season;
  start_date?: Date | string;
  end_date?: Date | string;
  budget?: number;
  status?: CampaignStatus;
  performance_metrics?: CampaignMetrics;
  notes?: string;
}

export interface CampaignFilters {
  listing_id?: number;
  campaign_type?: CampaignType;
  status?: CampaignStatus;
  season?: Season;
  active_on_date?: Date | string;
}

/**
 * Job Market Content Interface
 * Trends, salary guides, and market insights
 */
export interface JobMarketContent {
  id: number;
  content_type: ContentType;
  title: string;
  slug: string;
  summary: string | null;
  content: string;
  data_json: Record<string, unknown> | null;
  cover_image_url: string | null;
  regions: string[] | null;
  job_categories: number[] | null;
  published_date: Date | null;
  status: ContentStatus;
  author_user_id: number | null;
  view_count: number;
  is_featured: boolean;
  created_at: Date;
  updated_at: Date;
}

export type ContentType = 'trends' | 'salary_guide' | 'skills_report' | 'industry_outlook' | 'hiring_tips';
export type ContentStatus = 'draft' | 'pending_review' | 'published' | 'archived';

export interface CreateJobMarketContentInput {
  content_type: ContentType;
  title: string;
  slug?: string;
  summary?: string;
  content: string;
  data_json?: Record<string, unknown>;
  cover_image_url?: string;
  regions?: string[];
  job_categories?: number[];
  published_date?: Date | string;
  is_featured?: boolean;
}

export interface UpdateJobMarketContentInput {
  content_type?: ContentType;
  title?: string;
  slug?: string;
  summary?: string;
  content?: string;
  data_json?: Record<string, unknown>;
  cover_image_url?: string;
  regions?: string[];
  job_categories?: number[];
  published_date?: Date | string;
  status?: ContentStatus;
  is_featured?: boolean;
}

export interface ContentFilters {
  content_type?: ContentType;
  status?: ContentStatus;
  region?: string;
  job_category?: number;
  is_featured?: boolean;
}

/**
 * Hiring Event Interface
 * Job fair and hiring event integration
 */
export interface HiringEvent {
  id: number;
  event_id: number;
  event_type: EventType;
  participating_listings: number[] | null;
  expected_openings: number | null;
  featured_roles: string[] | null;
  registration_required: boolean;
  external_registration_url: string | null;
  created_at: Date;
  updated_at: Date;
  // Joined from events table
  event_name?: string;
  event_date?: Date;
  event_location?: string;
}

export type EventType = 'job_fair' | 'career_expo' | 'networking' | 'hiring_sprint' | 'webinar' | 'info_session';

export interface CreateHiringEventInput {
  event_id: number;
  event_type: EventType;
  participating_listings?: number[];
  expected_openings?: number;
  featured_roles?: string[];
  registration_required?: boolean;
  external_registration_url?: string;
}

export interface UpdateHiringEventInput {
  event_type?: EventType;
  participating_listings?: number[];
  expected_openings?: number;
  featured_roles?: string[];
  registration_required?: boolean;
  external_registration_url?: string;
}

/**
 * Candidate Discovery Interface
 * Premium employer candidate matching
 */
export interface CandidateDiscovery {
  id: number;
  job_seeker_user_id: number;
  listing_id: number;
  match_score: number | null;
  matched_skills: string[] | null;
  discovered_at: Date;
  viewed_at: Date | null;
  contacted_at: Date | null;
  contact_method: ContactMethod | null;
  status: DiscoveryStatus;
  employer_notes: string | null;
  created_at: Date;
  updated_at: Date;
  // Joined fields
  job_seeker?: JobSeekerProfile;
  job_seeker_name?: string;
  job_seeker_headline?: string;
}

export type ContactMethod = 'message' | 'email' | 'phone';
export type DiscoveryStatus = 'discovered' | 'interested' | 'contacted' | 'applied' | 'hired' | 'declined';

export interface CandidateDiscoveryFilters {
  listing_id?: number;
  status?: DiscoveryStatus;
  min_match_score?: number;
  skill?: string;
}

export interface UpdateCandidateDiscoveryInput {
  viewed_at?: Date | string;
  contacted_at?: Date | string;
  contact_method?: ContactMethod;
  status?: DiscoveryStatus;
  employer_notes?: string;
}

/**
 * Job Referral Interface
 * Extension for job-specific referrals
 */
export interface JobReferral {
  referral_id: number;
  job_id: number;
  referred_email: string;
  referrer_user_id: number;
  status: 'pending' | 'applied' | 'hired';
  created_at: Date;
  // Joined fields
  job?: Job;
  referrer_name?: string;
}

// ============================================================================
// Job Media Interfaces
// ============================================================================

/**
 * Job Media - Image or video associated with a job posting
 */
export interface JobMedia {
  id: number;
  job_id: number;
  media_type: 'image' | 'video';
  file_url: string;
  sort_order: number;
  alt_text: string | null;
  embed_url: string | null;
  platform: string | null;
  source: 'upload' | 'embed' | null;
  created_at: Date;
}

/**
 * Input for creating job media
 */
export interface CreateJobMediaInput {
  media_type: 'image' | 'video';
  file_url: string;
  alt_text?: string;
  sort_order?: number;
  embed_url?: string;
  platform?: string;
  source?: 'upload' | 'embed';
}

/**
 * Input for updating job media metadata
 */
export interface UpdateJobMediaInput {
  sort_order?: number;
  alt_text?: string;
}

/**
 * Job media limits based on subscription tier
 */
export interface JobMediaLimits {
  images: { current: number; limit: number; unlimited: boolean };
  videos: { current: number; limit: number; unlimited: boolean };
}

/**
 * Result of media limit check
 */
export interface JobMediaLimitCheckResult {
  allowed: boolean;
  current: number;
  limit: number;
  unlimited: boolean;
  tier: string;
}
