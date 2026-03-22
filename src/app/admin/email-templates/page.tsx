/**
 * Admin Email Templates Page
 *
 * GOVERNANCE COMPLIANCE:
 * - Template: AdminTableTemplate with editor (STANDARD tier)
 * - Authentication: Admin-only access required
 * - Service Boundary: API routes for database access (NO direct database)
 * - Credentials: 'include' for all fetch requests
 *
 * Features:
 * - Email template listing (table view)
 * - Template CRUD operations
 * - Template preview with variable substitution
 * - Test email send functionality
 * - Template categories (welcome, password_reset, notification, etc.)
 * - Variable documentation
 *
 * @authority PHASE_5.2_BRAIN_PLAN.md - Section 3.2.5
 * @component
 * @returns {JSX.Element} Admin email templates interface
 */

'use client';


// Force dynamic rendering (required for useAuth() - React Context cannot be used in SSG)
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { Eye, FlaskConical, Edit2, Trash2 } from 'lucide-react';
import { BizModal, BizModalButton } from '@/components/ui/BizModal';
import { useAuth } from '@core/hooks/useAuth';
import { fetchWithCsrf } from '@core/utils/csrf';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

type TemplateCategory = 'welcome' | 'password_reset' | 'verification' | 'notification' | 'marketing' | 'system';

