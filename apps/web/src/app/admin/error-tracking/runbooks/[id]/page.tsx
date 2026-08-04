'use client';

import React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ErrorTrackingNavHeader, RUNBOOK_CATALOG } from '@web/components/error-tracking/ErrorTrackingComponents';
import '@web/styles/error-tracking.css';

export default function RunbookDetailPage() {
  const params = useParams<{ id: string }>();
  const runbook = RUNBOOK_CATALOG.find((r) => r.id === params.id);

  return (
    <div className="et-container">
      <ErrorTrackingNavHeader activePath="/admin/error-tracking/incidents" />

      <div className="et-card-panel">
        {!runbook ? (
          <div className="et-state-panel" role="alert">
            <span>Runbook &quot;{params.id}&quot; not found in the catalog.</span>
            <Link className="et-btn-secondary" href="/admin/error-tracking/runbooks" style={{ marginLeft: 'auto' }}>
              Back to runbooks
            </Link>
          </div>
        ) : (
          <>
            <div className="et-panel-header">
              <div>
                <h1 className="et-panel-title">{runbook.title}</h1>
                <p className="et-panel-subtitle">{runbook.summary}</p>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                <span className="et-detail-value mono">{runbook.id}</span>
                <span className={`et-badge et-badge-${runbook.severity.toLowerCase()}`}>{runbook.severity}</span>
              </div>
            </div>

            <div className="et-detail-grid">
              <div className="et-detail-item">
                <span className="et-detail-label">Trigger</span>
                <span className="et-detail-value mono">{runbook.trigger}</span>
              </div>
              <div className="et-detail-item">
                <span className="et-detail-label">Severity</span>
                <span className="et-detail-value">{runbook.severity}</span>
              </div>
            </div>

            <h2 className="et-panel-title" style={{ fontSize: '15px', margin: '20px 0 12px' }}>
              Recovery Steps
            </h2>
            <ol className="et-notes-list">
              {runbook.steps.map((step, idx) => (
                <li className="et-note-item" key={`${runbook.id}-${idx}`}>
                  <span className="et-mono" aria-hidden="true">
                    {idx + 1}.
                  </span>{' '}
                  {step}
                </li>
              ))}
            </ol>

            <div className="et-form-actions" style={{ marginTop: '20px' }}>
              <Link className="et-btn-secondary" href="/admin/error-tracking/runbooks">
                &#8592; All runbooks
              </Link>
              <Link className="et-btn-secondary" href="/admin/error-tracking/incidents">
                Open incidents
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
