/**
 * Dashboard Contacts Page
 * Phase A: Core Contacts Display
 * Phase B: CRM Features (ContactDetailModal integration)
 * Phase C: Manual Contacts (Add Contact button and AddContactModal)
 * Phase D: Import/Export
 * Phase E: Advanced Features (Smart Lists, Bulk Actions, Analytics)
 *
 * @tier STANDARD
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 * @authority docs/pages/layouts/home/user/user_dash/contacts/phases/PHASE_E_ADVANCED_FEATURES_BRAIN_PLAN.md
 *
 * Features:
 * - Displays user contacts (connections + manual) with search/filter/sort
 * - Grid and list view modes
 * - Phase B: ContactDetailModal for CRM editing (notes, tags, reminders)
 * - Phase B: Star toggle, category/tags badges, filters
 * - Phase C: Add manual contacts via AddContactModal
 * - Phase C: Contact type indicators (connection vs manual)
 * - Phase D: Import/Export CSV and vCard
 * - Phase E: Smart list filtering
 * - Phase E: Multi-select and bulk actions
 * - Phase E: Analytics dashboard tab
 * - Send Message functionality via SendMessageModal
 * - Remove contact with confirmation via RemoveConnectionModal
 * - View profile navigation
 * - Client-side filtering and sorting for performance
 *
 * @reference src/app/dashboard/connections/page.tsx - Page structure pattern
 */
'use client';

import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { BottomActionBar } from '@/components/common';
import { useState, useEffect, useMemo } from 'react';
import { UserPlus, Upload, Download, BarChart3 } from 'lucide-react';
import type { Contact, ContactSortOption, ImportResult, SmartList, BulkActionType, CreateSmartListInput, BulkActionInput } from '@features/contacts/types';
import { ContactCard } from '@features/contacts/components/ContactCard';
import { ContactsSearchBar } from '@features/contacts/components/ContactsSearchBar';
import { ContactsPagination, type PageSize } from '@features/contacts/components/ContactsPagination';
import ContactDetailModal from '@features/contacts/components/ContactDetailModal';
import AddContactModal from '@features/contacts/components/AddContactModal';
import { ContactDisplayPanel } from '@features/contacts/components/ContactDisplayPanel';
import ContactImportModal from '@features/contacts/components/ContactImportModal';
import ContactExportModal from '@features/contacts/components/ContactExportModal';
import SmartListBuilder from '@features/contacts/components/SmartListBuilder';
import ContactBulkActions from '@features/contacts/components/ContactBulkActions';
import BulkActionModal from '@features/contacts/components/BulkActionModal';
import ContactAnalyticsDashboard from '@features/contacts/components/ContactAnalyticsDashboard';
import { SendMessageModal } from '@features/messaging/components/SendMessageModal';
import { RemoveConnectionModal } from '@features/connections/components/RemoveConnectionModal';
import ContactDeleteConfirmModal from '@features/contacts/components/ContactDeleteConfirmModal';
import { ReferralTemplateModal } from '@features/contacts/components/ReferralTemplateModal';
import type { UserConnection } from '@features/connections/types';
import { fetchCsrfToken } from '@core/utils/csrf';
import { ErrorService } from '@core/services/ErrorService';

