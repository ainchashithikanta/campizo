'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ErrorTrackingNavHeader,
  MetricCard,
  SeverityBadge,
  StatusBadge,
  LoadingState,
  ErrorState,
  formatTimestamp
} from '@web/components/error-tracking/ErrorTrackingComponents';
import {
  fetchErrorsStatistics,
  fetchErrors,
  fetchIncidents,
  type ErrorsStatisticsDto,
  type TrackedErrorDto,
  type IncidentDto
} from '@web/lib/api-error-tracking';
import '@web/styles/error-tracking.css';

const REFRESH_INTERVAL_MS = 30000;

export default function ErrorTrackingDashboardPage() {
  const router = useRouter();
  const [statistics, setStatistics] = useState<ErrorsStatisticsDto | null>(null);
  const [recentErrors, setRecentErrors] = useState<TrackedErrorDto[]>([]);
  const [recentIncidents, setRecentIncidents] = useState<IncidentDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [lastRefreshed, setLastRefreshed] = useState<string>('');

  const load = useCallback(async () => {
    setError('');
    try {
      const [stats, errors, incidents] = await Promise.all([
        fetchErrorsStatistics(),
        fetchErrors({ page: 1, limit: 8 }),
        fetchIncidents({ page: 1, limit: 8 })
      ]);
      setStatistics(stats);
      setRecentErrors(errors.items);
      setRecentIncidents(incidents.items);
      setLastRefreshed(new Date().toLocaleTimeString());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load error tracking data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [load]);

  const maxClassCount = statistics ? Math.max(1, ...Object.values(statistics.byClass)) : 1;
  const maxSeverityCount = statistics ? Math.max(1, ...Object.values(statistics.bySeverity)) : 1;

  return (
    <div className="et-container">
      <ErrorTrackingNavHeader activePath="/admin/error-tracking" />

      <div className="et-card-panel">
        <div className="et-panel-header">
          <div>
            <h1 className="et-panel-title">Error Tracking & Incident Response</h1>
            <p className="et-panel-subtitle">
              Aggregated production errors, automatic incidents and affected services. Auto-refreshing every 30s.
            </p>
          </div>
          <div className="et-metric-sub">Last refreshed: {lastRefreshed || 'Loading...'}</div>
        </div>

        {loading && !statistics && <LoadingState label="error tracking statistics" />}
        {error && <ErrorState message={error} onRetry={load} />}

        {statistics && (
          <>
            <div className="et-grid-metrics">
              <MetricCard title="Total Errors" value={statistics.totalErrors} subtitle="Across all services" />
              <MetricCard title="Open Errors" value={statistics.openErrors} subtitle="Active in current window" />
              <MetricCard title="Resolved Errors" value={statistics.resolvedErrors} subtitle="Lifecycle complete" />
              <MetricCard
                title="Open Incidents"
                value={statistics.openIncidents}
                subtitle="Requiring operator attention"
              />
            </div>

            <div className="et-detail-grid">
              <div>
                <h2 className="et-panel-title" style={{ fontSize: '15px', marginBottom: '12px' }}>
                  Errors by Class
                </h2>
                <div className="et-distribution">
                  {Object.entries(statistics.byClass).map(([errorClass, count]) => (
                    <div className="et-distribution-row" key={errorClass}>
                      <span className="et-distribution-label">{errorClass}</span>
                      <div className="et-distribution-track">
                        <div className="et-distribution-fill" style={{ width: `${(count / maxClassCount) * 100}%` }} />
                      </div>
                      <span className="et-distribution-count">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h2 className="et-panel-title" style={{ fontSize: '15px', marginBottom: '12px' }}>
                  Errors by Severity
                </h2>
                <div className="et-distribution">
                  {Object.entries(statistics.bySeverity).map(([severity, count]) => (
                    <div className="et-distribution-row" key={severity}>
                      <span className="et-distribution-label">{severity}</span>
                      <div className="et-distribution-track">
                        <div
                          className="et-distribution-fill"
                          style={{ width: `${(count / maxSeverityCount) * 100}%` }}
                        />
                      </div>
                      <span className="et-distribution-count">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {statistics.affectedServices.length > 0 && (
              <div style={{ marginTop: '20px' }}>
                <h2 className="et-panel-title" style={{ fontSize: '15px', marginBottom: '12px' }}>
                  Affected Services
                </h2>
                <div className="et-tag-list">
                  {statistics.affectedServices.map((service) => (
                    <span className="et-tag" key={service}>
                      {service}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <div className="et-detail-grid">
        <div className="et-card-panel">
          <div className="et-panel-header">
            <h2 className="et-panel-title" style={{ fontSize: '16px' }}>
              Recent Errors
            </h2>
            <Link className="et-btn-secondary" href="/admin/error-tracking/errors">
              View all
            </Link>
          </div>
          {recentErrors.length === 0 ? (
            <p className="et-table-empty">No errors captured yet.</p>
          ) : (
            <div className="et-table-wrap">
              <table className="et-table">
                <thead>
                  <tr>
                    <th>Message</th>
                    <th>Class</th>
                    <th>Severity</th>
                    <th>Occurrences</th>
                    <th>Last seen</th>
                  </tr>
                </thead>
                <tbody>
                  {recentErrors.map((err) => (
                    <tr
                      key={err.id}
                      tabIndex={0}
                      onClick={() => router.push(`/admin/error-tracking/errors?focus=${encodeURIComponent(err.id)}`)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          router.push(`/admin/error-tracking/errors?focus=${encodeURIComponent(err.id)}`);
                        }
                      }}
                    >
                      <td className="et-truncate" title={err.message}>
                        {err.message}
                      </td>
                      <td>{err.errorClass}</td>
                      <td>
                        <SeverityBadge severity={err.severity} />
                      </td>
                      <td className="et-mono">{err.occurrenceCount}</td>
                      <td className="et-mono">{formatTimestamp(err.lastSeenAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="et-card-panel">
          <div className="et-panel-header">
            <h2 className="et-panel-title" style={{ fontSize: '16px' }}>
              Recent Incidents
            </h2>
            <Link className="et-btn-secondary" href="/admin/error-tracking/incidents">
              View all
            </Link>
          </div>
          {recentIncidents.length === 0 ? (
            <p className="et-table-empty">No incidents have been generated.</p>
          ) : (
            <div className="et-table-wrap">
              <table className="et-table">
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Severity</th>
                    <th>Status</th>
                    <th>Occurrences</th>
                  </tr>
                </thead>
                <tbody>
                  {recentIncidents.map((incident) => (
                    <tr
                      key={incident.id}
                      tabIndex={0}
                      onClick={() => router.push(`/admin/error-tracking/incidents/${incident.id}`)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          router.push(`/admin/error-tracking/incidents/${incident.id}`);
                        }
                      }}
                    >
                      <td className="et-truncate" title={incident.title}>
                        {incident.title}
                      </td>
                      <td>
                        <SeverityBadge severity={incident.severity} />
                      </td>
                      <td>
                        <StatusBadge status={incident.status} />
                      </td>
                      <td className="et-mono">{incident.occurrenceCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