interface EmailTemplate {
  id: number;
  name: string;
  category: TemplateCategory;
  subject: string;
  body_html: string;
  body_text: string;
  available_variables: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface TemplateFormData {
  name: string;
  category: TemplateCategory;
  subject: string;
  body_html: string;
  body_text: string;
  available_variables: string;
  is_active: boolean;
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

/**
 * Template Preview Modal Component
 */
function TemplatePreviewModal({
  template,
  isOpen,
  onClose
}: {
  template: EmailTemplate | null;
  isOpen: boolean;
  onClose: () => void;
}) {
  if (!template) return null;

  const sampleData: Record<string, string> = {
    user_name: 'John Doe',
    user_email: 'john@example.com',
    verification_link: 'https://example.com/verify/abc123',
    reset_link: 'https://example.com/reset/xyz789',
    listing_title: 'Sample Listing',
    event_name: 'Sample Event',
    site_name: 'Bizconekt',
    site_url: 'https://bizconekt.com'
  };

  const renderWithVariables = (text: string) => {
    let result = text;
    template.available_variables.forEach(variable => {
      const value = sampleData[variable] ?? `{{${variable}}}`;
      result = result.replace(new RegExp(`{{${variable}}}`, 'g'), value);
    });
    return result;
  };

  return (
    <BizModal isOpen={isOpen} onClose={onClose} title="Template Preview" size="large">
      <div className="space-y-4">
        {/* Subject */}
        <div>
          <label className="block text-sm font-medium mb-1">Subject</label>
          <div className="p-3 bg-gray-50 rounded text-sm font-medium">
            {renderWithVariables(template.subject)}
          </div>
        </div>

        {/* HTML Body */}
        <div>
          <label className="block text-sm font-medium mb-1">HTML Preview</label>
          <div
            className="p-4 bg-white border rounded max-h-96 overflow-y-auto"
            dangerouslySetInnerHTML={{ __html: renderWithVariables(template.body_html) }}
          />
        </div>

        {/* Text Body */}
        <div>
          <label className="block text-sm font-medium mb-1">Plain Text Preview</label>
          <div className="p-3 bg-gray-50 rounded text-sm whitespace-pre-wrap max-h-64 overflow-y-auto">
            {renderWithVariables(template.body_text)}
          </div>
        </div>

        {/* Variables */}
        <div>
          <label className="block text-sm font-medium mb-2">Available Variables</label>
          <div className="flex flex-wrap gap-2">
            {template.available_variables.map(variable => (
              <span
                key={variable}
                className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-mono"
              >
                {`{{${variable}}}`}
              </span>
            ))}
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t">
          <BizModalButton variant="secondary" onClick={onClose}>
            Close
          </BizModalButton>
        </div>
      </div>
    </BizModal>
  );
}

/**
 * Test Email Modal Component
 */
function TestEmailModal({
  template,
  isOpen,
  onClose
}: {
  template: EmailTemplate | null;
  isOpen: boolean;
  onClose: () => void;
}) {
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  if (!template) return null;

  const handleSend = async () => {
    if (!email.trim()) {
      alert('Please enter an email address');
      return;
    }

    setSending(true);
    setResult(null);

    try {
      const response = await fetch(`/api/admin/email-templates/${template.id}/test`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      const data = await response.json();

      if (response.ok) {
        setResult({ success: true, message: 'Test email sent successfully!' });
      } else {
        setResult({ success: false, message: data.message ?? 'Failed to send test email' });
      }
    } catch (error) {
      setResult({ success: false, message: 'Error sending test email' });
    } finally {
      setSending(false);
    }
  };

  return (
    <BizModal isOpen={isOpen} onClose={onClose} title={`Test Email: ${template.name}`} size="small">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Recipient Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 border rounded"
            placeholder="test@example.com"
          />
          <p className="text-xs text-gray-500 mt-1">
            Test email will use sample data for variables
          </p>
        </div>

        {result && (
          <div className={`p-3 rounded text-sm ${
            result.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
          }`}>
            {result.message}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-4 border-t">
          <BizModalButton variant="secondary" onClick={onClose} disabled={sending}>
            Close
          </BizModalButton>
          <BizModalButton variant="primary" onClick={handleSend} disabled={sending}>
            {sending ? 'Sending...' : 'Send Test Email'}
          </BizModalButton>
        </div>
      </div>
    </BizModal>
  );
}

/**
 * Template Editor Modal Component
 */
function TemplateEditorModal({
  template,
  isOpen,
  onClose,
  onSave
}: {
  template?: EmailTemplate | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
}) {
  const [formData, setFormData] = useState<TemplateFormData>({
    name: template?.name ?? '',
    category: template?.category ?? 'notification',
    subject: template?.subject ?? '',
    body_html: template?.body_html ?? '',
    body_text: template?.body_text ?? '',
    available_variables: template?.available_variables?.join(', ') ?? '',
    is_active: template?.is_active ?? true
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (template) {
      setFormData({
        name: template.name,
        category: template.category,
        subject: template.subject,
        body_html: template.body_html,
        body_text: template.body_text,
        available_variables: template.available_variables.join(', '),
        is_active: template.is_active
      });
    }
  }, [template]);

  const handleSubmit = async () => {
    if (!formData.name.trim() || !formData.subject.trim()) {
      alert('Name and subject are required');
      return;
    }

    setSubmitting(true);
    try {
      const variablesArray = formData.available_variables
        .split(',')
        .map(v => v.trim())
        .filter(v => v.length > 0);

      const payload = {
        ...formData,
        available_variables: variablesArray
      };

      const url = template
        ? `/api/admin/email-templates/${template.id}`
        : '/api/admin/email-templates';

      const method = template ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        onSave();
        onClose();
      } else {
        const error = await response.json();
        alert(error.message ?? 'Failed to save template');
      }
    } catch (error) {
      alert('Error saving template');
    } finally {
      setSubmitting(false);
    }
  };

  const categories: { key: TemplateCategory; label: string }[] = [
    { key: 'welcome', label: 'Welcome' },
    { key: 'password_reset', label: 'Password Reset' },
    { key: 'verification', label: 'Email Verification' },
    { key: 'notification', label: 'Notification' },
    { key: 'marketing', label: 'Marketing' },
    { key: 'system', label: 'System' }
  ];

  return (
    <BizModal
      isOpen={isOpen}
      onClose={onClose}
      title={template ? `Edit Template: ${template.name}` : 'Create Email Template'}
      size="large"
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border rounded"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Category *</label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value as TemplateCategory })}
              className="w-full px-3 py-2 border rounded"
            >
              {categories.map(cat => (
                <option key={cat.key} value={cat.key}>{cat.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Subject *</label>
          <input
            type="text"
            value={formData.subject}
            onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
            className="w-full px-3 py-2 border rounded"
            placeholder="Welcome to {{site_name}}!"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">HTML Body</label>
          <textarea
            value={formData.body_html}
            onChange={(e) => setFormData({ ...formData, body_html: e.target.value })}
            className="w-full px-3 py-2 border rounded font-mono text-sm"
            rows={10}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Plain Text Body</label>
          <textarea
            value={formData.body_text}
            onChange={(e) => setFormData({ ...formData, body_text: e.target.value })}
            className="w-full px-3 py-2 border rounded"
            rows={5}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Available Variables (comma-separated)</label>
          <input
            type="text"
            value={formData.available_variables}
            onChange={(e) => setFormData({ ...formData, available_variables: e.target.value })}
            className="w-full px-3 py-2 border rounded"
            placeholder="user_name, user_email, verification_link"
          />
          <p className="text-xs text-gray-500 mt-1">
            Variables can be used in subject and body as: {`{{variable_name}}`}
          </p>
        </div>

        <div>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
            />
            <span className="text-sm font-medium">Active Template</span>
          </label>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <BizModalButton variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </BizModalButton>
          <BizModalButton variant="primary" onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Saving...' : template ? 'Update' : 'Create'}
          </BizModalButton>
        </div>
      </div>
    </BizModal>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

/**
 * AdminEmailTemplatesPage - Email template management for platform administrators
 *
 * Provides CRUD operations for email templates with preview and testing.
 * Requires admin role for access.
 *
 * @component
 * @returns {JSX.Element} Admin email templates interface
 */
export default function AdminEmailTemplatesPage() {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [testEmailModalOpen, setTestEmailModalOpen] = useState(false);
  const [filterCategory, setFilterCategory] = useState<TemplateCategory | 'all'>('all');
  const [loading, setLoading] = useState(true);

  // ============================================================================
  // DATA FETCHING
  // ============================================================================

  // GOVERNANCE FIX: useEffect MUST be called before any early returns
  // React Rules of Hooks: Hooks must be called in the same order on every render
  useEffect(() => {
    // Only fetch if user is admin - conditional logic INSIDE the hook
    if (user?.role === 'admin') {
      fetchTemplates();
    }
  }, [user]);

  // Conditional returns AFTER all hooks
  if (!user) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (user.role !== 'admin') {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-red-600 font-medium">Access Denied: Admin privileges required</div>
      </div>
    );
  }

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/email-templates', {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setTemplates(data.data?.templates ?? []);
      }
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  // ============================================================================
  // ACTION HANDLERS
  // ============================================================================

  const handleDelete = async (template: EmailTemplate) => {
    if (!confirm(`Delete template "${template.name}"?`)) {
      return;
    }

    try {
      // @governance MANDATORY - CSRF protection for DELETE requests
      // Source: osi-production-compliance.mdc, Layer 7 Security
      const response = await fetchWithCsrf(`/api/admin/email-templates/${template.id}`, {method: 'DELETE'});

      if (response.ok) {
        await fetchTemplates();
      } else {
        alert('Failed to delete template');
      }
    } catch (error) {
      alert('Error deleting template');
    }
  };

  // ============================================================================
  // FILTERING
  // ============================================================================

  const filteredTemplates = filterCategory === 'all'
    ? templates
    : templates.filter(t => t.category === filterCategory);

  // ============================================================================
  // RENDER
  // ============================================================================

  const categories: { key: TemplateCategory | 'all'; label: string }[] = [
    { key: 'all', label: 'All Categories' },
    { key: 'welcome', label: 'Welcome' },
    { key: 'password_reset', label: 'Password Reset' },
    { key: 'verification', label: 'Verification' },
    { key: 'notification', label: 'Notification' },
    { key: 'marketing', label: 'Marketing' },
    { key: 'system', label: 'System' }
  ];

  return (
    <>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">Email Templates</h1>
          <a
            href="/email-template-compare.html"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#ed6437] rounded hover:bg-[#d4552e] transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="8" height="18" rx="1"/><rect x="14" y="3" width="8" height="18" rx="1"/></svg>
            Compare All
          </a>
        </div>

        <div className="flex gap-4">
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value as TemplateCategory | 'all')}
            className="px-4 py-2 border rounded"
          >
            {categories.map(cat => (
              <option key={cat.key} value={cat.key}>{cat.label}</option>
            ))}
          </select>

          <button
            onClick={() => {
              setSelectedTemplate(null);
              setEditorOpen(true);
            }}
            className="px-4 py-2 bg-[#ed6437] text-white rounded hover:bg-[#d55a2f]"
          >
            Create Template
          </button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="bg-white p-8 rounded shadow text-center text-gray-500">
          Loading templates...
        </div>
      ) : filteredTemplates.length === 0 ? (
        <div className="bg-white p-8 rounded shadow text-center text-gray-500">
          No templates found
        </div>
      ) : (
        <div className="bg-white rounded shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium">Name</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Category</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Subject</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredTemplates.map(template => (
                <tr key={template.id} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{template.name}</td>
                  <td className="px-4 py-3">
                    <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded capitalize">
                      {template.category.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm">{template.subject}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded ${
                      template.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {template.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right text-sm font-medium min-w-[160px]">
                    <div className="flex items-center justify-end space-x-1 flex-shrink-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedTemplate(template);
                          setPreviewModalOpen(true);
                        }}
                        className="p-2 rounded active:scale-95 transition-all flex-shrink-0 text-[#1e3a5f] hover:bg-[#1e3a5f]/10"
                        aria-label="Preview"
                        title="Preview"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedTemplate(template);
                          setTestEmailModalOpen(true);
                        }}
                        className="p-2 rounded active:scale-95 transition-all flex-shrink-0 text-[#1e3a5f] hover:bg-[#1e3a5f]/10"
                        aria-label="Test"
                        title="Test"
                      >
                        <FlaskConical className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedTemplate(template);
                          setEditorOpen(true);
                        }}
                        className="p-2 rounded active:scale-95 transition-all flex-shrink-0 text-[#1e3a5f] hover:bg-[#1e3a5f]/10"
                        aria-label="Edit"
                        title="Edit"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(template);
                        }}
                        className="p-2 rounded active:scale-95 transition-all flex-shrink-0 text-red-600 hover:bg-red-50"
                        aria-label="Delete"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modals */}
      <TemplateEditorModal
        template={selectedTemplate}
        isOpen={editorOpen}
        onClose={() => {
          setEditorOpen(false);
          setSelectedTemplate(null);
        }}
        onSave={fetchTemplates}
      />

      <TemplatePreviewModal
        template={selectedTemplate}
        isOpen={previewModalOpen}
        onClose={() => {
          setPreviewModalOpen(false);
          setSelectedTemplate(null);
        }}
      />

      <TestEmailModal
        template={selectedTemplate}
        isOpen={testEmailModalOpen}
        onClose={() => {
          setTestEmailModalOpen(false);
          setSelectedTemplate(null);
        }}
      />
    </>
  );
}
