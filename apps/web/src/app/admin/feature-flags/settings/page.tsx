'use client';

import React from 'react';
import { FeatureFlagsNavHeader } from '@web/components/feature-flags/FeatureFlagComponents';
import '@web/styles/feature-flags.css';

export default function SettingsPage() {
  return (
    <div className="ff-container">
      <FeatureFlagsNavHeader activePath="/admin/feature-flags" />

      <div className="ff-card-panel">
        <h1 style={{ fontSize: '20px', marginBottom: '12px' }}>⚙️ Platform Feature Flags System Settings</h1>
        <p style={{ color: '#94A3B8', fontSize: '13px', marginBottom: '20px' }}>
          SDK connection tokens, Redis Pub/Sub channels, and RBAC role assignments.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '600px' }}>
          <div>
            <label style={{ fontSize: '12px', color: '#94A3B8' }}>SDK Environment Secret Token:</label>
            <input type="password" className="ff-input-field" value="sdk_prod_sec_88491c92a01f" readOnly />
          </div>

          <div>
            <label style={{ fontSize: '12px', color: '#94A3B8' }}>Redis Pub/Sub Hot-Reload Channel:</label>
            <input type="text" className="ff-input-field" value="feature-flags:events:hot-reload" readOnly />
          </div>

          <button className="ff-btn-primary" onClick={() => alert('Settings saved.')}>Save Settings</button>
        </div>
      </div>
    </div>
  );
}
