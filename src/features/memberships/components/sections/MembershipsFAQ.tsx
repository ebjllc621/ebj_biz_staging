/**
 * MembershipsFAQ - FAQ accordion section
 *
 * @tier STANDARD
 * @phase Phase 3 - Public Memberships Page
 */
'use client';

import { useState } from 'react';
import { FAQItem } from '../FAQItem';
import { FAQ_DATA } from '../../constants/faq-data';

export function MembershipsFAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const handleToggle = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section className="py-16 bg-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Title */}
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-biz-navy mb-4">
            Frequently Asked Questions
          </h2>
          <p className="text-lg text-gray-600">
            Everything you need to know about Bizconekt memberships
          </p>
        </div>

        {/* FAQ Items */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          {FAQ_DATA.map((item, index) => (
            <FAQItem
              key={index}
              item={item}
              isOpen={openIndex === index}
              onToggle={() => handleToggle(index)}
            />
          ))}
        </div>

        {/* Additional Help */}
        <div className="mt-8 text-center">
          <p className="text-gray-600">
            Still have questions?{' '}
            <a href="/contact" className="text-[#ed6437] hover:underline font-medium">
              Contact our sales team
            </a>
            {' '}for personalized assistance.
          </p>
        </div>
      </div>
    </section>
  );
}
