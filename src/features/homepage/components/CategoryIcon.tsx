/**
 * CategoryIcon - Category Display for Homepage Slider
 *
 * @tier STANDARD
 * @generated DNA v11.2.0
 * @dna-version 11.2.0
 */
'use client';

import Link from 'next/link';
import type { Route } from 'next';
import Image from 'next/image';
import {
  Building2, Utensils, ShoppingBag, Car, Home, Briefcase, Heart,
  GraduationCap, Wrench, Scissors, Dumbbell, PawPrint, Plane,
  Music, Camera, Laptop, Scale, Stethoscope, Paintbrush, Hammer,
  Leaf, Coffee, Wine, Church, Users, Package, DollarSign, Shield,
  Sparkles, MoreHorizontal, type LucideIcon
} from 'lucide-react';
import { FeaturedCategory } from '../types';

interface CategoryIconProps {
  /** Category data */
  category: FeaturedCategory;
  /** Index for sequential color assignment (optional, falls back to hash if not provided) */
  index?: number;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Category to icon mapping
 */
const CATEGORY_ICON_MAP: Record<string, LucideIcon> = {
  // Food & Drink
  'restaurants': Utensils,
  'food': Utensils,
  'dining': Utensils,
  'cafes': Coffee,
  'coffee': Coffee,
  'bars': Wine,
  'nightlife': Wine,

  // Retail
  'retail': ShoppingBag,
  'shopping': ShoppingBag,
  'stores': ShoppingBag,

  // Professional
  'professional': Briefcase,
  'business': Building2,
  'legal': Scale,
  'finance': DollarSign,
  'banking': DollarSign,
  'insurance': Shield,

  // Health & Wellness
  'health': Heart,
  'wellness': Heart,
  'medical': Stethoscope,
  'healthcare': Stethoscope,
  'fitness': Dumbbell,
  'gyms': Dumbbell,
  'beauty': Scissors,
  'salons': Scissors,
  'spas': Sparkles,

  // Home & Auto
  'real-estate': Home,
  'home': Home,
  'automotive': Car,
  'auto': Car,
  'construction': Hammer,
  'contractors': Hammer,
  'repairs': Wrench,
  'handyman': Wrench,
  'landscaping': Leaf,
  'cleaning': Sparkles,

  // Education & Tech
  'education': GraduationCap,
  'schools': GraduationCap,
  'technology': Laptop,
  'tech': Laptop,

  // Entertainment
  'entertainment': Music,
  'events': Music,
  'photography': Camera,
  'media': Camera,
  'arts': Paintbrush,

  // Other
  'pets': PawPrint,
  'animals': PawPrint,
  'travel': Plane,
  'tourism': Plane,
  'religious': Church,
  'community': Users,
  'shipping': Package,
  'logistics': Package,
  'security': Shield
};

/**
 * Homepage feature section color palette for category icons
 * Matches the icon colors used in "Everything You Need to Grow Your Network" section
 * Plus gray (#8d918d) and navy (#002641) for additional variety
 */
const CATEGORY_COLORS = [
  'bg-blue-500',             // Blue - Business Directory icon color
  'bg-teal-500',             // Teal - Events & Networking icon color
  'bg-bizconekt-primary',    // Orange - Special Offers icon color (#ed6437)
  'bg-violet-500',           // Violet - Special Offers badge color
  'bg-bizconekt-grayish',    // Gray - User specified (#8d918d)
  'bg-bizconekt-navy',       // Navy - User specified (#002641)
] as const;

/**
 * Get color for category based on index (sequential cycling)
 * Colors repeat in order: Blue → Teal → Orange → Violet → Gray → Navy → Blue...
 * This creates visual cohesion with predictable color patterns
 */
function getCategoryColorByIndex(index: number): string {
  const colorIndex = index % CATEGORY_COLORS.length;
  return CATEGORY_COLORS[colorIndex] ?? CATEGORY_COLORS[0];
}

/**
 * Get icon component for category slug
 * Matches on full slug or partial keyword
 */
function getCategoryIcon(slug: string): LucideIcon {
  const normalizedSlug = slug.toLowerCase().replace(/[^a-z-]/g, '');

  // Direct match
  if (CATEGORY_ICON_MAP[normalizedSlug]) {
    return CATEGORY_ICON_MAP[normalizedSlug];
  }

  // Partial match - check if slug contains any mapped keyword
  for (const [key, icon] of Object.entries(CATEGORY_ICON_MAP)) {
    if (normalizedSlug.includes(key)) {
      return icon;
    }
  }

  // Default icon
  return MoreHorizontal;
}

/**
 * CategoryIcon component
 * Displays category as a circular icon with label
 * Colors cycle sequentially when index is provided for visual cohesion
 */
export function CategoryIcon({ category, index = 0, className = '' }: CategoryIconProps) {
  const colorClass = getCategoryColorByIndex(index);
  const IconComponent = getCategoryIcon(category.slug);

  return (
    <Link
      href={`/listings?category=${category.slug}` as Route}
      className={`flex-shrink-0 w-20 snap-start ${className}`}
    >
      <div className="flex flex-col items-center gap-2">
        {/* Icon Circle */}
        <div className={`relative w-16 h-16 rounded-full ${colorClass} flex items-center justify-center shadow-sm hover:scale-110 hover:shadow-md transition-all duration-200`}>
          {category.icon_url ? (
            <Image
              src={category.icon_url}
              alt={category.name}
              width={32}
              height={32}
              className="object-contain"
            />
          ) : (
            <IconComponent className="w-7 h-7 text-white" />
          )}
        </div>

        {/* Label */}
        <span className="text-xs text-center text-gray-700 font-medium line-clamp-2 leading-tight max-w-full">
          {category.name}
        </span>
      </div>
    </Link>
  );
}

export default CategoryIcon;
