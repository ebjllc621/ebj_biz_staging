/**
 * Listings validation helpers
 * Runtime input validation for listings endpoints
 * Following anti-synthetic-implementation-enforcement - provides real validation
 * P3.2 Implementation with enhanced error taxonomy integration
 */

import type { EnhancedApiError, ValidationErrorDetail } from '@/lib/http/error-taxonomy';
import { createValidationError } from '@/lib/http/error-taxonomy';
import { validateEmail } from '@/lib/http/request-helpers';
import type { ListingCreate, ListingUpdate, ListingCategory } from './contracts';
import { LISTING_CATEGORIES } from './contracts';

/**
 * Validate listing creation data
 */
export function validateListingCreate(
  data: unknown,
  endpoint?: string
): { valid: true; data: ListingCreate } | { error: EnhancedApiError } {
  
  const errors: ValidationErrorDetail[] = [];
  
  // Type guard for basic object structure
  if (!data || typeof data !== 'object') {
    return {
      error: createValidationError(
        'Request body must be an object',
        [{
          field: 'body',
          message: 'Must be an object',
          value: typeof data
        }],
        endpoint
      )
    };
  }
  
  // Cast to record for property access
  const dataRecord = data as Record<string, unknown>;
  
  // Validate required fields
  const requiredFields = ['title', 'description', 'category', 'contactEmail'];
  for (const field of requiredFields) {
    const value = dataRecord[field];
    if (value === undefined || value === null || value === '') {
      errors.push({
        field,
        message: 'This field is required',
        value
      });
    } else if (typeof value !== 'string') {
      errors.push({
        field,
        message: 'Must be a string',
        value: typeof value
      });
    }
  }
  
  // Validate title length
  if (dataRecord.title && typeof dataRecord.title === 'string') {
    if (dataRecord.title.length < 3) {
      errors.push({
        field: 'title',
        message: 'Title must be at least 3 characters',
        value: dataRecord.title
      });
    }
    if (dataRecord.title.length > 200) {
      errors.push({
        field: 'title',
        message: 'Title must be less than 200 characters',
        value: dataRecord.title
      });
    }
  }
  
  // Validate description length
  // Max is tier-dependent (700-5000 text chars), but HTML tags add overhead
  // Server allows up to 10000 raw chars to accommodate HTML; client enforces text-only limits per tier
  if (dataRecord.description && typeof dataRecord.description === 'string') {
    if (dataRecord.description.replace(/<[^>]*>/g, '').length < 10) {
      errors.push({
        field: 'description',
        message: 'Description must be at least 10 characters',
        value: dataRecord.description
      });
    }
    if (dataRecord.description.length > 10000) {
      errors.push({
        field: 'description',
        message: 'Description is too long',
        value: dataRecord.description
      });
    }
  }
  
  // Validate category
  if (dataRecord.category && typeof dataRecord.category === 'string') {
    if (!LISTING_CATEGORIES.includes(dataRecord.category as ListingCategory)) {
      errors.push({
        field: 'category',
        message: `Category must be one of: ${LISTING_CATEGORIES.join(', ')}`,
        value: dataRecord.category
      });
    }
  }
  
  // Validate contactEmail
  if (dataRecord.contactEmail && typeof dataRecord.contactEmail === 'string') {
    const emailError = validateEmail(dataRecord.contactEmail, 'contactEmail');
    if (emailError) {
      errors.push(emailError);
    }
  }
  
  // Validate optional price
  if (dataRecord.price !== undefined) {
    if (typeof dataRecord.price !== 'number' || isNaN(dataRecord.price) || dataRecord.price < 0) {
      errors.push({
        field: 'price',
        message: 'Price must be a positive number',
        value: dataRecord.price
      });
    }
  }
  
  // Validate optional location
  if (dataRecord.location !== undefined) {
    if (typeof dataRecord.location !== 'string') {
      errors.push({
        field: 'location',
        message: 'Location must be a string',
        value: typeof dataRecord.location
      });
    } else if (dataRecord.location.length > 200) {
      errors.push({
        field: 'location',
        message: 'Location must be less than 200 characters',
        value: dataRecord.location
      });
    }
  }
  
  if (errors.length > 0) {
    return {
      error: createValidationError(
        'Listing creation validation failed',
        errors,
        endpoint
      )
    };
  }
  
  return {
    valid: true,
    data: {
      title: dataRecord.title as string,
      description: dataRecord.description as string,
      category: dataRecord.category as string,
      contactEmail: dataRecord.contactEmail as string,
      ...(dataRecord.price !== undefined && { price: dataRecord.price as number }),
      ...(dataRecord.location !== undefined && { location: dataRecord.location as string })
    }
  };
}

