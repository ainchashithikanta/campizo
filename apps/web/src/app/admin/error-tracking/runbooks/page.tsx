'use client';

import React from 'react';
import Link from 'next/link';
import { ErrorTrackingNavHeader, RUNBOOK_CATALOG } from '@web/components/error-tracking/ErrorTrackingComponents';
import '@web/styles/error-tracking.css';

export default function RunbooksIndexPage() {
  return (
    <div className="et-container">
      <ErrorTrackingNavHeader activePath="/admin/error-tracking/incidents" />

      <div className="et-card-panel">
        <div className="et-panel-header">
          <div>
            <h1 className="et-panel-title">Incident Runbooks</h1>
            <p className="et-panel-subtitle">
              Operational procedures referenced by automatic incidents. Deep documentation lives under docs/runbooks/.
            </p>
          </div>
        </div>

        <div className="et-table-wrap">
          <table className="et-table">
            <thead>
              <tr>
                <th>Runbook</th>
                <th>Trigger</th>
                <th>Severity</th>
                <th>Steps</th>
              </tr>
            </thead>
            <tbody>
              {RUNBOOK_CATALOG.map((runbook) => (
                <tr key={runbook.id} tabIndex={0}>
                  <td>
                    <Link className="et-detail-value mono" href={`/admin/error-tracking/runbooks/${runbook.id}`}>
                      {runbook.id}
                    </Link>
                    <div className="et-metric-sub" style={{ marginTop: '2px' }}>
                      {runbook.title}
                    </div>
                  </td>
                  <td className="et-mono">{runbook.trigger}</td>
                  <td>{runbook.severity}</td>
                  <td className="et-mono">{runbook.steps.length}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
