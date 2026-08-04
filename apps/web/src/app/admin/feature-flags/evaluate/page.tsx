'use client';

import React, { useState } from 'react';
import { FeatureFlagsNavHeader, TraceIdBadge } from '@web/components/feature-flags/FeatureFlagComponents';
import { featureFlagsApi, EvaluationResultDto } from '@web/lib/api-feature-flags';
import '@web/styles/feature-flags.css';

export default function EvaluationPlaygroundPage() {
  const [flagKey, setFlagKey] = useState('marketplace.p2p_chat');
  const [userId, setUserId] = useState('user_101');
  const [collegeId, setCollegeId] = useState('college_stanford_001');
  const [result, setResult] = useState<EvaluationResultDto | null>(null);

  const handleEvaluate = async () => {
    const res = await featureFlagsApi.evaluateFeature(flagKey, { userId, collegeId });
    setResult(res);
  };

  return (
    <div className="ff-container">
      <FeatureFlagsNavHeader activePath="/admin/feature-flags/evaluate" />

      <div className="ff-card-panel">
        <h1 style={{ fontSize: '20px', marginBottom: '12px' }}>🧪 Feature Evaluation Playground</h1>
        <p style={{ color: '#94A3B8', fontSize: '13px', marginBottom: '20px' }}>
          Evaluate single features, module groups, dry runs, and target simulations.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ fontSize: '12px', color: '#94A3B8' }}>Feature Flag Key:</label>
              <input
                type="text"
                className="ff-input-field"
                value={flagKey}
                onChange={(e) => setFlagKey(e.target.value)}
              />
            </div>

            <div>
              <label style={{ fontSize: '12px', color: '#94A3B8' }}>User ID Context:</label>
              <input
                type="text"
                className="ff-input-field"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
              />
            </div>

            <div>
              <label style={{ fontSize: '12px', color: '#94A3B8' }}>College ID Context:</label>
              <input
                type="text"
                className="ff-input-field"
                value={collegeId}
                onChange={(e) => setCollegeId(e.target.value)}
              />
            </div>

            <button className="ff-btn-primary" onClick={handleEvaluate}>
              Run Evaluation Pipeline
            </button>
          </div>

          {result && (
            <div style={{ background: '#0F172A', padding: '20px', borderRadius: '8px', border: '1px solid #334155' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                <span style={{ fontSize: '12px', color: '#94A3B8' }}>EVALUATION RESULT</span>
                <TraceIdBadge traceId={result.traceId} />
              </div>

              <div style={{ fontSize: '24px', fontWeight: 700, color: result.enabled ? '#10B981' : '#EF4444' }}>
                {result.enabled ? '🟢 ENABLED (TRUE)' : '🔴 DISABLED (FALSE)'}
              </div>

              <div
                style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}
              >
                <div>
                  <strong>Reason:</strong> {result.reason}
                </div>
                <div>
                  <strong>Matched Policy:</strong> <code>{result.matchedRule}</code>
                </div>
                <div>
                  <strong>Evaluation Time:</strong> {result.evaluationTimeMs} ms
                </div>
                <div>
                  <strong>Cache Source:</strong> {result.cacheSource}
                </div>
                <div>
                  <strong>Config Version:</strong> v{result.configurationVersion}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
