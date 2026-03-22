/**
 * Admin Billing & Payment Testing Reference Dashboard
 *
 * GOVERNANCE COMPLIANCE:
 * - Component tier: STANDARD (static reference display)
 * - Client Component: 'use client'
 * - Admin authentication required
 * - NO direct database access
 * - Static reference only: no API calls, no dynamic data
 *
 * Purpose:
 * - Test card reference with copy-to-clipboard
 * - CLI commands for Stripe CLI and vitest
 * - Service test coverage inventory
 *
 * @tier STANDARD
 * @phase Phase 8 - E2E Testing & Test Mode
 * @authority docs/components/billing&subs/phases/PHASE_8_BRAIN_PLAN.md
 */

'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useCallback } from 'react';
import { useAuth } from '@core/hooks/useAuth';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import {
  CreditCard,
  Terminal,
  Copy,
  CheckCircle2,
  AlertTriangle,
  Info,
  CheckCircle,
  FlaskConical
} from 'lucide-react';

// =============================================================================
// Copy Button Component
// =============================================================================

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text.replace(/\s/g, ''));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: silently ignore
    }
  }, [text]);

  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1 px-2 py-1 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
      title={`Copy ${label}`}
    >
      {copied ? (
        <>
          <CheckCircle2 className="w-3 h-3 text-green-500" />
          <span className="text-green-600">Copied</span>
        </>
      ) : (
        <>
          <Copy className="w-3 h-3" />
          <span>Copy</span>
        </>
      )}
    </button>
  );
}

// =============================================================================
// CLI Copy Button (preserves spaces)
// =============================================================================

function CliCopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: silently ignore
    }
  }, [text]);

  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1 px-2 py-1 text-xs text-gray-400 hover:text-green-300 hover:bg-gray-800 rounded transition-colors flex-shrink-0"
      title="Copy command"
    >
      {copied ? (
        <>
          <CheckCircle2 className="w-3 h-3 text-green-400" />
          <span className="text-green-400">Copied</span>
        </>
      ) : (
        <>
          <Copy className="w-3 h-3" />
          <span>Copy</span>
        </>
      )}
    </button>
  );
}

// =============================================================================
// ErrorFallback
// =============================================================================

function ErrorFallback({ error }: { error: Error }) {
  return (
    <div className="p-6 text-center text-red-600">
      <p className="font-semibold">Error loading billing test dashboard</p>
      <p className="text-sm mt-1">{error.message}</p>
    </div>
  );
}

// =============================================================================
// Main Dashboard Content
// =============================================================================

