/**
 * FeatureComparisonTable - Detailed feature matrix comparison
 *
 * @tier STANDARD
 * @phase Phase 3 - Public Memberships Page
 */
'use client';

import { Check, X } from 'lucide-react';

interface FeatureRow {
  feature: string;
  essential: string | boolean;
  plus: string | boolean;
  preferred: string | boolean;
  premium: string | boolean;
}

const FEATURE_ROWS: FeatureRow[] = [
  {
    feature: 'Category Listings',
    essential: '6',
    plus: '12',
    preferred: '20',
    premium: 'Unlimited'
  },
  {
    feature: 'Images',
    essential: '6',
    plus: '12',
    preferred: '100',
    premium: '100'
  },
  {
    feature: 'Videos',
    essential: '1',
    plus: '10',
    preferred: '50',
    premium: '50'
  },
  {
    feature: 'Offers per Month',
    essential: '4',
    plus: '10',
    preferred: '50',
    premium: 'Unlimited'
  },
  {
    feature: 'Events per Month',
    essential: '4',
    plus: '10',
    preferred: '50',
    premium: 'Unlimited'
  },
  {
    feature: 'Team Members',
    essential: '3',
    plus: '10',
    preferred: '50',
    premium: 'Unlimited'
  },
  {
    feature: 'HTML Descriptions',
    essential: false,
    plus: true,
    preferred: true,
    premium: true
  },
  {
    feature: 'File Attachments',
    essential: '0',
    plus: '3',
    preferred: '10',
    premium: '10'
  },
  {
    feature: 'Job Postings',
    essential: '0',
    plus: '5/month',
    preferred: '25/month',
    premium: 'Unlimited'
  },
  {
    feature: 'Project Showcase',
    essential: '0',
    plus: '10',
    preferred: '50',
    premium: 'Unlimited'
  },
  {
    feature: 'Featured Placement',
    essential: false,
    plus: false,
    preferred: true,
    premium: true
  },
  {
    feature: 'Premium Placement',
    essential: false,
    plus: false,
    preferred: false,
    premium: true
  },
  {
    feature: 'Free Add-on Suites',
    essential: '0',
    plus: '0',
    preferred: '0',
    premium: '2'
  },
  {
    feature: 'Campaign Credit',
    essential: '—',
    plus: '—',
    preferred: '—',
    premium: '$250'
  },
  {
    feature: 'Support Level',
    essential: 'Community',
    plus: 'Priority',
    preferred: 'Dedicated',
    premium: 'White-glove'
  }
];

function renderCellValue(value: string | boolean): React.ReactNode {
  if (typeof value === 'boolean') {
    return value ? (
      <Check className="w-5 h-5 text-green-500 mx-auto" />
    ) : (
      <X className="w-5 h-5 text-gray-300 mx-auto" />
    );
  }
  return <span className="text-gray-900">{value}</span>;
}

export function FeatureComparisonTable() {
  return (
    <section className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Title */}
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-biz-navy mb-4">
            Compare Features
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            See exactly what's included in each tier to find the perfect fit for your business.
          </p>
        </div>

        {/* Desktop Table */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b-2 border-gray-200">
                <th className="py-4 px-4 text-left font-semibold text-biz-navy">Feature</th>
                <th className="py-4 px-4 text-center font-semibold text-biz-navy">Essential</th>
                <th className="py-4 px-4 text-center font-semibold text-biz-navy bg-orange-50">Plus</th>
                <th className="py-4 px-4 text-center font-semibold text-biz-navy">Preferred</th>
                <th className="py-4 px-4 text-center font-semibold text-biz-navy">Premium</th>
              </tr>
            </thead>
            <tbody>
              {FEATURE_ROWS.map((row, index) => (
                <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4 font-medium text-gray-700">{row.feature}</td>
                  <td className="py-3 px-4 text-center">{renderCellValue(row.essential)}</td>
                  <td className="py-3 px-4 text-center bg-orange-50">{renderCellValue(row.plus)}</td>
                  <td className="py-3 px-4 text-center">{renderCellValue(row.preferred)}</td>
                  <td className="py-3 px-4 text-center">{renderCellValue(row.premium)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="lg:hidden space-y-6">
          {['essential', 'plus', 'preferred', 'premium'].map((tier) => (
            <div key={tier} className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-xl font-bold text-biz-navy mb-4 capitalize">{tier}</h3>
              <div className="space-y-3">
                {FEATURE_ROWS.map((row, index) => (
                  <div key={index} className="flex justify-between items-center border-b border-gray-100 pb-2">
                    <span className="text-sm text-gray-600">{row.feature}</span>
                    <span className="text-sm font-medium">
                      {renderCellValue(row[tier as keyof FeatureRow] as string | boolean)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
