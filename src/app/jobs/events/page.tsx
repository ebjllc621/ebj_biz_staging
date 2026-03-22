'use client';

/**
 * Hiring Events Calendar Public Page
 *
 * Public page for browsing job fairs and hiring events
 *
 * @authority docs/pages/layouts/job_ops/build/phases/PHASE_4_BRAIN_PLAN.md
 * @phase Jobs Phase 4 - Platform Growth & Future Features
 */

import { HiringEventsCalendar } from '@features/jobs/components/HiringEventsCalendar';

export default function HiringEventsPage() {
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Hiring Events</h1>
        <p className="text-gray-600 mt-2">
          Discover job fairs, career expos, and hiring events near you
        </p>
      </div>

      {/* Event Type Filters */}
      <div className="mb-6 flex flex-wrap gap-2">
        <span className="px-3 py-1 bg-primary text-white text-sm rounded-full">All Events</span>
        <span className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full hover:bg-gray-200 cursor-pointer">Job Fairs</span>
        <span className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full hover:bg-gray-200 cursor-pointer">Career Expos</span>
        <span className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full hover:bg-gray-200 cursor-pointer">Networking</span>
        <span className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full hover:bg-gray-200 cursor-pointer">Webinars</span>
      </div>

      {/* Calendar Component */}
      <HiringEventsCalendar />

      {/* Info Section */}
      <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-blue-50 rounded-lg p-6">
          <h3 className="font-semibold text-blue-900 mb-2">Find Your Next Opportunity</h3>
          <p className="text-blue-700 text-sm">
            Browse upcoming hiring events and connect with employers actively looking to hire.
          </p>
        </div>
        <div className="bg-green-50 rounded-lg p-6">
          <h3 className="font-semibold text-green-900 mb-2">Register Early</h3>
          <p className="text-green-700 text-sm">
            Many events have limited capacity. Register early to secure your spot.
          </p>
        </div>
        <div className="bg-purple-50 rounded-lg p-6">
          <h3 className="font-semibold text-purple-900 mb-2">Prepare Your Profile</h3>
          <p className="text-purple-700 text-sm">
            Complete your job seeker profile to make a great first impression.
          </p>
        </div>
      </div>
    </div>
  );
}
