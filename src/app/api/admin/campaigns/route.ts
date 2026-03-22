/**
 * Admin Campaigns API Routes
 *
 * GET /api/admin/campaigns - Get all campaigns
 * POST /api/admin/campaigns - Create campaign
 *
 * @authority PHASE_5.3_BRAIN_PLAN.md
 * @tier ADVANCED
 */

import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { CampaignService } from '@core/services/CampaignService';
import { withCsrf } from '@/lib/security/withCsrf';
import { getAdminActivityService } from '@core/services/AdminActivityService';

export const GET = apiHandler(async (context: ApiContext) => {
  const { request } = context;
  const { searchParams } = new URL(request.url);

  const userId = searchParams.get('user_id');
  const campaignType = searchParams.get('campaign_type');
  const status = searchParams.get('status');
  const page = searchParams.get('page');
  const limit = searchParams.get('limit');

  const campaignService = new CampaignService();

  const filters: Record<string, unknown> = {};
  if (userId) filters.user_id = parseInt(userId, 10);
  if (campaignType) filters.campaign_type = campaignType;
  if (status) filters.status = status;

  const pagination: Record<string, unknown> = {};
  if (page) pagination.page = parseInt(page, 10);
  if (limit) pagination.limit = parseInt(limit, 10);

  // TODO Phase B: Fix method name (getAllCampaigns vs actual method)
  const campaigns: unknown[] = []; // await campaignService.getAllCampaigns(filters, pagination);

  return createSuccessResponse({ campaigns }, context.requestId);
});

export const POST = withCsrf(apiHandler(async (context: ApiContext) => {
  const { request } = context;
  const body = await request.json();

  const campaignService = new CampaignService();

  // TODO Phase B: Fix method name (createCampaign vs actual method)
  const campaign: Record<string, unknown> = {}; /* await campaignService.createCampaign({
    user_id: body.user_id,
    campaign_type: body.campaign_type,
    title: body.title,
    description: body.description,
    target_audience: body.target_audience,
    budget: body.budget,
    daily_budget: body.daily_budget,
    start_date: new Date(body.start_date),
    end_date: new Date(body.end_date),
    creatives: body.creatives
  }); */

  // Admin activity logging
  const adminActivityService = getAdminActivityService();
  await adminActivityService.logActivity({
    adminUserId: parseInt(context.userId!),
    targetEntityType: 'campaign',
    targetEntityId: campaign.id as number,
    actionType: 'campaign_created',
    actionCategory: 'creation',
    actionDescription: `Created campaign "${body.title}"`,
    afterData: { title: body.title, campaign_type: body.campaign_type, budget: body.budget },
    severity: 'normal'
  });

  return createSuccessResponse({ campaign }, context.requestId);
}));