function AdminBillingTestPageContent() {
  const { user } = useAuth();

  if (user?.role !== 'admin') {
    return (
      <div className="p-8 text-center text-gray-600">
        Access denied. Admin privileges required.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-[#ed6437]" />
            Billing &amp; Payment Testing
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Test card reference, CLI commands, and billing service test guide.
          </p>
        </div>

        {/* Section 2: Success Test Cards */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
            <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              Success Test Cards
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              CVC: Any 3 digits (4 for Amex). Expiry: Any future date. ZIP: Any valid format.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-2 text-xs font-semibold text-gray-600 uppercase">Brand</th>
                  <th className="text-left px-4 py-2 text-xs font-semibold text-gray-600 uppercase">Card Number</th>
                  <th className="text-left px-4 py-2 text-xs font-semibold text-gray-600 uppercase">CVC</th>
                  <th className="text-left px-4 py-2 text-xs font-semibold text-gray-600 uppercase">Notes</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {[
                  { brand: 'Visa', number: '4242 4242 4242 4242', cvc: 'Any 3', notes: 'Standard success' },
                  { brand: 'Mastercard', number: '5555 5555 5555 4444', cvc: 'Any 3', notes: 'Standard success' },
                  { brand: 'Amex', number: '3782 822463 10005', cvc: 'Any 4', notes: '4-digit CVC' },
                  { brand: 'Discover', number: '6011 1111 1111 1117', cvc: 'Any 3', notes: 'Standard success' },
                  { brand: 'JCB', number: '3566 0020 2036 0505', cvc: 'Any 3', notes: 'Standard success' },
                ].map(card => (
                  <tr key={card.brand} className="hover:bg-gray-50">
                    <td className="px-4 py-2 font-medium text-gray-900">{card.brand}</td>
                    <td className="px-4 py-2 font-mono text-gray-700">{card.number}</td>
                    <td className="px-4 py-2 text-gray-600">{card.cvc}</td>
                    <td className="px-4 py-2 text-gray-500 text-xs">{card.notes}</td>
                    <td className="px-4 py-2">
                      <CopyButton text={card.number} label={`${card.brand} card number`} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Section 2b: Decline Test Cards */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
            <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              Decline Test Cards
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-2 text-xs font-semibold text-gray-600 uppercase">Scenario</th>
                  <th className="text-left px-4 py-2 text-xs font-semibold text-gray-600 uppercase">Card Number</th>
                  <th className="text-left px-4 py-2 text-xs font-semibold text-gray-600 uppercase">Result</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {[
                  { scenario: 'Generic decline', number: '4000 0000 0000 0002', result: 'Card declined' },
                  { scenario: 'Insufficient funds', number: '4000 0000 0000 9995', result: 'Insufficient funds' },
                  { scenario: 'Expired card', number: '4000 0000 0000 0069', result: 'Expired card' },
                  { scenario: 'CVC fail', number: '4000 0000 0000 0127', result: 'CVC check fails' },
                ].map(card => (
                  <tr key={card.scenario} className="hover:bg-gray-50">
                    <td className="px-4 py-2 font-medium text-gray-900">{card.scenario}</td>
                    <td className="px-4 py-2 font-mono text-gray-700">{card.number}</td>
                    <td className="px-4 py-2 text-red-600 text-xs">{card.result}</td>
                    <td className="px-4 py-2">
                      <CopyButton text={card.number} label="card number" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Section 2c: 3D Secure Cards */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
            <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-blue-500" />
              3D Secure Test Cards
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-2 text-xs font-semibold text-gray-600 uppercase">Scenario</th>
                  <th className="text-left px-4 py-2 text-xs font-semibold text-gray-600 uppercase">Card Number</th>
                  <th className="text-left px-4 py-2 text-xs font-semibold text-gray-600 uppercase">Result</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {[
                  { scenario: 'Auth required (pass)', number: '4000 0027 6000 3184', result: 'Auth → succeeds' },
                  { scenario: 'Auth required (fail)', number: '4000 0082 6000 3178', result: 'Auth → fails' },
                ].map(card => (
                  <tr key={card.scenario} className="hover:bg-gray-50">
                    <td className="px-4 py-2 font-medium text-gray-900">{card.scenario}</td>
                    <td className="px-4 py-2 font-mono text-gray-700">{card.number}</td>
                    <td className="px-4 py-2 text-blue-600 text-xs">{card.result}</td>
                    <td className="px-4 py-2">
                      <CopyButton text={card.number} label="card number" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Section 3: ACH Test Accounts */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
            <h2 className="text-sm font-semibold text-gray-900">ACH Test Accounts</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-2 text-xs font-semibold text-gray-600 uppercase">Routing</th>
                  <th className="text-left px-4 py-2 text-xs font-semibold text-gray-600 uppercase">Account</th>
                  <th className="text-left px-4 py-2 text-xs font-semibold text-gray-600 uppercase">Result</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <tr className="hover:bg-gray-50">
                  <td className="px-4 py-2 font-mono text-gray-700">110000000</td>
                  <td className="px-4 py-2 font-mono text-gray-700">000123456789</td>
                  <td className="px-4 py-2 text-green-600 text-xs font-medium">Success</td>
                </tr>
                <tr className="hover:bg-gray-50">
                  <td className="px-4 py-2 font-mono text-gray-700">110000000</td>
                  <td className="px-4 py-2 font-mono text-gray-700">000111111116</td>
                  <td className="px-4 py-2 text-red-600 text-xs font-medium">Failure</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Section 4: CLI Commands */}
        <div className="bg-gray-900 rounded-lg overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-2 bg-gray-800">
            <Terminal className="w-4 h-4 text-gray-400" />
            <span className="text-sm font-medium text-gray-300">CLI Commands</span>
          </div>
          <div className="p-4 space-y-4 font-mono text-sm">
            <div>
              <p className="text-gray-500"># Stripe CLI - Forward webhooks locally</p>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-green-400 flex-1">stripe listen --forward-to localhost:3000/api/webhooks/stripe</p>
                <CliCopyButton text="stripe listen --forward-to localhost:3000/api/webhooks/stripe" />
              </div>
            </div>
            <div>
              <p className="text-gray-500"># Trigger test events</p>
              {[
                'stripe trigger checkout.session.completed',
                'stripe trigger customer.subscription.created',
                'stripe trigger invoice.payment_succeeded',
                'stripe trigger invoice.payment_failed',
                'stripe trigger charge.refunded',
              ].map(cmd => (
                <div key={cmd} className="flex items-center gap-2 mt-1">
                  <p className="text-green-400 flex-1">{cmd}</p>
                  <CliCopyButton text={cmd} />
                </div>
              ))}
            </div>
            <div>
              <p className="text-gray-500"># Run billing service tests</p>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-green-400 flex-1">npm run test:billing</p>
                <CliCopyButton text="npm run test:billing" />
              </div>
            </div>
            <div>
              <p className="text-gray-500"># Run specific test file</p>
              {[
                'npm run test src/core/services/__tests__/BillingService.test.ts',
                'npm run test src/core/services/__tests__/RefundService.test.ts',
              ].map(cmd => (
                <div key={cmd} className="flex items-center gap-2 mt-1">
                  <p className="text-green-400 flex-1">{cmd}</p>
                  <CliCopyButton text={cmd} />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Section 5: Service Test Coverage */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
            <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <FlaskConical className="w-4 h-4 text-[#ed6437]" />
              Service Test Coverage
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-2 text-xs font-semibold text-gray-600 uppercase">Service</th>
                  <th className="text-left px-4 py-2 text-xs font-semibold text-gray-600 uppercase">Test File</th>
                  <th className="text-left px-4 py-2 text-xs font-semibold text-gray-600 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {[
                  { service: 'BillingService', file: 'BillingService.test.ts', status: 'Available', available: true },
                  { service: 'RefundService', file: 'RefundService.test.ts', status: 'Available', available: true },
                  { service: 'PaymentMethodService', file: '—', status: 'Planned', available: false },
                  { service: 'BillingReceiptService', file: '—', status: 'Planned', available: false },
                  { service: 'CampaignBankService', file: '—', status: 'Planned', available: false },
                ].map(row => (
                  <tr key={row.service} className="hover:bg-gray-50">
                    <td className="px-4 py-2 font-medium text-gray-900">{row.service}</td>
                    <td className="px-4 py-2 font-mono text-xs text-gray-600">{row.file}</td>
                    <td className="px-4 py-2">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        row.available
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-500'
                      }`}>
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Section 6: Tips and Pitfalls */}
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-blue-900 mb-2 flex items-center gap-1">
              <Info className="w-4 h-4" />
              Testing Tips
            </h3>
            <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
              <li>Use Stripe CLI to forward webhook events locally</li>
              <li>All test cards use any future expiry date</li>
              <li>Test mode keys start with <code className="font-mono bg-blue-100 px-1 rounded">sk_test_</code></li>
              <li>Check Stripe Dashboard &gt; Events for webhook activity</li>
              <li>Refunds process instantly in test mode</li>
            </ul>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-yellow-900 mb-2 flex items-center gap-1">
              <AlertTriangle className="w-4 h-4" />
              Common Pitfalls
            </h3>
            <ul className="text-sm text-yellow-800 space-y-1 list-disc list-inside">
              <li>Never use live keys in development (.env.local)</li>
              <li>Webhook secret must match your Stripe CLI session</li>
              <li>Card numbers must be entered without spaces in Stripe API</li>
              <li>ACH payments have delayed settlement even in test mode</li>
              <li>3DS cards require browser interaction to complete flow</li>
            </ul>
          </div>
        </div>

      </div>
    </div>
  );
}

// =============================================================================
// Page Export
// =============================================================================

export default function AdminBillingTestPage() {
  return (
    <ErrorBoundary fallback={<ErrorFallback error={new Error('Unknown error')} />}>
      <AdminBillingTestPageContent />
    </ErrorBoundary>
  );
}
