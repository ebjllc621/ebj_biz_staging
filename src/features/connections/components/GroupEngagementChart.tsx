/**
 * GroupEngagementChart
 * Line chart showing messages, recommendations, and member changes over time.
 *
 * @tier STANDARD
 * @phase Phase 4A - Group Analytics, Phase 4C Performance Optimization
 * @generated ComponentBuilder
 */

'use client';

import React, { useMemo } from 'react';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import type { GroupActivityTimelinePoint } from '@features/connections/types/groups';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

interface GroupEngagementChartProps {
  timeline: GroupActivityTimelinePoint[];
  days: number;
}

function GroupEngagementChartContent({ timeline, days }: GroupEngagementChartProps) {
  const data = useMemo(() => {
    const labels = timeline.map(p => {
      const d = new Date(p.date);
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    });
    return {
      labels,
      datasets: [
        {
          label: 'Messages',
          data: timeline.map(p => p.messages),
          borderColor: '#3B82F6',
          backgroundColor: 'rgba(59,130,246,0.1)',
          tension: 0.3,
          fill: false
        },
        {
          label: 'Recommendations',
          data: timeline.map(p => p.recommendations),
          borderColor: '#10B981',
          backgroundColor: 'rgba(16,185,129,0.1)',
          tension: 0.3,
          fill: false
        },
        {
          label: 'Member Changes',
          data: timeline.map(p => p.memberChanges),
          borderColor: '#F59E0B',
          backgroundColor: 'rgba(245,158,11,0.1)',
          tension: 0.3,
          fill: false
        }
      ]
    };
  }, [timeline]);

  const options = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: { position: 'top' as const },
      title: {
        display: true,
        text: `Activity - Last ${days} Days`
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: { stepSize: 1 }
      }
    }
  }), [days]);

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <Line data={data} options={options} />
    </div>
  );
}

export function GroupEngagementChart(props: GroupEngagementChartProps) {
  return (
    <ErrorBoundary componentName="GroupEngagementChart">
      <GroupEngagementChartContent {...props} />
    </ErrorBoundary>
  );
}
