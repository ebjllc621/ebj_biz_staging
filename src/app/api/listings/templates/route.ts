/**
 * GET /api/listings/templates
 *
 * Public endpoint — returns active system templates for the listing creation selector.
 * No authentication required (template list is non-sensitive).
 *
 * @authority Phase 4C Brain Plan - 4.14 ListingTemplateService
 * @tier SIMPLE
 */

import { apiHandler } from '@core/api/apiHandler';
import { createSuccessResponse } from '@core/api/responseHelpers';
import { getListingTemplateService } from '@core/services/ListingTemplateService';

export const GET = apiHandler(async (context) => {
  const service = getListingTemplateService();
  const templates = await service.getSystemTemplates();
  return createSuccessResponse({ templates });
}, { requireAuth: false });
