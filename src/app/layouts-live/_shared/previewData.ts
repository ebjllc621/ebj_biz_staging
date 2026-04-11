/**
 * previewData — Static placeholder data for the variant-2-1-* live preview pages.
 *
 * These arrays are NOT from the live API. They exist so each visual variant
 * can render content/creator/tool promo sections with consistent sample data.
 * The variants are visual planning exercises — not production pages.
 */

import type { LucideIcon } from 'lucide-react';
import {
  FileText,
  Video,
  Headphones,
  BookOpen,
  Mail,
  Zap,
  Users,
  UsersRound,
  FilePen,
  MessageSquare,
  Search,
  BarChart3,
  Megaphone,
  Image as ImageIcon,
  Calendar,
  Briefcase,
  Star,
  Mic,
  Film,
  Sparkles,
} from 'lucide-react';

// ============================================================================
// CONTENT — Articles, Videos, Podcasts, Guides, Newsletters
// ============================================================================

export type PreviewContentKind = 'Article' | 'Video' | 'Podcast' | 'Guide' | 'Newsletter';

export interface PreviewContent {
  id: string;
  kind: PreviewContentKind;
  title: string;
  author: string;
  meta: string;
  icon: LucideIcon;
}

export const PREVIEW_CONTENT: PreviewContent[] = [
  {
    id: 'c1',
    kind: 'Article',
    title: 'Turning Foot Traffic Into Repeat Customers',
    author: 'Mia Chen',
    meta: '8 min read',
    icon: FileText,
  },
  {
    id: 'c2',
    kind: 'Video',
    title: 'Setting Up Your First Listing in 5 Minutes',
    author: 'Bizconekt',
    meta: '4:32',
    icon: Video,
  },
  {
    id: 'c3',
    kind: 'Podcast',
    title: 'The Local Loop · Ep 14: Scaling Trust',
    author: 'Jordan Reeves',
    meta: '38 min',
    icon: Headphones,
  },
  {
    id: 'c4',
    kind: 'Guide',
    title: 'Pricing Your Services Competitively',
    author: 'Sam Park',
    meta: '12 min read',
    icon: BookOpen,
  },
  {
    id: 'c5',
    kind: 'Newsletter',
    title: 'The Weekly Wire · Issue 47',
    author: 'Bizconekt Editors',
    meta: 'Tuesdays · 8am',
    icon: Mail,
  },
  {
    id: 'c6',
    kind: 'Article',
    title: 'Community Over Volume: The New Local Playbook',
    author: 'Alex Rivera',
    meta: '6 min read',
    icon: FileText,
  },
];

// ============================================================================
// CREATORS — Podcasters, Writers, Affiliates, Video Creators, Influencers
// ============================================================================

export type PreviewCreatorKind = 'Podcaster' | 'Writer' | 'Affiliate' | 'Video Creator' | 'Influencer';

export interface PreviewCreator {
  id: string;
  name: string;
  handle: string;
  kind: PreviewCreatorKind;
  bio: string;
  followers: string;
  icon: LucideIcon;
}

export const PREVIEW_CREATORS: PreviewCreator[] = [
  {
    id: 'k1',
    name: 'Jordan Reeves',
    handle: '@thelocalloop',
    kind: 'Podcaster',
    bio: 'Host of The Local Loop Show',
    followers: '4.2K',
    icon: Mic,
  },
  {
    id: 'k2',
    name: 'Mia Chen',
    handle: '@miachenwrites',
    kind: 'Writer',
    bio: 'Small-business journalism',
    followers: '12K',
    icon: FileText,
  },
  {
    id: 'k3',
    name: 'Sam Park',
    handle: '@samparkfit',
    kind: 'Affiliate',
    bio: 'Fitness & wellness partnerships',
    followers: '8K',
    icon: Sparkles,
  },
  {
    id: 'k4',
    name: 'Aisha Nguyen',
    handle: '@aishabuilds',
    kind: 'Video Creator',
    bio: 'Building in public, weekly',
    followers: '18K',
    icon: Film,
  },
  {
    id: 'k5',
    name: 'Carter Yu',
    handle: '@carteryulive',
    kind: 'Podcaster',
    bio: 'Craft + Commerce podcast',
    followers: '3.1K',
    icon: Mic,
  },
  {
    id: 'k6',
    name: 'Elena Morrison',
    handle: '@elenacreates',
    kind: 'Influencer',
    bio: 'Sustainable living + design',
    followers: '22K',
    icon: Zap,
  },
];

// ============================================================================
// TOOLS — Pro tools available to members
// ============================================================================

export type PreviewToolAudience = 'discover' | 'build' | 'both';

export interface PreviewTool {
  id: string;
  name: string;
  pitch: string;
  audience: PreviewToolAudience;
  icon: LucideIcon;
}

export const PREVIEW_TOOLS: PreviewTool[] = [
  {
    id: 't1',
    name: 'Connections',
    pitch: 'Build a verified Rolodex of local members.',
    audience: 'both',
    icon: Users,
  },
  {
    id: 't2',
    name: 'Connection Groups',
    pitch: 'Organize your network into color-coded pools.',
    audience: 'build',
    icon: UsersRound,
  },
  {
    id: 't3',
    name: 'Quote Requests',
    pitch: 'Send a job to a pool, get competitive bids back.',
    audience: 'build',
    icon: FilePen,
  },
  {
    id: 't4',
    name: 'Direct Messaging',
    pitch: 'Reach any member or listing owner instantly.',
    audience: 'both',
    icon: MessageSquare,
  },
  {
    id: 't5',
    name: 'Analytics Dashboard',
    pitch: 'Views, clicks, and conversions tracked live.',
    audience: 'build',
    icon: BarChart3,
  },
  {
    id: 't6',
    name: 'Campaigns',
    pitch: 'Run targeted promotions with built-in tracking.',
    audience: 'build',
    icon: Megaphone,
  },
  {
    id: 't7',
    name: 'Media Gallery',
    pitch: 'Showcase photos and videos with zero setup.',
    audience: 'build',
    icon: ImageIcon,
  },
  {
    id: 't8',
    name: 'Event Hosting',
    pitch: 'Host meetups, webinars, and workshops.',
    audience: 'build',
    icon: Calendar,
  },
  {
    id: 't9',
    name: 'Job Board',
    pitch: 'Find talent from your own backyard.',
    audience: 'build',
    icon: Briefcase,
  },
  {
    id: 't10',
    name: 'External Reviews',
    pitch: 'Sync reviews from Google, Yelp, and more.',
    audience: 'build',
    icon: Star,
  },
  {
    id: 't11',
    name: 'Newsletter Publishing',
    pitch: 'Email your followers from your listing.',
    audience: 'build',
    icon: Mail,
  },
  {
    id: 't12',
    name: 'Member Directory',
    pitch: 'Search the community by skill, city, or group.',
    audience: 'discover',
    icon: Search,
  },
];
