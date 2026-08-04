'use client';

import React from 'react';
import { FeatureFlagsNavHeader } from '@web/components/feature-flags/FeatureFlagComponents';
import '@web/styles/feature-flags.css';

export default function TemplatesPage() {
  return (
    <div className="ff-container">
      <FeatureFlagsNavHeader activePath="/admin/feature-flags" />

      <div className="ff-card-panel">
        <h1 style={{ fontSize: '20px', marginBottom: '12px' }}>📋 Feature Templates & Presets</h1>
        <p style={{ color: '#94A3B8', fontSize: '13px', marginBottom: '20px' }}>
          Standardized presets for Beta, Internal, Experimental, Production, and Emergency deployments.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
          {['BETA Preset', 'INTERNAL Preset', 'EXPERIMENTAL Preset', 'PRODUCTION Standard', 'EMERGENCY Override'].map(
            (t) => (
              <div
                key={t}
                style={{ background: '#0F172A', padding: '16px', borderRadius: '8px', border: '1px solid #334155' }}
              >
                <div style={{ fontWeight: 700, fontSize: '14px' }}>{t}</div>
                <button
                  className="ff-btn-primary"
                  style={{ marginTop: '12px', width: '100%' }}
                  onClick={() => alert(`Applied template ${t}`)}
                >
                  Apply Template
                </button>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}
