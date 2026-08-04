'use client';

import React from 'react';
import { FeatureFlagsNavHeader, MetricCard } from '@web/components/feature-flags/FeatureFlagComponents';
import '@web/styles/feature-flags.css';

export default function AnalyticsPage() {
  return (
    <div className="ff-container">
      <FeatureFlagsNavHeader activePath="/admin/feature-flags/analytics" />

      <div className="ff-card-panel">
        <h1 style={{ fontSize: '20px', marginBottom: '12px' }}>📊 Evaluation & Telemetry Analytics</h1>
        <p style={{ color: '#94A3B8', fontSize: '13px', marginBottom: '24px' }}>
          Evaluation throughput, cache hit ratios, worker processing latency, and stale flag analytics.
        </p>

        <div className="ff-grid-metrics">
          <MetricCard title="Total Evaluations (24h)" value="1,450,220" subtitle="Peak: 2,400 req/sec" />
          <MetricCard title="Cache Hit Ratio" value="99.98%" subtitle="0.02% fallback defaults" />
          <MetricCard title="Avg Worker Latency" value="1.2 ms" subtitle="SLA < 50 ms" />
          <MetricCard title="Stale Flags (>60 days)" value="1" subtitle="marketplace.legacy_chat" />
        </div>
      </div>
    </div>
  );
}
