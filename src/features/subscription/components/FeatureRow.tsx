/**
 * FeatureRow - Table row for plan comparison feature matrix
 *
 * Displays a feature name and values across multiple plans with highlighting.
 *
 * @authority PHASE_5.5_BRAIN_PLAN.md - Plan Selection Interface
 * @governance Build Map v2.1 ENHANCED compliance
 */

'use client';

export interface FeatureRowProps {
  feature: string;
  values: (string | number | boolean)[];
  highlightIndex?: number;
}

/**
 * FeatureRow - Renders a single feature comparison row
 *
 * @component
 * @param {FeatureRowProps} props - Component props
 * @returns {JSX.Element} Rendered feature row
 *
 * @example
 * ```tsx
 * <FeatureRow
 *   feature="Images"
 *   values={[6, 12, 100, 100]}
 *   highlightIndex={2}
 * />
 * ```
 */
export function FeatureRow({ feature, values, highlightIndex }: FeatureRowProps) {
  const formatValue = (value: string | number | boolean): string => {
    if (typeof value === 'boolean') {
      return value ? '✓' : '✗';
    }
    if (typeof value === 'number') {
      return value === -1 ? 'Unlimited' : String(value);
    }
    return String(value);
  };

  return (
    <tr className="border-b border-gray-200 hover:bg-gray-50">
      <td className="p-4 text-left font-medium text-gray-700">{feature}</td>
      {values.map((value, index) => (
        <td
          key={index}
          className={`p-4 text-center ${
            highlightIndex === index ? 'bg-blue-50 font-semibold' : ''
          }`}
        >
          <span
            className={
              typeof value === 'boolean'
                ? value
                  ? 'text-green-600 font-bold text-lg'
                  : 'text-red-500 font-bold text-lg'
                : 'text-gray-900'
            }
          >
            {formatValue(value)}
          </span>
        </td>
      ))}
    </tr>
  );
}
