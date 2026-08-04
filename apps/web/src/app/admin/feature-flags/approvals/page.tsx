'use client';

import React from 'react';
import { FeatureFlagsNavHeader } from '@web/components/feature-flags/FeatureFlagComponents';
import '@web/styles/feature-flags.css';

export default function ApprovalsPage() {
  return (
    <div className="ff-container">
      <FeatureFlagsNavHeader activePath="/admin/feature-flags/approvals" />

      <div className="ff-card-panel">
        <h1 style={{ fontSize: '20px', marginBottom: '12px' }}>🛡️ 4-Eye Approval Center</h1>
        <p style={{ color: '#94A3B8', fontSize: '13px', marginBottom: '20px' }}>
          Double-approval change ticket reviews. Decision timeline & comment logs.
        </p>

        <div style={{ background: '#0F172A', padding: '20px', borderRadius: '8px', borderLeft: '4px solid #F59E0B' }}>
          <div style={{ fontSize: '11px', color: '#F59E0B', fontWeight: 700 }}>PENDING REVIEW (1)</div>
          <h3 style={{ fontSize: '16px', marginTop: '4px' }}>
            Ticket REQ-8841: Enable <code>marketplace.p2p_chat</code> in PRODUCTION
          </h3>
          <p style={{ fontSize: '12px', color: '#94A3B8', marginTop: '4px' }}>
            Requested by dev_lead_01 on 2026-08-03 19:30:00
          </p>
          <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
            <button className="ff-btn-danger" onClick={() => alert('Change ticket REJECTED.')}>
              Reject Ticket
            </button>
            <button className="ff-btn-primary" onClick={() => alert('Change ticket APPROVED.')}>
              Approve Change Ticket
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