function ContactsPageContent() {
  // State: Contacts data
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // State: Available tags for autocomplete (Phase B)
  const [availableTags, setAvailableTags] = useState<string[]>([]);

  // State: Search and filter
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<ContactSortOption>('name_asc');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');

  // State: ContactDetailModal (Phase B)
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // State: Phase 1 - Display Panel
  const [expandedContactId, setExpandedContactId] = useState<number | null>(null);

  // State: AddContactModal (Phase C)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // State: Import/Export Modals (Phase D)
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  // State: Phase E - Smart Lists
  const [selectedSmartList, setSelectedSmartList] = useState<SmartList | null>(null);
  const [isSmartListBuilderOpen, setIsSmartListBuilderOpen] = useState(false);

  // State: Phase E - Multi-select and Bulk Actions
  const [selectedContactIds, setSelectedContactIds] = useState<number[]>([]);
  const [bulkAction, setBulkAction] = useState<BulkActionType | null>(null);
  const [isBulkActionModalOpen, setIsBulkActionModalOpen] = useState(false);

  // State: Phase E - Tab navigation
  const [activeTab, setActiveTab] = useState<'contacts' | 'analytics'>('contacts');

  // State: Message modal
  const [messageTarget, setMessageTarget] = useState<{
    id: number;
    username: string;
    display_name: string | null;
    avatar_url: string | null;
  } | null>(null);
  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);

  // State: Remove contact modal (for connections)
  const [removeTarget, setRemoveTarget] = useState<UserConnection | null>(null);
  const [isRemoveModalOpen, setIsRemoveModalOpen] = useState(false);

  // State: Delete contact modal (for manual/imported contacts)
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; name: string } | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // State: Referral modal (Phase 3)
  const [referralTarget, setReferralTarget] = useState<Contact | null>(null);
  const [isReferralModalOpen, setIsReferralModalOpen] = useState(false);

  // State: Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<PageSize>(20);

  // Load contacts and tags on mount
  useEffect(() => {
    loadContacts();
    loadAvailableTags();
  }, []);

  const loadContacts = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/contacts', {
        credentials: 'include'
      });

      if (response.ok) {
        const result = await response.json();
        const data = result.data || result;
        setContacts(data.contacts || []);
      }
    } catch (error) {
      ErrorService.capture('Failed to load contacts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Load user's unique tags for autocomplete (Phase B)
  const loadAvailableTags = async () => {
    try {
      const response = await fetch('/api/contacts/tags', {
        credentials: 'include'
      });

      if (response.ok) {
        const result = await response.json();
        const data = result.data || result;
        setAvailableTags(data.tags || []);
      }
    } catch (error) {
      ErrorService.capture('Failed to load tags:', error);
    }
  };

  // Client-side filtering and sorting
  const filteredAndSortedContacts = useMemo(() => {
    let filtered = [...contacts];

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(contact => {
        const displayName = (contact.display_name || contact.username).toLowerCase();
        const username = contact.username.toLowerCase();
        return displayName.includes(query) || username.includes(query);
      });
    }

    // Apply sorting
    filtered.sort((a, b) => {
      const aName = (a.display_name || a.username).toLowerCase();
      const bName = (b.display_name || b.username).toLowerCase();

      switch (sortBy) {
        case 'name_asc':
          return aName.localeCompare(bName);
        case 'name_desc':
          return bName.localeCompare(aName);
        case 'connected_date_newest':
          return new Date(b.connected_since).getTime() - new Date(a.connected_since).getTime();
        case 'connected_date_oldest':
          return new Date(a.connected_since).getTime() - new Date(b.connected_since).getTime();
        case 'last_interaction':
          if (!a.last_interaction && !b.last_interaction) return 0;
          if (!a.last_interaction) return 1;
          if (!b.last_interaction) return -1;
          return new Date(b.last_interaction).getTime() - new Date(a.last_interaction).getTime();
        default:
          return 0;
      }
    });

    return filtered;
  }, [contacts, searchQuery, sortBy]);

  // Paginated contacts for display
  const paginatedContacts = useMemo(() => {
    if (pageSize === 'all') {
      return filteredAndSortedContacts;
    }
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return filteredAndSortedContacts.slice(startIndex, endIndex);
  }, [filteredAndSortedContacts, currentPage, pageSize]);

  // Reset to page 1 when search query or filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, sortBy, selectedSmartList]);

  // Handle page size change
  const handlePageSizeChange = (newSize: PageSize) => {
    setPageSize(newSize);
    setCurrentPage(1);
  };

  // Phase 1: Handle contact card click - toggles display panel
  const handleContactClick = (contact: Contact) => {
    // Toggle panel: if same contact clicked, close; else open new
    if (expandedContactId === contact.id) {
      setExpandedContactId(null);
      setSelectedContact(null);
    } else {
      setExpandedContactId(contact.id);
      setSelectedContact(contact);
    }
  };

  // Phase B: Handle contact update from modal
  const handleContactUpdate = (updatedContact: Contact) => {
    setContacts(prev =>
      prev.map(c => (c.id === updatedContact.id ? updatedContact : c))
    );
    loadAvailableTags(); // Refresh tags in case new ones were added
  };

  // Phase 1: Handler to open edit modal from display panel
  const handleEditContact = () => {
    // selectedContact is already set when panel is open
    if (selectedContact) {
      setIsDetailModalOpen(true);
    }
  };

  // Phase 9: Handler to open edit modal directly from ContactCard menu
  const handleEditContactDirect = (contact: Contact) => {
    setSelectedContact(contact);
    setIsDetailModalOpen(true);
  };

  // Phase 1: Handler to close display panel
  const handleClosePanel = () => {
    setExpandedContactId(null);
    setSelectedContact(null);
  };

  // Phase B: Handle star toggle
  const handleToggleStar = async (contact: Contact) => {
    try {
      const csrfToken = await fetchCsrfToken();

      const response = await fetch(`/api/contacts/${contact.user_id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken || ''
        },
        credentials: 'include',
        body: JSON.stringify({ is_starred: !contact.is_starred })
      });

      if (response.ok) {
        const result = await response.json();
        const updated = result.data?.contact || result.contact;
        setContacts(prev =>
          prev.map(c => (c.id === updated.id ? updated : c))
        );
      }
    } catch (error) {
      ErrorService.capture('Failed to toggle star:', error);
    }
  };

  // Handle send message - opens SendMessageModal
  const handleSendMessage = (contact: Contact) => {
    setMessageTarget({
      id: contact.user_id,
      username: contact.username,
      display_name: contact.display_name,
      avatar_url: contact.avatar_url
    });
    setIsMessageModalOpen(true);
  };

  // Handle remove contact - either RemoveConnectionModal (connections) or ContactDeleteConfirmModal (manual contacts)
  const handleRemoveContact = (contact: Contact) => {
    if (contact.is_connected) {
      // For connected contacts: Use RemoveConnectionModal
      setRemoveTarget({
        id: contact.id,
        user_id: contact.user_id,
        username: contact.username,
        display_name: contact.display_name,
        avatar_url: contact.avatar_url,
        avatar_bg_color: contact.avatar_bg_color,
        connection_type: contact.connection_type,
        connected_since: contact.connected_since,
        mutual_connections: contact.mutual_connections,
        interaction_count: contact.interaction_count,
        last_interaction: contact.last_interaction,
        notes: null,
        tags: null
      });
      setIsRemoveModalOpen(true);
    } else {
      // For manual/imported contacts: Use ContactDeleteConfirmModal
      const displayName = contact.contact_name || contact.display_name || contact.username;
      setDeleteTarget({
        id: contact.id,
        name: displayName
      });
      setIsDeleteModalOpen(true);
    }
  };

  // Handle successful contact removal
  const handleRemoveSuccess = () => {
    loadContacts();
  };

  // Phase 3: Handle refer contact to Bizconekt
  const handleReferContact = (contact: Contact) => {
    setReferralTarget(contact);
    setIsReferralModalOpen(true);
  };

  // Phase 3: Handle referral created
  const handleReferralCreated = () => {
    // Optionally refresh or show toast
    // For now just close the panel
    setExpandedContactId(null);
  };

  // Phase C: Handle new contact created
  const handleContactCreated = () => {
    loadContacts();
    loadAvailableTags();
  };

  // Phase D: Handle import complete
  const handleImportComplete = (result: ImportResult) => {
    loadContacts();
    loadAvailableTags();
    console.log('Import complete:', result);
  };

  // Phase E: Handle smart list creation
  const handleCreateSmartList = async (input: CreateSmartListInput) => {
    try {
      const csrfToken = await fetchCsrfToken();
      const response = await fetch('/api/contacts/smart-lists', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken || ''
        },
        credentials: 'include',
        body: JSON.stringify(input)
      });

      if (response.ok) {
        // Refresh would happen in SmartListPanel
        setIsSmartListBuilderOpen(false);
      }
    } catch (error) {
      ErrorService.capture('Failed to create smart list:', error);
    }
  };

  // Phase E: Handle bulk action execution
  const handleExecuteBulkAction = async (action: BulkActionType, payload?: any) => {
    try {
      const csrfToken = await fetchCsrfToken();
      const response = await fetch('/api/contacts/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken || ''
        },
        credentials: 'include',
        body: JSON.stringify({
          action,
          contactIds: selectedContactIds,
          payload
        })
      });

      if (response.ok) {
        loadContacts();
        setSelectedContactIds([]);
        setIsBulkActionModalOpen(false);
      }
    } catch (error) {
      ErrorService.capture('Failed to execute bulk action:', error);
    }
  };

  // Phase E: Toggle contact selection
  const toggleContactSelection = (contactId: number) => {
    setSelectedContactIds(prev =>
      prev.includes(contactId)
        ? prev.filter(id => id !== contactId)
        : [...prev, contactId]
    );
  };

  return (
    <div className="space-y-6 pb-20 md:pb-6">
      {/* Page Header - Mobile responsive */}
      <div>
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Contacts</h1>
            <p className="text-gray-600 mt-1 text-sm sm:text-base">Manage your personal CRM and professional network</p>
          </div>
          {/* Action buttons - wrap on mobile */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setActiveTab(activeTab === 'contacts' ? 'analytics' : 'contacts')}
              className="flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <BarChart3 className="w-4 h-4" />
              <span className="hidden xs:inline">{activeTab === 'contacts' ? 'Analytics' : 'Contacts'}</span>
            </button>
            {activeTab === 'contacts' && (
              <>
                <button
                  onClick={() => setIsImportModalOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  title="Import contacts"
                >
                  <Upload className="w-4 h-4" />
                  <span className="hidden sm:inline">Import</span>
                </button>
                <button
                  onClick={() => setIsExportModalOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  title="Export contacts"
                >
                  <Download className="w-4 h-4" />
                  <span className="hidden sm:inline">Export</span>
                </button>
                <button
                  onClick={() => setIsAddModalOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-2 text-sm bg-[#ed6437] text-white rounded-lg hover:bg-[#d55730] transition-colors"
                  title="Add contact"
                >
                  <UserPlus className="w-4 h-4" />
                  <span className="hidden sm:inline">Add Contact</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'analytics' ? (
        <ContactAnalyticsDashboard dateRange="30d" />
      ) : (
        <>
          {/* Search, Sort, View Controls with Smart List Selector and Pagination */}
          <ContactsSearchBar
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              sortBy={sortBy}
              onSortChange={setSortBy}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              totalCount={contacts.length}
              filteredCount={filteredAndSortedContacts.length}
              selectedSmartList={selectedSmartList}
              onSelectSmartList={setSelectedSmartList}
              onCreateSmartList={() => setIsSmartListBuilderOpen(true)}
              currentPage={currentPage}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              onPageSizeChange={handlePageSizeChange}
            />

            {/* Contacts Display */}
            <div>
              {isLoading ? (
                <div className="bg-white rounded-xl border border-gray-200 p-6 text-center text-gray-500">
                  Loading contacts...
                </div>
              ) : filteredAndSortedContacts.length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-200 p-6 text-center">
                  {contacts.length === 0 ? (
                    <>
                      <p className="text-gray-500 mb-2">No contacts yet</p>
                      <p className="text-sm text-gray-600">
                        Start connecting with others to build your professional network
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-gray-500 mb-2">No contacts match your search</p>
                      <p className="text-sm text-gray-600">
                        Try adjusting your search query or filters
                      </p>
                    </>
                  )}
                </div>
              ) : (
                <>
                  {/* Phase 8: New layout with side-by-side card+panel for expanded contacts */}
                  {viewMode === 'grid' ? (
                    // GRID VIEW: Selected contact breaks out into full-width row with side-by-side layout
                    <div className="space-y-4">
                      {/* Render contacts in groups, breaking out expanded contact into its own row */}
                      {(() => {
                        const rows: JSX.Element[] = [];
                        let currentGridItems: Contact[] = [];

                        paginatedContacts.forEach((contact) => {
                          const isThisExpanded = expandedContactId === contact.id;

                          if (isThisExpanded) {
                            // Flush current grid items before expanded contact
                            if (currentGridItems.length > 0) {
                              rows.push(
                                <div
                                  key={`grid-${rows.length}`}
                                  className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
                                >
                                  {currentGridItems.map((c) => (
                                    <ContactCard
                                      key={c.id}
                                      contact={c}
                                      viewMode="grid"
                                      onClick={() => handleContactClick(c)}
                                      onToggleStar={() => handleToggleStar(c)}
                                      onMessage={() => handleSendMessage(c)}
                                      onRemove={() => handleRemoveContact(c)}
                                      onEdit={() => handleEditContactDirect(c)}
                                      showActions={true}
                                      isSelected={selectedContactIds.includes(c.id)}
                                      onToggleSelection={() => toggleContactSelection(c.id)}
                                    />
                                  ))}
                                </div>
                              );
                              currentGridItems = [];
                            }

                            // Render expanded contact in its own full-width row with side-by-side layout
                            rows.push(
                              <div
                                key={`expanded-${contact.id}`}
                                className="flex flex-col sm:flex-row gap-4 items-start"
                              >
                                <ContactCard
                                  contact={contact}
                                  viewMode="grid"
                                  onClick={() => handleContactClick(contact)}
                                  onToggleStar={() => handleToggleStar(contact)}
                                  onMessage={() => handleSendMessage(contact)}
                                  onRemove={() => handleRemoveContact(contact)}
                                  showActions={false}
                                  isSelected={selectedContactIds.includes(contact.id)}
                                  onToggleSelection={() => toggleContactSelection(contact.id)}
                                  isExpanded={true}
                                />
                                <ContactDisplayPanel
                                  contact={contact}
                                  isExpanded={true}
                                  onClose={handleClosePanel}
                                  onEdit={handleEditContact}
                                  onMessage={contact.is_connected ? () => handleSendMessage(contact) : undefined}
                                  onReferContact={!contact.is_connected ? () => handleReferContact(contact) : undefined}
                                  layout="horizontal"
                                />
                              </div>
                            );
                          } else {
                            currentGridItems.push(contact);
                          }
                        });

                        // Flush remaining grid items
                        if (currentGridItems.length > 0) {
                          rows.push(
                            <div
                              key={`grid-final`}
                              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
                            >
                              {currentGridItems.map((c) => (
                                <ContactCard
                                  key={c.id}
                                  contact={c}
                                  viewMode="grid"
                                  onClick={() => handleContactClick(c)}
                                  onToggleStar={() => handleToggleStar(c)}
                                  onMessage={() => handleSendMessage(c)}
                                  onRemove={() => handleRemoveContact(c)}
                                  onEdit={() => handleEditContactDirect(c)}
                                  showActions={true}
                                  isSelected={selectedContactIds.includes(c.id)}
                                  onToggleSelection={() => toggleContactSelection(c.id)}
                                />
                              ))}
                            </div>
                          );
                        }

                        return rows;
                      })()}
                    </div>
                  ) : (
                    // LIST VIEW: Selected contact transforms to compact card with side-by-side panel
                    <div className="space-y-4">
                      {paginatedContacts.map((contact) => {
                        const isThisExpanded = expandedContactId === contact.id;

                        if (isThisExpanded) {
                          // Side-by-side layout: compact card on left, panel on right
                          return (
                            <div
                              key={contact.id}
                              className="flex flex-col sm:flex-row gap-4 items-start"
                            >
                              <ContactCard
                                contact={contact}
                                viewMode="list"
                                onClick={() => handleContactClick(contact)}
                                onToggleStar={() => handleToggleStar(contact)}
                                onMessage={() => handleSendMessage(contact)}
                                onRemove={() => handleRemoveContact(contact)}
                                showActions={false}
                                isSelected={selectedContactIds.includes(contact.id)}
                                onToggleSelection={() => toggleContactSelection(contact.id)}
                                isExpanded={true}
                              />
                              <ContactDisplayPanel
                                contact={contact}
                                isExpanded={true}
                                onClose={handleClosePanel}
                                onEdit={handleEditContact}
                                onMessage={contact.is_connected ? () => handleSendMessage(contact) : undefined}
                                onReferContact={!contact.is_connected ? () => handleReferContact(contact) : undefined}
                                layout="horizontal"
                              />
                            </div>
                          );
                        }

                        // Normal list view for non-expanded contacts
                        return (
                          <ContactCard
                            key={contact.id}
                            contact={contact}
                            viewMode="list"
                            onClick={() => handleContactClick(contact)}
                            onToggleStar={() => handleToggleStar(contact)}
                            onMessage={() => handleSendMessage(contact)}
                            onRemove={() => handleRemoveContact(contact)}
                            onEdit={() => handleEditContactDirect(contact)}
                            showActions={true}
                            isSelected={selectedContactIds.includes(contact.id)}
                            onToggleSelection={() => toggleContactSelection(contact.id)}
                          />
                        );
                      })}
                    </div>
                  )}

                  {/* Bottom Pagination Controls */}
                  {filteredAndSortedContacts.length > 0 && (
                    <div className="bg-white rounded-xl border border-gray-200 mt-4">
                      <ContactsPagination
                        totalCount={filteredAndSortedContacts.length}
                        currentPage={currentPage}
                        pageSize={pageSize}
                        onPageChange={setCurrentPage}
                        onPageSizeChange={handlePageSizeChange}
                        position="bottom"
                      />
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Phase B: Contact Detail Modal */}
            {selectedContact && (
              <ContactDetailModal
                isOpen={isDetailModalOpen}
                onClose={() => {
                  setIsDetailModalOpen(false);
                  setSelectedContact(null);
                }}
                contact={selectedContact}
                onContactUpdate={handleContactUpdate}
                onRemove={() => {
                  setIsDetailModalOpen(false);
                  handleRemoveContact(selectedContact);
                }}
                onMessage={() => {
                  setIsDetailModalOpen(false);
                  handleSendMessage(selectedContact);
                }}
                availableTags={availableTags}
              />
            )}

            {/* Phase C: Add Contact Modal */}
            <AddContactModal
              isOpen={isAddModalOpen}
              onClose={() => setIsAddModalOpen(false)}
              onContactCreated={handleContactCreated}
              availableTags={availableTags}
            />

            {/* Phase D: Import Contact Modal */}
            <ContactImportModal
              isOpen={isImportModalOpen}
              onClose={() => setIsImportModalOpen(false)}
              onImportComplete={handleImportComplete}
            />

            {/* Phase D: Export Contact Modal */}
            <ContactExportModal
              isOpen={isExportModalOpen}
              onClose={() => setIsExportModalOpen(false)}
              filters={{}}
              selectedContactIds={selectedContactIds}
              totalContacts={contacts.length}
            />

            {/* Send Message Modal */}
            {messageTarget && (
              <SendMessageModal
                isOpen={isMessageModalOpen}
                onClose={() => {
                  setIsMessageModalOpen(false);
                  setMessageTarget(null);
                }}
                targetUser={messageTarget}
                onMessageSent={() => {
                  // Optional: could show a success toast here
                }}
              />
            )}

            {/* Remove Connection Modal (for connected contacts) */}
            {removeTarget && (
              <RemoveConnectionModal
                isOpen={isRemoveModalOpen}
                onClose={() => {
                  setIsRemoveModalOpen(false);
                  setRemoveTarget(null);
                }}
                connection={removeTarget}
                onSuccess={handleRemoveSuccess}
              />
            )}

            {/* Delete Contact Modal (for manual/imported contacts) */}
            {deleteTarget && (
              <ContactDeleteConfirmModal
                isOpen={isDeleteModalOpen}
                onClose={() => {
                  setIsDeleteModalOpen(false);
                  setDeleteTarget(null);
                }}
                contactId={deleteTarget.id}
                contactName={deleteTarget.name}
                onSuccess={() => {
                  // Clear selected contact if it was the deleted one
                  if (selectedContact?.id === deleteTarget.id) {
                    setSelectedContact(null);
                    setIsDetailModalOpen(false);
                  }
                  loadContacts();
                  setIsDeleteModalOpen(false);
                  setDeleteTarget(null);
                }}
              />
            )}

            {/* Phase 3: Referral Template Modal */}
            <ReferralTemplateModal
              isOpen={isReferralModalOpen}
              onClose={() => {
                setIsReferralModalOpen(false);
                setReferralTarget(null);
              }}
              onReferralCreated={handleReferralCreated}
              contact={referralTarget}
            />

            {/* Phase E: Smart List Builder Modal */}
            <SmartListBuilder
              isOpen={isSmartListBuilderOpen}
              onClose={() => setIsSmartListBuilderOpen(false)}
              onSave={handleCreateSmartList}
            />

            {/* Phase E: Bulk Action Modal */}
            <BulkActionModal
              isOpen={isBulkActionModalOpen}
              action={bulkAction}
              selectedCount={selectedContactIds.length}
              onClose={() => {
                setIsBulkActionModalOpen(false);
                setBulkAction(null);
              }}
              onExecute={handleExecuteBulkAction}
            />

            {/* Phase E: Bulk Actions Floating Bar */}
            <ContactBulkActions
              selectedCount={selectedContactIds.length}
              onAction={(action) => {
                setBulkAction(action);
                setIsBulkActionModalOpen(true);
              }}
              onClearSelection={() => setSelectedContactIds([])}
            />

            {/* Phase 7: Mobile Bottom Action Bar */}
            {activeTab === 'contacts' && (
              <BottomActionBar
                actions={[
                  {
                    label: 'Add',
                    icon: UserPlus,
                    onClick: () => setIsAddModalOpen(true),
                    variant: 'primary'
                  },
                  {
                    label: 'Import',
                    icon: Upload,
                    onClick: () => setIsImportModalOpen(true),
                    variant: 'secondary'
                  },
                  {
                    label: 'Analytics',
                    icon: BarChart3,
                    onClick: () => setActiveTab('analytics'),
                    variant: 'secondary'
                  }
                ]}
              />
            )}
          </>
        )}
    </div>
  );
}

export default function ContactsPage() {
  return (
    <ErrorBoundary componentName="DashboardContactsPage">
      <ContactsPageContent />
    </ErrorBoundary>
  );
}