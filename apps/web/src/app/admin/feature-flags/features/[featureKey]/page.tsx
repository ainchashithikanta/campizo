'use client';

import React, { useState, use } from 'react';
import { FeatureFlagsNavHeader, TraceIdBadge } from '@web/components/feature-flags/FeatureFlagComponents';
import '@web/styles/feature-flags.css';

export default function FeatureDetailPage({ params }: { params: Promise<{ featureKey: string }> }) {
  const { featureKey } = use(params);
  const [activeTab, setActiveTab] = useState<
    | 'overview'
    | 'evaluation'
    | 'dependencies'
    | 'rollouts'
    | 'approvals'
    | 'snapshots'
    | 'analytics'
    | 'audit'
    | 'danger'
  >('overview');

  return (
    <div className="ff-container">
      <FeatureFlagsNavHeader activePath="/admin/feature-flags" />

      <div className="ff-card-panel">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontFamily: 'monospace', color: '#6366F1' }}>{featureKey}</h1>
            <p style={{ color: '#94A3B8', fontSize: '13px', marginTop: '4px' }}>
              Marketplace P2P Buyer-Seller Direct Messaging
            </p>
          </div>
          <TraceIdBadge traceId={`trace_detail_${featureKey}`} />
        </div>

        <div
          style={{
            display: 'flex',
            gap: '8px',
            marginBottom: '20px',
            borderBottom: '1px solid #334155',
            paddingBottom: '12px'
          }}
        >
          {(
            [
              'overview',
              'evaluation',
              'dependencies',
              'rollouts',
              'approvals',
              'snapshots',
              'analytics',
              'audit',
              'danger'
            ] as const
          ).map((t) => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              style={{
                background: activeTab === t ? '#6366F1' : '#1E293B',
                color: '#FFF',
                padding: '8px 14px',
                borderRadius: '6px',
                border: 'none',
                fontSize: '12px',
                fontWeight: 600,
                textTransform: 'capitalize',
                cursor: 'pointer'
              }}
            >
              {t}
            </button>
          ))}
        </div>

        {activeTab === 'overview' && (
          <div>
            <h3>Overview & Metadata</h3>
            <p style={{ color: '#94A3B8', fontSize: '13px', marginTop: '8px' }}>
              Owner Team: Team Marketplace | Version: v4 | Lifecycle: PRODUCTION
            </p>
          </div>
        )}

        {activeTab === 'danger' && (
          <div style={{ border: '1px solid #EF4444', padding: '16px', borderRadius: '8px' }}>
            <h3 style={{ color: '#EF4444' }}>Danger Zone</h3>
            <p style={{ fontSize: '12px', color: '#94A3B8', marginBlock: '8px' }}>
              Archiving or removing a feature flag requires confirmation.
            </p>
            <button
              className="ff-btn-danger"
              onClick={() => confirm(`Are you sure you want to archive ${featureKey}?`) && alert('Feature archived.')}
            >
              Archive Feature Flag
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
