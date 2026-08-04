'use client';

import React from 'react';
import { FeatureFlagsNavHeader } from '@web/components/feature-flags/FeatureFlagComponents';
import '@web/styles/feature-flags.css';

export default function GroupsPage() {
  return (
    <div className="ff-container">
      <FeatureFlagsNavHeader activePath="/admin/feature-flags" />

      <div className="ff-card-panel">
        <h1 style={{ fontSize: '20px', marginBottom: '12px' }}>📂 Feature Groups Management</h1>
        <p style={{ color: '#94A3B8', fontSize: '13px', marginBottom: '20px' }}>
          Hierarchical module-level enablement across College Hub platform services.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
          {['Marketplace', 'Confessions', 'Academic Resources', 'Connect', 'Clubs', 'Events', 'Alumni', 'AI'].map(
            (mod) => (
              <div
                key={mod}
                style={{ background: '#0F172A', padding: '16px', borderRadius: '8px', border: '1px solid #334155' }}
              >
                <div style={{ fontWeight: 700, fontSize: '15px' }}>{mod}</div>
                <div style={{ fontSize: '12px', color: '#94A3B8', marginTop: '4px' }}>
                  Module Group Enabled (100% SLA)
                </div>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}
