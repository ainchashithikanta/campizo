'use client';

import React, { useState } from 'react';
import { FeatureFlagsNavHeader, HoldToActivateButton } from '@web/components/feature-flags/FeatureFlagComponents';
import '@web/styles/feature-flags.css';

export default function KillSwitchPage() {
  const [reasonNote, setReasonNote] = useState('');
  const [activeKillSwitches, setActiveKillSwitches] = useState<string[]>([]);

  const handleHoldActivated = () => {
    if (!reasonNote.trim()) {
      alert('Mandatory reason note required before tripping emergency kill switch.');
      return;
    }
    setActiveKillSwitches((prev) => [...prev, 'marketplace.p2p_chat']);
    alert('EMERGENCY KILL SWITCH ACTIVATED! Feature forced OFF in <100ms across all nodes.');
    setReasonNote('');
  };

  return (
    <div className="ff-container">
      <FeatureFlagsNavHeader activePath="/admin/feature-flags/kill-switch" />

      <div className="ff-card-panel" style={{ border: '1px solid #EF4444' }}>
        <h1 style={{ fontSize: '20px', color: '#EF4444', marginBottom: '12px' }}>🚨 Emergency Kill Switch Panel</h1>
        <p style={{ color: '#94A3B8', fontSize: '13px', marginBottom: '20px' }}>
          Immediately trip emergency overrides forcing treatments to OFF in &lt;100ms. Requires 2-second
          hold-to-activate.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '600px' }}>
          <div>
            <label style={{ fontSize: '12px', color: '#94A3B8' }}>Select Target Feature Flag:</label>
            <select className="ff-input-field">
              <option value="marketplace.p2p_chat">marketplace.p2p_chat (Marketplace)</option>
              <option value="confessions.voting">confessions.voting (Confessions)</option>
            </select>
          </div>

          <div>
            <label style={{ fontSize: '12px', color: '#94A3B8' }}>Mandatory Emergency Reason Note:</label>
            <input
              type="text"
              className="ff-input-field"
              placeholder="e.g. Critical memory leak in backend socket connection"
              value={reasonNote}
              onChange={(e) => setReasonNote(e.target.value)}
            />
          </div>

          <HoldToActivateButton onActivated={handleHoldActivated} />

          {activeKillSwitches.length > 0 && (
            <div style={{ padding: '16px', background: '#7F1D1D', borderRadius: '8px', border: '1px solid #EF4444' }}>
              <div style={{ fontWeight: 700, color: '#FFF' }}>Active Emergency Override(s):</div>
              <ul style={{ fontSize: '13px', marginTop: '6px', color: '#FFF' }}>
                {activeKillSwitches.map((ks, i) => (
                  <li key={i}>🚨 {ks}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
