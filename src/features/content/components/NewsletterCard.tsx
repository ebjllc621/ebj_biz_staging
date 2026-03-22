'use client';

import Link from 'next/link';
import type { Route } from 'next';
import Image from 'next/image';
import { Mail, Clock, Eye, Bookmark, Star } from 'lucide-react';
import type { Newsletter } from '@core/types/newsletter';

interface NewsletterCardProps {
  newsletter: Newsletter;
  className?: string;
}

function formatReadingTime(minutes: number): string {
  if (minutes < 1) return 'Less than 1 min';
  if (minutes === 1) return '1 min read';
  return `${minutes} min read`;
}

function formatViewCount(count: number): string {
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}k`;
  return count.toString();
}

export function NewsletterCard({ newsletter, className = '' }: NewsletterCardProps) {
  const cardContent = (
    <article className="relative bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow h-full">
      <div className="relative h-40 w-full bg-gray-100">
        {newsletter.featured_image ? (
          <Image
            src={newsletter.featured_image}
            alt={newsletter.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-emerald-500 to-teal-700">
            <Mail className="w-12 h-12 text-white" />
          </div>
        )}
        {newsletter.issue_number !== null && newsletter.issue_number !== undefined && (
          <span className="absolute top-3 left-3 bg-blue-500 text-white text-xs font-medium px-2.5 py-1 rounded-full">
            #{newsletter.issue_number}
          </span>
        )}
        {newsletter.is_featured && (
          <span className="absolute top-3 right-3 bg-yellow-400 text-biz-navy text-xs font-medium px-2 py-1 rounded-full flex items-center gap-1 shadow-sm">
            <Star className="w-3 h-3" /> Featured
          </span>
        )}
      </div>
      <div className="p-4">
        <h3 className="font-semibold text-biz-navy mt-1 line-clamp-2 group-hover:text-biz-orange transition-colors">
          {newsletter.title}
        </h3>
        {newsletter.excerpt && (
          <p className="text-sm text-gray-600 mt-2 line-clamp-3">{newsletter.excerpt}</p>
        )}
        <div className="flex items-center gap-4 text-sm text-gray-500 mt-3">
          {newsletter.reading_time !== null && newsletter.reading_time !== undefined && (
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {formatReadingTime(newsletter.reading_time)}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Eye className="w-3.5 h-3.5" />
            {formatViewCount(newsletter.view_count)}
          </span>
          {newsletter.bookmark_count > 0 && (
            <span className="flex items-center gap-1">
              <Bookmark className="w-3.5 h-3.5" />
              {formatViewCount(newsletter.bookmark_count)}
            </span>
          )}
        </div>
        {newsletter.tags && newsletter.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-3">
            {newsletter.tags.slice(0, 3).map((tag, index) => (
              <span key={index} className="text-xs text-biz-orange bg-biz-orange/10 px-2 py-0.5 rounded">
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </article>
  );

  if (!newsletter.slug) {
    return (
      <div className={`block group ${className}`}>
        {cardContent}
      </div>
    );
  }

  return (
    <Link href={`/newsletters/${newsletter.slug}` as Route} className={`block group ${className}`}>
      {cardContent}
    </Link>
  );
}

export default NewsletterCard;
