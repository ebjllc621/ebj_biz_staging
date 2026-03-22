/**
 * FAQ Data - Frequently asked questions about memberships
 *
 * @authority docs/buildSpecs/package-addons/marketing/01_FRONTEND_ENGAGEMENT_STRATEGY.md
 * @tier SIMPLE
 * @phase Phase 3 - Public Memberships Page
 */

import { FAQItem } from '../types';

export const FAQ_DATA: FAQItem[] = [
  {
    question: 'Can I start free and upgrade later?',
    answer: 'Absolutely! Every business starts with our Essential tier at no cost. You can upgrade to Plus, Preferred, or Premium at any time as your business grows. Your content and data come with you, and you will unlock additional features immediately upon upgrade.'
  },
  {
    question: 'What payment methods do you accept?',
    answer: 'We accept all major credit cards (Visa, Mastercard, American Express, Discover), PayPal, and ACH bank transfers for annual subscriptions. All payments are processed securely through our encrypted payment gateway.'
  },
  {
    question: 'Can I cancel anytime?',
    answer: 'Yes, you can cancel your subscription at any time with no penalties or fees. For monthly subscriptions, you retain access until the end of your current billing period. Annual subscribers can receive a prorated refund for unused months within the first 30 days.'
  },
  {
    question: 'What happens to my listing if I downgrade?',
    answer: 'If you downgrade, your listing remains active but adjusts to the feature limits of your new tier. For example, if you had 20 category listings on Preferred and downgrade to Plus (12 categories), you will need to select which 12 to keep active. All your content is preserved and can be reactivated if you upgrade again.'
  },
  {
    question: 'Do you offer discounts for annual billing?',
    answer: 'Yes! Annual billing saves you approximately 17% compared to paying monthly - essentially getting 2 months free. For example, Plus is $49/month or $490/year (save $98), and Preferred is $149/month or $1,490/year (save $298).'
  },
  {
    question: 'How does Premium 2 free add-ons work?',
    answer: 'Premium tier members can choose any 2 add-on suites at no additional cost (a value of up to $68/month). Select the suites that best fit your business needs from Creator, Realtor, Restaurant, or SEO Scribe. You can change your selections once per quarter.'
  },
  {
    question: 'Are there setup fees or long-term contracts?',
    answer: 'No setup fees, no hidden costs, and no long-term contracts required. Monthly subscriptions are month-to-month, and annual subscriptions simply offer savings. You are never locked in beyond your current billing period.'
  },
  {
    question: 'Can I add multiple team members to manage my listing?',
    answer: 'Yes! Each tier includes team member access: Essential (3 users), Plus (10 users), Preferred (50 users), and Premium (unlimited). Team members can help manage your listing, respond to reviews, post offers and events, and access analytics.'
  }
];
