/**
 * Billing Test Mode Detection Utility
 * Detects Stripe test mode based on API key prefix.
 *
 * @tier SIMPLE
 * @authority MASTER_BILLING_BRAIN_PLAN.md Phase 8
 */

/**
 * Returns true if Stripe is configured with test API keys (sk_test_ prefix)
 */
export function isBillingTestMode(): boolean {
  return process.env.STRIPE_SECRET_KEY?.startsWith('sk_test_') ?? false;
}

/**
 * Returns 'TEST MODE' label if in test mode, null otherwise
 */
export function getTestModeLabel(): string | null {
  return isBillingTestMode() ? 'TEST MODE' : null;
}

/**
 * Stripe test card numbers for reference
 */
export const STRIPE_TEST_CARDS = {
  success: {
    visa: '4242 4242 4242 4242',
    mastercard: '5555 5555 5555 4444',
    amex: '3782 822463 10005',
    discover: '6011 1111 1111 1117',
    diners: '3056 9309 0259 04',
    jcb: '3566 0020 2036 0505',
    unionpay: '6200 0000 0000 0005',
  },
  decline: {
    generic: '4000 0000 0000 0002',
    insufficient: '4000 0000 0000 9995',
    expired: '4000 0000 0000 0069',
    cvcFail: '4000 0000 0000 0127',
    processing: '4000 0000 0000 0119',
  },
  threeDSecure: {
    authRequired: '4000 0027 6000 3184',
    authFail: '4000 0082 6000 3178',
  },
  ach: {
    success: { routing: '110000000', account: '000123456789' },
    failure: { routing: '110000000', account: '000111111116' },
  },
} as const;
