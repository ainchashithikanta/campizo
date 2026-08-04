'use client';

import React from 'react';
import { FeatureFlagsNavHeader } from '@web/components/feature-flags/FeatureFlagComponents';
import '@web/styles/feature-flags.css';

export default function SnapshotsPage() {
  return (
    <div className="ff-container">
      <FeatureFlagsNavHeader activePath="/admin/feature-flags/snapshots" />

      <div className="ff-card-panel">
        <h1 style={{ fontSize: '20px', marginBottom: '12px' }}>📸 Configuration Snapshot Center</h1>
        <p style={{ color: '#94A3B8', fontSize: '13px', marginBottom: '20px' }}>
          Point-in-time state comparison, JSON diff, and 1-click environment restore.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div
            style={{
              padding: '16px',
              background: '#0F172A',
              borderRadius: '8px',
              border: '1px solid #334155',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}
          >
            <div>
              <div style={{ fontFamily: 'monospace', fontWeight: 700, color: '#6366F1' }}>snap_1722714488</div>
              <div style={{ fontSize: '12px', color: '#94A3B8', marginTop: '2px' }}>
                Created 2026-08-03 19:50:00 | HMAC: <code>hmac_sha256_88a91c</code>
              </div>
            </div>
            <button className="ff-btn-primary" onClick={() => alert('Snapshot restored.')}>
              Restore Snapshot
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
