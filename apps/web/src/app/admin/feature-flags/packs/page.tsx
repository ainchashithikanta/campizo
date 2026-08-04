'use client';

import React from 'react';
import { FeatureFlagsNavHeader } from '@web/components/feature-flags/FeatureFlagComponents';
import '@web/styles/feature-flags.css';

export default function PacksPage() {
  return (
    <div className="ff-container">
      <FeatureFlagsNavHeader activePath="/admin/feature-flags" />

      <div className="ff-card-panel">
        <h1 style={{ fontSize: '20px', marginBottom: '12px' }}>📦 Deployable Feature Packs</h1>
        <p style={{ color: '#94A3B8', fontSize: '13px', marginBottom: '20px' }}>
          Bundled release management across multiple College Hub modules.
        </p>

        <div style={{ background: '#0F172A', padding: '20px', borderRadius: '8px', border: '1px solid #334155' }}>
          <h3 style={{ fontSize: '15px', color: '#6366F1' }}>Pack: Campus Marketplace Suite v2.4</h3>
          <p style={{ fontSize: '12px', color: '#94A3B8', marginTop: '4px' }}>
            Member flags: <code>marketplace.p2p_chat</code>, <code>marketplace.payment</code>
          </p>
          <button
            className="ff-btn-primary"
            style={{ marginTop: '14px' }}
            onClick={() => alert('Feature pack deployed.')}
          >
            Deploy Feature Pack
          </button>
        </div>
      </div>
    </div>
  );
}
