'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ErrorTrackingNavHeader,
  SeverityBadge,
  StatusBadge,
  LoadingState,
  ErrorState,
  formatTimestamp
} from '@web/components/error-tracking/ErrorTrackingComponents';
import {
  fetchIncident,
  updateIncidentStatus,
  type IncidentDto,
  type IncidentStatus
} from '@web/lib/api-error-tracking';
import '@web/styles/error-tracking.css';

const NEXT_STATUSES: IncidentStatus[] = ['ACKNOWLEDGED', 'INVESTIGATING', 'RESOLVED', 'CLOSED'];

export default function IncidentDetailPage() {
  const params = useParams<{ id: string }>();
  const incidentId = params.id;

  const [incident, setIncident] = useState<IncidentDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [nextStatus, setNextStatus] = useState<IncidentStatus>('ACKNOWLEDGED');
  const [actor, setActor] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formMessage, setFormMessage] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const detail = await fetchIncident(incidentId);
      setIncident(detail);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load incident');
    } finally {
      setLoading(false);
    }
  }, [incidentId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleStatusUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actor.trim()) {
      setFormMessage({ kind: 'err', text: 'Actor is required before changing status.' });
      return;
    }
    setSubmitting(true);
    setFormMessage(null);
    try {
      const updated = await updateIncidentStatus(incidentId, nextStatus, actor.trim(), note.trim() || undefined);
      setIncident(updated);
      setFormMessage({ kind: 'ok', text: `Incident transitioned to ${nextStatus}.` });
      setNote('');
    } catch (err) {
      setFormMessage({ kind: 'err', text: err instanceof Error ? err.message : 'Failed to update incident status' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="et-container">
      <ErrorTrackingNavHeader activePath="/admin/error-tracking/incidents" />

      {loading && <LoadingState label="incident" />}
      {error && <ErrorState message={error} onRetry={load} />}

      {incident && !loading && (
        <>
          <div className="et-card-panel">
            <div className="et-panel-header">
              <div>
                <h1 className="et-panel-title">{incident.title}</h1>
                <p className="et-panel-subtitle">{incident.summary}</p>
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <SeverityBadge severity={incident.severity} />
                <StatusBadge status={incident.status} />
              </div>
            </div>

            <div className="et-detail-grid">
              <div className="et-detail-item">
                <span className="et-detail-label">Incident ID</span>
                <span className="et-detail-value mono">{incident.id}</span>
              </div>
              <div className="et-detail-item">
                <span className="et-detail-label">Fingerprint</span>
                <span className="et-detail-value mono">{incident.fingerprint}</span>
              </div>
              <div className="et-detail-item">
                <span className="et-detail-label">Rule</span>
                <span className="et-detail-value mono">{incident.ruleId}</span>
              </div>
              <div className="et-detail-item">
                <span className="et-detail-label">Service</span>
                <span className="et-detail-value mono">{incident.serviceName}</span>
              </div>
              <div className="et-detail-item">
                <span className="et-detail-label">Source</span>
                <span className="et-detail-value mono">{incident.source}</span>
              </div>
              <div className="et-detail-item">
                <span className="et-detail-label">Occurrences</span>
                <span className="et-detail-value mono">{incident.occurrenceCount}</span>
              </div>
              <div className="et-detail-item">
                <span className="et-detail-label">Affected services</span>
                <span className="et-detail-value mono">{incident.affectedServices.join(', ')}</span>
              </div>
              <div className="et-detail-item">
                <span className="et-detail-label">First seen</span>
                <span className="et-detail-value">{formatTimestamp(incident.firstSeenAt)}</span>
              </div>
              <div className="et-detail-item">
                <span className="et-detail-label">Last seen</span>
                <span className="et-detail-value">{formatTimestamp(incident.lastSeenAt)}</span>
              </div>
              {incident.acknowledgedAt && (
                <div className="et-detail-item">
                  <span className="et-detail-label">Acknowledged</span>
                  <span className="et-detail-value">
                    {formatTimestamp(incident.acknowledgedAt)} by {incident.acknowledgedBy ?? '—'}
                  </span>
                </div>
              )}
              {incident.investigatingAt && (
                <div className="et-detail-item">
                  <span className="et-detail-label">Investigating since</span>
                  <span className="et-detail-value">
                    {formatTimestamp(incident.investigatingAt)} by {incident.investigatingBy ?? '—'}
                  </span>
                </div>
              )}
              {incident.resolvedAt && (
                <div className="et-detail-item">
                  <span className="et-detail-label">Resolved</span>
                  <span className="et-detail-value">
                    {formatTimestamp(incident.resolvedAt)} by {incident.resolvedBy ?? '—'}
                  </span>
                </div>
              )}
              {incident.closedAt && (
                <div className="et-detail-item">
                  <span className="et-detail-label">Closed</span>
                  <span className="et-detail-value">
                    {formatTimestamp(incident.closedAt)} by {incident.closedBy ?? '—'}
                  </span>
                </div>
              )}
              {incident.runbookRef && (
                <div className="et-detail-item">
                  <span className="et-detail-label">Runbook</span>
                  <span className="et-detail-value mono">
                    <Link href={`/admin/error-tracking/runbooks/${incident.runbookRef}`}>{incident.runbookRef}</Link>
                  </span>
                </div>
              )}
            </div>

            {incident.relatedErrorIds.length > 0 && (
              <div style={{ marginTop: '20px' }}>
                <span className="et-detail-label">Related errors</span>
                <div className="et-tag-list" style={{ marginTop: '6px' }}>
                  {incident.relatedErrorIds.map((errorId) => (
                    <Link
                      className="et-tag"
                      key={errorId}
                      href={`/admin/error-tracking/errors?focus=${encodeURIComponent(errorId)}`}
                    >
                      {errorId}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {incident.notes.length > 0 && (
              <div style={{ marginTop: '20px' }}>
                <span className="et-detail-label">Notes</span>
                <ul className="et-notes-list" style={{ marginTop: '6px' }}>
                  {incident.notes.map((entry, idx) => (
                    <li className="et-note-item" key={`${entry}-${idx}`}>
                      {entry}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="et-card-panel">
            <h2 className="et-panel-title" style={{ fontSize: '16px', marginBottom: '16px' }}>
              Update Incident Status
            </h2>
            <form onSubmit={handleStatusUpdate} noValidate>
              <div className="et-form-row">
                <label className="et-form-label" htmlFor="next-status">
                  Transition to
                </label>
                <select
                  id="next-status"
                  className="et-select"
                  value={nextStatus}
                  onChange={(e) => setNextStatus(e.target.value as IncidentStatus)}
                >
                  {NEXT_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div className="et-form-row">
                <label className="et-form-label" htmlFor="actor">
                  Actor (required)
                </label>
                <input
                  id="actor"
                  type="text"
                  className="et-input"
                  placeholder="e.g. oncall-operator"
                  value={actor}
                  onChange={(e) => setActor(e.target.value)}
                  autoComplete="off"
                />
              </div>
              <div className="et-form-row">
                <label className="et-form-label" htmlFor="note">
                  Note (optional)
                </label>
                <textarea
                  id="note"
                  className="et-textarea"
                  placeholder="What did you do and what is the observed impact?"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </div>
              <div className="et-form-actions">
                <button type="submit" className="et-btn-primary" disabled={submitting}>
                  {submitting ? 'Updating...' : `Mark ${nextStatus}`}
                </button>
                {formMessage && (
                  <span className={`et-form-status ${formMessage.kind === 'ok' ? 'ok' : 'err'}`} role="status">
                    {formMessage.text}
                  </span>
                )}
              </div>
            </form>
          </div>
        </>
      )}
    </div>
  );
}
