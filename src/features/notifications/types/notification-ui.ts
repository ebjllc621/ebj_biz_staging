/**
 * Notification UI Types
 *
 * @authority docs/notificationService/phases/PHASE_5_BRAIN_PLAN.md
 * @tier STANDARD
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 */

/**
 * Notification display item (from API)
 */
export interface NotificationItem {
  id: number;
  notification_type: NotificationTypeKey;
  title: string;
  message?: string;
  entity_type?: string;
  entity_id?: number;
  action_url?: string;
  is_read: boolean;
  created_at: Date;
}

/**
 * Valid notification type keys
 */
export type NotificationTypeKey =
  | 'connection_request'
  | 'message'
  | 'review'
  | 'mention'
  | 'system'
  | 'recommendation';

/**
 * Paginated notifications response
 */
export interface PaginatedNotifications {
  notifications: NotificationItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * Notification filter options
 */
export interface NotificationFilters {
  type: NotificationTypeKey | 'all';
  page: number;
  pageSize: number;
}

/**
 * Notification type metadata for UI display
 */
export const NOTIFICATION_TYPE_META: Record<NotificationTypeKey, {
  label: string;
  icon: string;
  color: string;
  bgColor: string;
}> = {
  connection_request: {
    label: 'Connections',
    icon: 'Users',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50'
  },
  message: {
    label: 'Messages',
    icon: 'MessageCircle',
    color: 'text-green-600',
    bgColor: 'bg-green-50'
  },
  review: {
    label: 'Reviews',
    icon: 'Star',
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50'
  },
  mention: {
    label: 'Mentions',
    icon: 'AtSign',
    color: 'text-purple-600',
    bgColor: 'bg-purple-50'
  },
  system: {
    label: 'System',
    icon: 'Bell',
    color: 'text-gray-600',
    bgColor: 'bg-gray-50'
  },
  recommendation: {
    label: 'Recommendations',
    icon: 'Share2',
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-50'
  }
};
