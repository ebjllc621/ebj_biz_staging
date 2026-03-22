/**
 * AddPaymentMethodModal - Stripe PaymentElement integration for adding payment methods
 *
 * Uses Stripe's PaymentElement which automatically renders all enabled payment methods:
 * - Credit/debit cards (Visa, MC, Amex, Discover, etc.)
 * - ACH bank transfers (US bank accounts)
 * - PayPal
 * - Apple Pay / Google Pay (when available on device)
 *
 * Flow:
 * 1. Modal opens -> calls /api/billing/setup-intent to get client_secret
 * 2. Renders Stripe PaymentElement with the client_secret
 * 3. User fills in payment details
 * 4. On submit -> confirmSetup() sends details to Stripe
 * 5. On success -> calls /api/billing/payment-methods POST to save locally
 * 6. Closes modal and refreshes the payment methods list
 *
 * @tier ADVANCED
 * @authority MASTER_BILLING_BRAIN_PLAN.md Phase 1
 */

'use client';

import { useState, useCallback, useEffect } from 'react';
import { useStripe, useElements, PaymentElement } from '@stripe/react-stripe-js';
import { BizModal } from '@/components/BizModal';
import { StripeProvider } from './StripeProvider';
import { TestModeBanner } from './TestModeBanner';
import { fetchWithCsrf } from '@core/utils/csrf';
import { Loader2, ShieldCheck } from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

interface AddPaymentMethodModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

// ============================================================================
// INNER FORM (requires Stripe context)
// ============================================================================

function PaymentMethodForm({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setSubmitting(true);
    setError(null);

    try {
      const { error: stripeError, setupIntent } = await stripe.confirmSetup({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/dashboard/account/payment-methods`,
        },
        redirect: 'if_required',
      });

      if (stripeError) {
        setError(stripeError.message || 'Payment setup failed. Please try again.');
        setSubmitting(false);
        return;
      }

      if (setupIntent?.payment_method) {
        const pmId = typeof setupIntent.payment_method === 'string'
          ? setupIntent.payment_method
          : setupIntent.payment_method.id;

        const res = await fetchWithCsrf('/api/billing/payment-methods', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ stripe_payment_method_id: pmId }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({})) as { error?: { message?: string } };
          throw new Error(data?.error?.message || 'Failed to save payment method');
        }

        onSuccess();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  }, [stripe, elements, onSuccess]);

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
      <TestModeBanner />

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="min-h-[200px]">
        <PaymentElement
          onReady={() => setReady(true)}
          options={{
            layout: 'tabs',
            paymentMethodOrder: ['card', 'apple_pay', 'google_pay', 'us_bank_account', 'paypal'],
          }}
        />
        {!ready && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 text-xs text-gray-500 pt-2">
        <ShieldCheck className="w-4 h-4 flex-shrink-0" />
        <span>Your payment details are securely processed by Stripe. We never store card numbers.</span>
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={onClose}
          disabled={submitting}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={submitting || !stripe || !elements || !ready}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-orange-600 rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
          {submitting ? 'Saving...' : 'Add Payment Method'}
        </button>
      </div>
    </form>
  );
}

// ============================================================================
// OUTER MODAL (handles setup intent creation)
// ============================================================================

export function AddPaymentMethodModal({ isOpen, onClose, onSuccess }: AddPaymentMethodModalProps) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch SetupIntent when modal opens
  useEffect(() => {
    if (!isOpen) {
      setClientSecret(null);
      setError(null);
      return;
    }

    let cancelled = false;

    async function createSetupIntent() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetchWithCsrf('/api/billing/setup-intent', {
          method: 'POST',
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({})) as { error?: { message?: string } };
          throw new Error(data?.error?.message || 'Failed to initialize payment form');
        }
        const result = await res.json() as { data?: { client_secret?: string } };
        const secret = result?.data?.client_secret;
        if (!secret) throw new Error('No client secret returned');
        if (!cancelled) setClientSecret(secret);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Something went wrong');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void createSetupIntent();
    return () => { cancelled = true; };
  }, [isOpen]);

  return (
    <BizModal
      isOpen={isOpen}
      onClose={onClose}
      title="Add Payment Method"
      subtitle="Cards, bank accounts, PayPal, Apple Pay, and Google Pay accepted"
      maxWidth="md"
    >
      <div className="p-6">
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
            <span className="ml-3 text-gray-500">Initializing secure payment form...</span>
          </div>
        )}

        {error && !loading && (
          <div className="text-center py-8">
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 mb-4">
              {error}
            </div>
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Close
            </button>
          </div>
        )}

        {clientSecret && !loading && !error && (
          <StripeProvider clientSecret={clientSecret}>
            <PaymentMethodForm onClose={onClose} onSuccess={onSuccess} />
          </StripeProvider>
        )}
      </div>
    </BizModal>
  );
}
