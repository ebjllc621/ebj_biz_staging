/**
 * Job Application Form Component
 *
 * @description Native job application form with resume upload and custom questions
 * @component Client Component
 * @tier ADVANCED
 * @phase Jobs Phase 2 - Native Applications
 * @authority docs/pages/layouts/job_ops/build/phases/PHASE_2_BRAIN_PLAN.md
 *
 * GOVERNANCE RULES:
 * - MUST be marked 'use client'
 * - MUST use ErrorBoundary (ADVANCED tier requirement)
 * - Orange theme (#ed6437) for submit button
 * - fetchWithCsrf for submission
 * - Full validation with error display
 */
'use client';

import React, { useState } from 'react';
import { Upload, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { fetchWithCsrf } from '@core/utils/csrf';
import type { Job, ApplicationAvailability } from '@features/jobs/types';

interface JobApplicationFormProps {
  job: Job;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function JobApplicationForm({ job, onSuccess, onCancel }: JobApplicationFormProps) {
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    cover_message: '',
    availability: '' as ApplicationAvailability | '',
    resume_file_url: ''
  });

  const [customAnswers, setCustomAnswers] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError(null);
  };

  const handleCustomAnswerChange = (question: string, answer: string) => {
    setCustomAnswers(prev => ({ ...prev, [question]: answer }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      // Validate required fields
      if (!formData.full_name.trim()) {
        throw new Error('Full name is required');
      }

      if (!formData.email.trim()) {
        throw new Error('Email is required');
      }

      // Build submission data
      const submitData: any = {
        full_name: formData.full_name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim() || undefined,
        cover_message: formData.cover_message.trim() || undefined,
        availability: formData.availability || undefined,
        resume_file_url: formData.resume_file_url || undefined,
        custom_answers: Object.keys(customAnswers).length > 0 ? customAnswers : undefined,
        application_source: 'direct'
      };

      // Submit application
      const response = await fetchWithCsrf(`/api/jobs/${job.id}/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submitData)
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error?.message || 'Failed to submit application');
      }

      setSuccess(true);

      // Call success callback after delay
      setTimeout(() => {
        if (onSuccess) {
          onSuccess();
        }
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit application');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Success state
  if (success) {
    return (
      <div className="text-center py-12">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
          <CheckCircle2 className="w-8 h-8 text-green-600" />
        </div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">Application Submitted!</h3>
        <p className="text-gray-600">
          Your application for <strong>{job.title}</strong> has been sent to the employer.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Error Display */}
      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-lg flex items-center gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Job Info */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h3 className="font-semibold text-gray-900 mb-1">{job.title}</h3>
        <p className="text-sm text-gray-600">
          {job.employment_type.replace('_', ' ')} · {job.work_location_type}
        </p>
      </div>

      {/* Personal Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="full_name" className="block text-sm font-medium text-gray-700 mb-1">
            Full Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="full_name"
            name="full_name"
            value={formData.full_name}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ed6437] focus:border-transparent"
          />
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            Email <span className="text-red-500">*</span>
          </label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ed6437] focus:border-transparent"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
            Phone Number
          </label>
          <input
            type="tel"
            id="phone"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ed6437] focus:border-transparent"
          />
        </div>

        <div>
          <label htmlFor="availability" className="block text-sm font-medium text-gray-700 mb-1">
            Availability
          </label>
          <select
            id="availability"
            name="availability"
            value={formData.availability}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ed6437] focus:border-transparent"
          >
            <option value="">Select availability</option>
            <option value="immediately">Immediately</option>
            <option value="within_2_weeks">Within 2 weeks</option>
            <option value="within_1_month">Within 1 month</option>
            <option value="flexible">Flexible</option>
          </select>
        </div>
      </div>

      {/* Resume Upload */}
      <div>
        <label htmlFor="resume_file_url" className="block text-sm font-medium text-gray-700 mb-1">
          Resume URL
        </label>
        <div className="flex items-center gap-2">
          <Upload className="w-5 h-5 text-gray-400" />
          <input
            type="url"
            id="resume_file_url"
            name="resume_file_url"
            value={formData.resume_file_url}
            onChange={handleChange}
            placeholder="https://example.com/resume.pdf"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ed6437] focus:border-transparent"
          />
        </div>
        <p className="text-xs text-gray-500 mt-1">
          Enter the URL to your resume (PDF, DOC, or DOCX)
        </p>
      </div>

      {/* Cover Message */}
      <div>
        <label htmlFor="cover_message" className="block text-sm font-medium text-gray-700 mb-1">
          Cover Message
        </label>
        <textarea
          id="cover_message"
          name="cover_message"
          value={formData.cover_message}
          onChange={handleChange}
          rows={4}
          placeholder="Tell the employer why you're a great fit for this position..."
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ed6437] focus:border-transparent resize-none"
        />
      </div>

      {/* Custom Questions */}
      {job.custom_questions && Array.isArray(job.custom_questions) && job.custom_questions.length > 0 && (
        <div className="space-y-4">
          <h4 className="font-semibold text-gray-900">Additional Questions</h4>
          {job.custom_questions.map((question: any, index: number) => (
            <div key={index}>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {question.question || question}
              </label>
              <textarea
                value={customAnswers[question.question || question] || ''}
                onChange={(e) => handleCustomAnswerChange(question.question || question, e.target.value)}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ed6437] focus:border-transparent resize-none"
              />
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 pt-4">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-[#ed6437] text-white rounded-lg hover:bg-[#d55a31] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Submitting...
            </>
          ) : (
            'Submit Application'
          )}
        </button>
      </div>
    </form>
  );
}
