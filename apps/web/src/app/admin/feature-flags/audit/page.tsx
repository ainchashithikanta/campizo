'use client';

import React from 'react';
import { FeatureFlagsNavHeader } from '@web/components/feature-flags/FeatureFlagComponents';
import '@web/styles/feature-flags.css';

export default function AuditTrailPage() {
  return (
    <div className="ff-container">
      <FeatureFlagsNavHeader activePath="/admin/feature-flags/audit" />

      <div className="ff-card-panel">
        <h1 style={{ fontSize: '20px', marginBottom: '12px' }}>📜 Immutable Platform Audit Log</h1>
        <p style={{ color: '#94A3B8', fontSize: '13px', marginBottom: '20px' }}>
          Append-only change history with HMAC signatures, actor user IDs, and timestamp verification.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {[
            { time: '2026-08-03 19:40:00', actor: 'admin_usr_101', action: 'UPDATE_ROLLOUT', flag: 'ai.study_assistant', hash: 'hmac_9948a' },
            { time: '2026-08-03 18:30:00', actor: 'admin_usr_101', action: 'ENABLE_FLAG', flag: 'marketplace.p2p_chat', hash: 'hmac_1120b' },
            { time: '2026-08-03 17:15:00', actor: 'system_worker', action: 'AUTO_CACHE_WARMUP', flag: 'global', hash: 'hmac_7719c' }
          ].map((item, idx) => (
            <div key={idx} style={{ padding: '14px', background: '#0F172A', borderRadius: '8px', border: '1px solid #334155', display: 'flex', justifyContent: 'space-between' }}>
              <div>
                <span style={{ fontSize: '11px', fontFamily: 'monospace', color: '#94A3B8' }}>{item.time}</span>
                <div style={{ fontWeight: 600, fontSize: '13px', marginTop: '2px' }}>
                  {item.actor} performed <code>{item.action}</code> on <code>{item.flag}</code>
                </div>
              </div>
              <span style={{ fontSize: '11px', fontFamily: 'monospace', color: '#06B6D4' }}>{item.hash}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
