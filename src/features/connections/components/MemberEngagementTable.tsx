/**
 * MemberEngagementTable
 * Sortable table of per-member engagement metrics.
 *
 * @tier SIMPLE
 * @phase Phase 4A - Group Analytics, Phase 4C Performance Optimization
 * @generated ComponentBuilder
 */

'use client';

import React, { useState, useMemo } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import type { GroupMemberEngagement } from '@features/connections/types/groups';

interface MemberEngagementTableProps {
  members: GroupMemberEngagement[];
}

type SortField = 'memberName' | 'messagesSent' | 'recommendationsViewed' | 'lastActiveDate' | 'engagementScore';
type SortDir = 'asc' | 'desc';

function ScoreBar({ score }: { score: number }) {
  const color =
    score >= 70 ? 'bg-emerald-500' : score >= 30 ? 'bg-yellow-500' : 'bg-red-500';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${score}%` }} />
      </div>
      <span className="text-xs text-gray-600 w-8 text-right">{score}</span>
    </div>
  );
}

export function MemberEngagementTable({ members }: MemberEngagementTableProps) {
  const [sortField, setSortField] = useState<SortField>('engagementScore');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  const sorted = useMemo(() => [...members].sort((a, b) => {
    let aVal: string | number | Date | null = a[sortField];
    let bVal: string | number | Date | null = b[sortField];

    if (sortField === 'lastActiveDate') {
      aVal = aVal ? new Date(aVal as Date).getTime() : 0;
      bVal = bVal ? new Date(bVal as Date).getTime() : 0;
    }

    if (aVal === null || aVal === undefined) aVal = sortDir === 'asc' ? Infinity : -Infinity;
    if (bVal === null || bVal === undefined) bVal = sortDir === 'asc' ? Infinity : -Infinity;

    if (typeof aVal === 'string' && typeof bVal === 'string') {
      return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    }

    return sortDir === 'asc'
      ? (aVal as number) - (bVal as number)
      : (bVal as number) - (aVal as number);
  }), [members, sortField, sortDir]);

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ChevronDown className="w-3 h-3 text-gray-300" />;
    return sortDir === 'asc'
      ? <ChevronUp className="w-3 h-3 text-gray-600" />
      : <ChevronDown className="w-3 h-3 text-gray-600" />;
  };

  const headerClass = 'px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700 select-none';
  const stickyHeaderClass = `${headerClass} sticky left-0 z-10 bg-gray-50`;
  const stickyCellClass = 'px-4 py-3 sticky left-0 z-10 bg-white';

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className={stickyHeaderClass} onClick={() => handleSort('memberName')}>
                <span className="flex items-center gap-1">Member <SortIcon field="memberName" /></span>
              </th>
              <th className={headerClass} onClick={() => handleSort('messagesSent')}>
                <span className="flex items-center gap-1">Messages <SortIcon field="messagesSent" /></span>
              </th>
              <th className={headerClass} onClick={() => handleSort('recommendationsViewed')}>
                <span className="flex items-center gap-1">Recs Viewed <SortIcon field="recommendationsViewed" /></span>
              </th>
              <th className={headerClass} onClick={() => handleSort('lastActiveDate')}>
                <span className="flex items-center gap-1">Last Active <SortIcon field="lastActiveDate" /></span>
              </th>
              <th className={headerClass} onClick={() => handleSort('engagementScore')}>
                <span className="flex items-center gap-1">Engagement <SortIcon field="engagementScore" /></span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {sorted.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-400 text-sm">
                  No member data available
                </td>
              </tr>
            ) : (
              sorted.map(member => (
                <tr key={member.memberId} className="hover:bg-gray-50 transition-colors">
                  <td className={stickyCellClass}>
                    <span className="font-medium text-gray-900 text-sm whitespace-nowrap">{member.memberName}</span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">{member.messagesSent}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{member.recommendationsViewed}</td>
                  <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">
                    {member.lastActiveDate
                      ? new Date(member.lastActiveDate).toLocaleDateString()
                      : 'Never'}
                  </td>
                  <td className="px-4 py-3 min-w-[120px]">
                    <ScoreBar score={member.engagementScore} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
