/**
 * Messaging Feature Module - Public Exports
 *
 * @authority docs/pages/layouts/home/user/phases/troubleshooting/sendmessage/phases/PHASE_1_CORE_INFRASTRUCTURE_BRAIN_PLAN.md
 * @tier STANDARD
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 */

// Types
export * from './types';

// Services
export { MessageService, MessageError, MessageNotFoundError } from './services/MessageService';

// Components (Phase 2)
export { SendMessageModal } from './components/SendMessageModal';
export { SendMessageButton } from './components/SendMessageButton';

// Components (Phase 4)
export { ThreadsList } from './components/ThreadsList';
export { ThreadItem } from './components/ThreadItem';
export { ConversationView } from './components/ConversationView';
export { MessageBubble } from './components/MessageBubble';
export { ComposeReply } from './components/ComposeReply';

// Hooks (Phase 2)
export { useMessageSend } from './hooks/useMessageSend';

// Hooks (Phase 4)
export { useThreads, useConversation } from './hooks/useMessages';
