/**
 * SendMessageButton - Reusable button component that opens SendMessageModal
 *
 * @tier STANDARD
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 * @brain-plan docs/pages/layouts/home/user/phases/troubleshooting/sendmessage/phases/PHASE_2_SENDMESSAGEMODAL_BRAIN_PLAN.md
 *
 * Features:
 * - Manages modal open/close state
 * - Renders SendMessageModal when open
 * - Customizable button styling via className prop
 * - Optional success callback
 * - Uses Lucide MessageSquare icon
 */

'use client';

import React, { useState } from 'react';
import { MessageSquare } from 'lucide-react';
import { SendMessageModal } from './SendMessageModal';

interface SendMessageButtonProps {
  targetUser: {
    id: number;
    username: string;
    display_name: string | null;
    avatar_url: string | null;
  };
  onMessageSent?: () => void;
  className?: string;
  children?: React.ReactNode;
}

export function SendMessageButton({
  targetUser,
  onMessageSent,
  className,
  children
}: SendMessageButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleSuccess = () => {
    onMessageSent?.();
    // Could show toast notification here
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsModalOpen(true)}
        className={className || "flex items-center gap-2 px-4 py-2 bg-white text-[#022641] border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"}
      >
        <MessageSquare className="w-4 h-4" />
        {children || 'Send Message'}
      </button>

      <SendMessageModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        targetUser={targetUser}
        onMessageSent={handleSuccess}
      />
    </>
  );
}
