/**
 * ListingProducts - Products/Services Price List
 *
 * @component Client Component
 * @tier STANDARD
 * @phase Phase 4 - Missing Components
 * @generated DNA v11.4.0
 * @governance Build Map v2.1 ENHANCED
 *
 * Features:
 * - Price list with name, description, price, image
 * - Featured products highlighted
 * - Category grouping
 * - Responsive grid layout (1/2/3 cols)
 * - Edit mode empty state with configure link
 * - Published mode returns null if no visible products
 *
 * @see docs/pages/layouts/listings/details/detailspageenhance/3-1-26/phases/PHASE_4_BRAIN_PLAN.md
 */
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ShoppingBag, DollarSign, Tag, Settings } from 'lucide-react';
import type { Listing } from '@core/services/ListingService';

interface Product {
  id: number;
  name: string;
  description: string | null;
  price: number | null;
  price_display: string | null;
  image_url: string | null;
  category: string | null;
  sku: string | null;
  is_featured: boolean;
}

interface ListingProductsProps {
  /** Listing data */
  listing: Listing;
  /** Whether in edit mode */
  isEditing?: boolean;
}

/**
 * Format price display
 */
function formatPrice(product: Product): string {
  if (product.price_display) {
    return product.price_display;
  }
  if (product.price !== null) {
    return `$${product.price.toFixed(2)}`;
  }
  return 'Price upon request';
}

export function ListingProducts({ listing, isEditing }: ListingProductsProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch products
  useEffect(() => {
    let isMounted = true;

    async function fetchProducts() {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `/api/listings/${listing.id}/products`,
          { credentials: 'include' }
        );

        if (!response.ok) {
          throw new Error('Failed to fetch products');
        }

        const result = await response.json();
        if (isMounted && result.success) {
          setProducts(result.data?.products || []);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to load products');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    fetchProducts();

    return () => {
      isMounted = false;
    };
  }, [listing.id]);

  // Show empty state in edit mode when no products
  if (isEditing && !isLoading && products.length === 0) {
    return (
      <section className="bg-white rounded-lg shadow-sm p-6 border-2 border-dashed border-gray-300">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
            <ShoppingBag className="w-6 h-6 text-gray-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-700 mb-1">
              Products & Services
            </h3>
            <p className="text-sm text-gray-500 mb-3">
              No products yet. Add your product catalog or service menu.
            </p>
            <Link
              href={`/dashboard/listings/${String(listing.id)}/products` as any}
              className="inline-flex items-center gap-2 px-4 py-2 bg-biz-navy text-white text-sm font-medium rounded-md hover:bg-biz-navy/90 transition-colors"
            >
              <Settings className="w-4 h-4" />
              Configure
            </Link>
          </div>
        </div>
      </section>
    );
  }

  // Return null in published mode when no products
  if (!isLoading && products.length === 0) {
    return null;
  }

  return (
    <section className="bg-white rounded-lg shadow-sm p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-biz-navy flex items-center gap-2">
          <ShoppingBag className="w-6 h-6 text-biz-orange" />
          Products & Services
          {!isLoading && products.length > 0 && (
            <span className="text-sm font-normal text-gray-500">
              ({products.length})
            </span>
          )}
        </h2>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="border border-gray-200 rounded-lg overflow-hidden animate-pulse">
              <div className="w-full h-40 bg-gray-200"></div>
              <div className="p-4">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-full mb-1"></div>
                <div className="h-4 bg-gray-200 rounded w-1/3"></div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error State */}
      {error && !isLoading && (
        <div className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg p-4">
          {error}
        </div>
      )}

      {/* Products Grid */}
      {!isLoading && !error && products.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((product) => (
            <div
              key={product.id}
              className={`border rounded-lg overflow-hidden hover:shadow-lg transition-shadow ${
                product.is_featured
                  ? 'ring-2 ring-biz-orange'
                  : 'border-gray-200'
              }`}
            >
              {/* Product Image */}
              {product.image_url ? (
                <div className="relative w-full h-40 bg-gray-100">
                  <img
                    src={product.image_url}
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                  {product.is_featured && (
                    <span className="absolute top-2 right-2 px-3 py-1 rounded-full text-xs font-medium bg-biz-orange text-white">
                      Featured
                    </span>
                  )}
                </div>
              ) : (
                <div className="w-full h-40 bg-gray-100 flex items-center justify-center">
                  <ShoppingBag className="w-12 h-12 text-gray-400" />
                </div>
              )}

              {/* Product Info */}
              <div className="p-4">
                {/* Category Badge */}
                {product.category && (
                  <div className="flex items-center gap-1 mb-2">
                    <Tag className="w-3 h-3 text-gray-400" />
                    <span className="text-xs text-gray-500">{product.category}</span>
                  </div>
                )}

                {/* Product Name */}
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {product.name}
                </h3>

                {/* Description */}
                {product.description && (
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                    {product.description}
                  </p>
                )}

                {/* Price */}
                <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
                  <DollarSign className="w-5 h-5 text-biz-orange" />
                  <span className="text-lg font-bold text-biz-navy">
                    {formatPrice(product)}
                  </span>
                </div>

                {/* SKU */}
                {product.sku && (
                  <p className="text-xs text-gray-400 mt-2">SKU: {product.sku}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
