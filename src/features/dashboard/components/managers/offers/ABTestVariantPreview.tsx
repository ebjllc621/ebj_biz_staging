/**
 * ABTestVariantPreview - Preview A/B test variants side by side
 *
 * @component Client Component
 * @tier SIMPLE
 * @phase Phase 4.5 - Deferred Items
 * @generated DNA v11.4.0
 */

'use client';

import { Eye, Tag, ImageIcon, DollarSign } from 'lucide-react';

interface ABTestVariantPreviewProps {
  variantType: 'title' | 'image' | 'price';
  variantAValue: string;
  variantBValue: string;
  className?: string;
}

export function ABTestVariantPreview({
  variantType,
  variantAValue,
  variantBValue,
  className = '',
}: ABTestVariantPreviewProps) {
  const getIcon = () => {
    switch (variantType) {
      case 'title':
        return <Tag className="w-4 h-4" />;
      case 'image':
        return <ImageIcon className="w-4 h-4" />;
      case 'price':
        return <DollarSign className="w-4 h-4" />;
      default:
        return <Eye className="w-4 h-4" />;
    }
  };

  const renderVariant = (value: string, label: string) => {
    if (variantType === 'image') {
      return (
        <div className="flex-1">
          <p className="text-xs text-gray-500 mb-2 text-center">{label}</p>
          <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden">
            {value ? (
              <img
                src={value}
                alt={label}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <ImageIcon className="w-8 h-8 text-gray-300" />
              </div>
            )}
          </div>
        </div>
      );
    }

    if (variantType === 'price') {
      return (
        <div className="flex-1 text-center">
          <p className="text-xs text-gray-500 mb-2">{label}</p>
          <div className="bg-gray-50 rounded-lg p-4">
            <span className="text-2xl font-bold text-gray-900">
              ${value}
            </span>
          </div>
        </div>
      );
    }

    // Default: title
    return (
      <div className="flex-1 text-center">
        <p className="text-xs text-gray-500 mb-2">{label}</p>
        <div className="bg-gray-50 rounded-lg p-4">
          <p className="font-medium text-gray-900 line-clamp-2">{value}</p>
        </div>
      </div>
    );
  };

  return (
    <div className={`bg-white border border-gray-200 rounded-xl p-4 ${className}`}>
      <div className="flex items-center gap-2 mb-4">
        <div className="p-2 bg-purple-100 rounded-lg text-purple-600">
          {getIcon()}
        </div>
        <div>
          <h4 className="font-medium text-gray-900">Variant Preview</h4>
          <p className="text-xs text-gray-500 capitalize">
            Testing {variantType}
          </p>
        </div>
      </div>

      <div className="flex gap-4">
        {renderVariant(variantAValue, 'Variant A (Current)')}
        <div className="w-px bg-gray-200" />
        {renderVariant(variantBValue, 'Variant B (New)')}
      </div>

      <p className="text-xs text-gray-400 text-center mt-4">
        Traffic will be split 50/50 between variants
      </p>
    </div>
  );
}
