'use client';

import React, { useState } from 'react';
import { FeatureFlagsNavHeader } from '@web/components/feature-flags/FeatureFlagComponents';
import '@web/styles/feature-flags.css';

export default function RolloutWizardPage() {
  const [step, setStep] = useState(1);

  return (
    <div className="ff-container">
      <FeatureFlagsNavHeader activePath="/admin/feature-flags/rollouts" />

      <div className="ff-card-panel">
        <h1 style={{ fontSize: '20px', marginBottom: '12px' }}>🚀 Guided Canary Rollout Wizard</h1>
        <p style={{ color: '#94A3B8', fontSize: '13px', marginBottom: '20px' }}>
          Step-by-step rollout wizard: Feature ➔ Audience ➔ Colleges ➔ Roles ➔ Users ➔ Percentage ➔ Schedule ➔ Impact Preview ➔ Approval.
        </p>

        <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
          {[1, 2, 3, 4, 5].map((s) => (
            <div key={s} style={{ flex: 1, padding: '10px', background: step === s ? '#6366F1' : '#1E293B', color: '#FFF', borderRadius: '6px', textAlign: 'center', fontSize: '12px', fontWeight: 700 }}>
              Step {s}
            </div>
          ))}
        </div>

        {step === 1 && (
          <div>
            <h3>Step 1: Select Feature Flag</h3>
            <select className="ff-input-field" style={{ marginTop: '12px' }}>
              <option value="marketplace.p2p_chat">marketplace.p2p_chat</option>
              <option value="confessions.voting">confessions.voting</option>
            </select>
            <button className="ff-btn-primary" style={{ marginTop: '16px' }} onClick={() => setStep(2)}>
              Next: Audience Selection ➔
            </button>
          </div>
        )}

        {step >= 2 && (
          <div>
            <h3>Step {step}: Cohort & Impact Verification</h3>
            <p style={{ color: '#94A3B8', fontSize: '13px', marginTop: '8px' }}>Configuring percentage step rollout for target audience.</p>
            <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
              <button className="ff-btn-primary" onClick={() => setStep((s) => Math.max(1, s - 1))}>Back</button>
              <button className="ff-btn-primary" onClick={() => setStep((s) => Math.min(5, s + 1))}>Next Step ➔</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
