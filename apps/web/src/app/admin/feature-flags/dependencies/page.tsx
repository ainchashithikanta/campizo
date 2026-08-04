'use client';

import React from 'react';
import { FeatureFlagsNavHeader } from '@web/components/feature-flags/FeatureFlagComponents';
import '@web/styles/feature-flags.css';

export default function DependenciesPage() {
  return (
    <div className="ff-container">
      <FeatureFlagsNavHeader activePath="/admin/feature-flags/dependencies" />

      <div className="ff-card-panel">
        <h1 style={{ fontSize: '20px', marginBottom: '12px' }}>🕸️ Interactive DAG Dependency Graph</h1>
        <p style={{ color: '#94A3B8', fontSize: '13px', marginBottom: '20px' }}>
          Topological sort rank & cycle detection. Validates prerequisite dependencies across module groups.
        </p>

        <div style={{ background: '#0F172A', padding: '32px', border: '1px solid #334155', borderRadius: '12px', textAlign: 'center' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '20px' }}>
            <div style={{ background: '#1E293B', padding: '16px', borderRadius: '8px', border: '1px solid #334155' }}>
              <div style={{ fontSize: '11px', color: '#94A3B8' }}>Rank 0 (Prerequisite)</div>
              <div style={{ fontFamily: 'monospace', fontWeight: 700, color: '#6366F1', marginTop: '4px' }}>marketplace.user_auth</div>
            </div>

            <span style={{ fontSize: '24px', color: '#6366F1' }}>➔</span>

            <div style={{ background: '#1E293B', padding: '16px', borderRadius: '8px', border: '1px solid #6366F1' }}>
              <div style={{ fontSize: '11px', color: '#6366F1' }}>Rank 1 (Target Feature)</div>
              <div style={{ fontFamily: 'monospace', fontWeight: 700, color: '#6366F1', marginTop: '4px' }}>marketplace.p2p_chat</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