/**
 * Validate listing update data
 */
export function validateListingUpdate(
  data: unknown,
  endpoint?: string
): { valid: true; data: ListingUpdate } | { error: EnhancedApiError } {
  
  const errors: ValidationErrorDetail[] = [];
  
  // Type guard for basic object structure
  if (!data || typeof data !== 'object') {
    return {
      error: createValidationError(
        'Request body must be an object',
        [{
          field: 'body',
          message: 'Must be an object',
          value: typeof data
        }],
        endpoint
      )
    };
  }
  
  // Cast to record for property access
  const dataRecord = data as Record<string, unknown>;
  
  // For updates, at least one field must be provided
  const updateableFields = ['title', 'description', 'category', 'contactEmail', 'price', 'location'];
  const hasAtLeastOneField = updateableFields.some(field => dataRecord[field] !== undefined);
  
  if (!hasAtLeastOneField) {
    return {
      error: createValidationError(
        'At least one field must be provided for update',
        [{
          field: 'body',
          message: `Must include at least one of: ${updateableFields.join(', ')}`,
          value: Object.keys(dataRecord)
        }],
        endpoint
      )
    };
  }
  
  // Validate provided fields (same rules as create, but optional)
  if (dataRecord.title !== undefined) {
    if (typeof dataRecord.title !== 'string') {
      errors.push({
        field: 'title',
        message: 'Must be a string',
        value: typeof dataRecord.title
      });
    } else if (dataRecord.title.length < 3 || dataRecord.title.length > 200) {
      errors.push({
        field: 'title',
        message: 'Title must be between 3 and 200 characters',
        value: dataRecord.title
      });
    }
  }
  
  if (dataRecord.description !== undefined) {
    if (typeof dataRecord.description !== 'string') {
      errors.push({
        field: 'description',
        message: 'Must be a string',
        value: typeof dataRecord.description
      });
    } else if (dataRecord.description.replace(/<[^>]*>/g, '').length < 10 || dataRecord.description.length > 10000) {
      errors.push({
        field: 'description',
        message: 'Description must be at least 10 characters and not exceed the maximum length',
        value: dataRecord.description
      });
    }
  }
  
  if (dataRecord.category !== undefined) {
    if (typeof dataRecord.category !== 'string') {
      errors.push({
        field: 'category',
        message: 'Must be a string',
        value: typeof dataRecord.category
      });
    } else if (!LISTING_CATEGORIES.includes(dataRecord.category as ListingCategory)) {
      errors.push({
        field: 'category',
        message: `Category must be one of: ${LISTING_CATEGORIES.join(', ')}`,
        value: dataRecord.category
      });
    }
  }
  
  if (dataRecord.contactEmail !== undefined) {
    if (typeof dataRecord.contactEmail !== 'string') {
      errors.push({
        field: 'contactEmail',
        message: 'Must be a string',
        value: typeof dataRecord.contactEmail
      });
    } else {
      const emailError = validateEmail(dataRecord.contactEmail, 'contactEmail');
      if (emailError) {
        errors.push(emailError);
      }
    }
  }
  
  if (dataRecord.price !== undefined) {
    if (typeof dataRecord.price !== 'number' || isNaN(dataRecord.price) || dataRecord.price < 0) {
      errors.push({
        field: 'price',
        message: 'Price must be a positive number',
        value: dataRecord.price
      });
    }
  }
  
  if (dataRecord.location !== undefined) {
    if (typeof dataRecord.location !== 'string') {
      errors.push({
        field: 'location',
        message: 'Location must be a string',
        value: typeof dataRecord.location
      });
    } else if (dataRecord.location.length > 200) {
      errors.push({
        field: 'location',
        message: 'Location must be less than 200 characters',
        value: dataRecord.location
      });
    }
  }
  
  if (errors.length > 0) {
    return {
      error: createValidationError(
        'Listing update validation failed',
        errors,
        endpoint
      )
    };
  }
  
  // Build update object with only provided fields
  const updateData: ListingUpdate = {};
  if (dataRecord.title !== undefined) updateData.title = dataRecord.title as string;
  if (dataRecord.description !== undefined) updateData.description = dataRecord.description as string;
  if (dataRecord.category !== undefined) updateData.category = dataRecord.category as string;
  if (dataRecord.contactEmail !== undefined) updateData.contactEmail = dataRecord.contactEmail as string;
  if (dataRecord.price !== undefined) updateData.price = dataRecord.price as number;
  if (dataRecord.location !== undefined) updateData.location = dataRecord.location as string;
  
  return {
    valid: true,
    data: updateData
  };
}