/**
 * ListingProjects - Portfolio/Project Showcase
 *
 * @component Client Component
 * @tier STANDARD
 * @phase Phase 4 - Missing Components
 * @generated DNA v11.4.0
 * @governance Build Map v2.1 ENHANCED
 *
 * Features:
 * - Portfolio grid with images
 * - Project title, description, client, date
 * - Category tags
 * - Featured projects highlighted
 * - Responsive grid layout (1/2/3 cols)
 * - Edit mode empty state with configure link
 * - Published mode returns null if no visible projects
 *
 * @see docs/pages/layouts/listings/details/detailspageenhance/3-1-26/phases/PHASE_4_BRAIN_PLAN.md
 */
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Briefcase, Calendar, User, Tag, Settings } from 'lucide-react';
import type { Listing } from '@core/services/ListingService';

interface Project {
  id: number;
  title: string;
  description: string | null;
  image_url: string | null;
  project_date: string | null;
  client_name: string | null;
  category: string | null;
  tags: string[];
  is_featured: boolean;
}

interface ListingProjectsProps {
  /** Listing data */
  listing: Listing;
  /** Whether in edit mode */
  isEditing?: boolean;
}

export function ListingProjects({ listing, isEditing }: ListingProjectsProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch projects
  useEffect(() => {
    let isMounted = true;

    async function fetchProjects() {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `/api/listings/${listing.id}/projects`,
          { credentials: 'include' }
        );

        if (!response.ok) {
          throw new Error('Failed to fetch projects');
        }

        const result = await response.json();
        if (isMounted && result.success) {
          setProjects(result.data?.projects || []);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to load projects');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    fetchProjects();

    return () => {
      isMounted = false;
    };
  }, [listing.id]);

  // Show empty state in edit mode when no projects
  if (isEditing && !isLoading && projects.length === 0) {
    return (
      <section className="bg-white rounded-lg shadow-sm p-6 border-2 border-dashed border-gray-300">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
            <Briefcase className="w-6 h-6 text-gray-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-700 mb-1">
              Portfolio & Projects
            </h3>
            <p className="text-sm text-gray-500 mb-3">
              No projects yet. Showcase your work to attract customers.
            </p>
            <Link
              href={`/dashboard/listings/${String(listing.id)}/projects` as any}
              className="inline-flex items-center gap-2 px-4 py-2 bg-biz-navy text-white text-sm font-medium rounded-md hover:bg-biz-navy/90 transition-colors"
            >
              <Settings className="w-4 h-4" />
              Configure
            </Link>
          </div>
        </div>
      </section>
    );
  }

  // Return null in published mode when no projects
  if (!isLoading && projects.length === 0) {
    return null;
  }

  return (
    <section className="bg-white rounded-lg shadow-sm p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-biz-navy flex items-center gap-2">
          <Briefcase className="w-6 h-6 text-biz-orange" />
          Portfolio & Projects
          {!isLoading && projects.length > 0 && (
            <span className="text-sm font-normal text-gray-500">
              ({projects.length})
            </span>
          )}
        </h2>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="border border-gray-200 rounded-lg overflow-hidden animate-pulse">
              <div className="w-full h-48 bg-gray-200"></div>
              <div className="p-4">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-full mb-1"></div>
                <div className="h-3 bg-gray-200 rounded w-2/3"></div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error State */}
      {error && !isLoading && (
        <div className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg p-4">
          {error}
        </div>
      )}

      {/* Projects Grid */}
      {!isLoading && !error && projects.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <div
              key={project.id}
              className={`border rounded-lg overflow-hidden hover:shadow-lg transition-shadow ${
                project.is_featured
                  ? 'ring-2 ring-biz-orange'
                  : 'border-gray-200'
              }`}
            >
              {/* Project Image */}
              {project.image_url ? (
                <div className="relative w-full h-48 bg-gray-100">
                  <img
                    src={project.image_url}
                    alt={project.title}
                    className="w-full h-full object-cover"
                  />
                  {project.is_featured && (
                    <span className="absolute top-2 right-2 px-3 py-1 rounded-full text-xs font-medium bg-biz-orange text-white">
                      Featured
                    </span>
                  )}
                </div>
              ) : (
                <div className="w-full h-48 bg-gray-100 flex items-center justify-center">
                  <Briefcase className="w-12 h-12 text-gray-400" />
                </div>
              )}

              {/* Project Info */}
              <div className="p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {project.title}
                </h3>

                {project.description && (
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                    {project.description}
                  </p>
                )}

                {/* Metadata */}
                <div className="space-y-2 text-sm text-gray-500">
                  {project.client_name && (
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4" />
                      <span>{project.client_name}</span>
                    </div>
                  )}

                  {project.project_date && (
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      <span>
                        {new Date(project.project_date).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short'
                        })}
                      </span>
                    </div>
                  )}

                  {project.category && (
                    <div className="flex items-center gap-2">
                      <Tag className="w-4 h-4" />
                      <span className="text-biz-orange font-medium">
                        {project.category}
                      </span>
                    </div>
                  )}
                </div>

                {/* Tags */}
                {project.tags && project.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {project.tags.map((tag, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
