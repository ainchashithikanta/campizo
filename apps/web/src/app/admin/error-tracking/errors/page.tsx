'use client';

import React, { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  ErrorTrackingNavHeader,
  SeverityBadge,
  StatusBadge,
  ClassBadge,
  LoadingState,
  ErrorState,
  PaginationBar,
  formatTimestamp
} from '@web/components/error-tracking/ErrorTrackingComponents';
import {
  fetchErrors,
  fetchError,
  type TrackedErrorDto,
  type ErrorClass,
  type ErrorSeverity,
  type IncidentStatus
} from '@web/lib/api-error-tracking';
import '@web/styles/error-tracking.css';

const PAGE_SIZE = 20;

const ERROR_CLASSES: ErrorClass[] = [
  'Validation',
  'Infrastructure',
  'Database',
  'Network',
  'Authentication',
  'Authorization',
  'BusinessLogic',
  'Unknown'
];

const SEVERITIES: ErrorSeverity[] = ['INFO', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

const STATUSES: IncidentStatus[] = ['OPEN', 'ACKNOWLEDGED', 'INVESTIGATING', 'RESOLVED', 'CLOSED'];

export default function ErrorTrackingErrorsPage() {
  return (
    <Suspense
      fallback={
        <div className="et-container">
          <ErrorTrackingNavHeader activePath="/admin/error-tracking/errors" />
          <LoadingState label="errors" />
        </div>
      }
    >
      <ErrorsContent />
    </Suspense>
  );
}

function ErrorsContent() {
  const searchParams = useSearchParams();
  const focusId = searchParams.get('focus');

  const [errors, setErrors] = useState<TrackedErrorDto[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [errorClass, setErrorClass] = useState<ErrorClass | ''>('');
  const [severity, setSeverity] = useState<ErrorSeverity | ''>('');
  const [status, setStatus] = useState<IncidentStatus | ''>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [selected, setSelected] = useState<TrackedErrorDto | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string>('');
  const didFocus = useRef(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await fetchErrors({
        page,
        limit: PAGE_SIZE,
        search: search || undefined,
        errorClass: errorClass || undefined,
        severity: severity || undefined,
        status: status || undefined
      });
      setErrors(result.items);
      setTotal(result.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load errors');
    } finally {
      setLoading(false);
    }
  }, [page, search, errorClass, severity, status]);

  useEffect(() => {
    load();
  }, [load]);

  const openDetail = useCallback(async (id: string) => {
    setDetailLoading(true);
    setDetailError('');
    try {
      const detail = await fetchError(id);
      setSelected(detail);
    } catch (err) {
      setDetailError(err instanceof Error ? err.message : 'Failed to load error detail');
      setSelected(null);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    if (focusId && !didFocus.current) {
      didFocus.current = true;
      openDetail(focusId);
    }
  }, [focusId, openDetail]);

  const resetPage = () => setPage(1);

  return (
    <div className="et-container">
      <ErrorTrackingNavHeader activePath="/admin/error-tracking/errors" />

      <div className="et-card-panel">
        <div className="et-panel-header">
          <div>
            <h1 className="et-panel-title">Tracked Errors</h1>
            <p className="et-panel-subtitle">
              Deduplicated by fingerprint: identical errors are aggregated into a single occurrence group.
            </p>
          </div>
        </div>

        <div className="et-toolbar" role="search" aria-label="Error filters">
          <input
            type="search"
            className="et-input"
            placeholder="Search message, service, route..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              resetPage();
            }}
            aria-label="Search errors"
          />
          <select
            className="et-select"
            value={errorClass}
            onChange={(e) => {
              setErrorClass(e.target.value as ErrorClass | '');
              resetPage();
            }}
            aria-label="Filter by error class"
          >
            <option value="">All classes</option>
            {ERROR_CLASSES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <select
            className="et-select"
            value={severity}
            onChange={(e) => {
              setSeverity(e.target.value as ErrorSeverity | '');
              resetPage();
            }}
            aria-label="Filter by severity"
          >
            <option value="">All severities</option>
            {SEVERITIES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <select
            className="et-select"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as IncidentStatus | '');
              resetPage();
            }}
            aria-label="Filter by lifecycle status"
          >
            <option value="">All statuses</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        {loading && errors.length === 0 && <LoadingState label="errors" />}
        {error && <ErrorState message={error} onRetry={load} />}

        {!loading && !error && (
          <div className="et-table-wrap">
            <table className="et-table">
              <thead>
                <tr>
                  <th>Message</th>
                  <th>Class</th>
                  <th>Severity</th>
                  <th>Source</th>
                  <th>Service</th>
                  <th>Status</th>
                  <th>Occurrences</th>
                  <th>First seen</th>
                  <th>Last seen</th>
                </tr>
              </thead>
              <tbody>
                {errors.length === 0 && (
                  <tr>
                    <td className="et-table-empty" colSpan={9}>
                      No errors match the current filters.
                    </td>
                  </tr>
                )}
                {errors.map((err) => (
                  <tr
                    key={err.id}
                    tabIndex={0}
                    onClick={() => openDetail(err.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        openDetail(err.id);
                      }
                    }}
                  >
                    <td className="et-truncate" title={err.message}>
                      {err.message}
                    </td>
                    <td>
                      <ClassBadge errorClass={err.errorClass} />
                    </td>
                    <td>
                      <SeverityBadge severity={err.severity} />
                    </td>
                    <td className="et-mono">{err.source}</td>
                    <td className="et-mono">{err.serviceName}</td>
                    <td>
                      <StatusBadge status={err.status} />
                    </td>
                    <td className="et-mono">{err.occurrenceCount}</td>
                    <td className="et-mono">{formatTimestamp(err.firstSeenAt)}</td>
                    <td className="et-mono">{formatTimestamp(err.lastSeenAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <PaginationBar
              page={page}
              total={total}
              pageSize={PAGE_SIZE}
              hasMore={page * PAGE_SIZE < total}
              onPageChange={setPage}
            />
          </div>
        )}
      </div>

      {(detailLoading || selected || detailError) && (
        <>
          <div className="et-drawer-backdrop" onClick={() => setSelected(null)} />
          <div className="et-drawer" role="dialog" aria-label="Error details">
            {detailLoading && <LoadingState label="error detail" />}
            {detailError && <ErrorState message={detailError} onRetry={() => selected && openDetail(selected.id)} />}
            {selected && !detailLoading && (
              <>
                <div className="et-drawer-header">
                  <div>
                    <h2 className="et-panel-title" style={{ fontSize: '16px' }}>
                      Error Detail
                    </h2>
                    <div style={{ display: 'flex', gap: '8px', marginTop: '8px', flexWrap: 'wrap' }}>
                      <ClassBadge errorClass={selected.errorClass} />
                      <SeverityBadge severity={selected.severity} />
                      <StatusBadge status={selected.status} />
                    </div>
                  </div>
                  <button
                    type="button"
                    className="et-drawer-close"
                    onClick={() => setSelected(null)}
                    aria-label="Close error detail"
                  >
                    &#215;
                  </button>
                </div>

                <div className="et-detail-grid">
                  <div className="et-detail-item">
                    <span className="et-detail-label">Message</span>
                    <span className="et-detail-value">{selected.message}</span>
                  </div>
                  <div className="et-detail-item">
                    <span className="et-detail-label">Error name</span>
                    <span className="et-detail-value">{selected.name}</span>
                  </div>
                  <div className="et-detail-item">
                    <span className="et-detail-label">ID</span>
                    <span className="et-detail-value mono">{selected.id}</span>
                  </div>
                  <div className="et-detail-item">
                    <span className="et-detail-label">Fingerprint</span>
                    <span className="et-detail-value mono">{selected.fingerprint}</span>
                  </div>
                  <div className="et-detail-item">
                    <span className="et-detail-label">Service</span>
                    <span className="et-detail-value mono">{selected.serviceName}</span>
                  </div>
                  <div className="et-detail-item">
                    <span className="et-detail-label">Source</span>
                    <span className="et-detail-value mono">{selected.source}</span>
                  </div>
                  <div className="et-detail-item">
                    <span className="et-detail-label">Occurrences</span>
                    <span className="et-detail-value mono">{selected.occurrenceCount}</span>
                  </div>
                  <div className="et-detail-item">
                    <span className="et-detail-label">Affected services</span>
                    <span className="et-detail-value mono">{selected.affectedServices.join(', ')}</span>
                  </div>
                  <div className="et-detail-item">
                    <span className="et-detail-label">First seen</span>
                    <span className="et-detail-value">{formatTimestamp(selected.firstSeenAt)}</span>
                  </div>
                  <div className="et-detail-item">
                    <span className="et-detail-label">Last seen</span>
                    <span className="et-detail-value">{formatTimestamp(selected.lastSeenAt)}</span>
                  </div>
                  <div className="et-detail-item">
                    <span className="et-detail-label">Route</span>
                    <span className="et-detail-value mono">
                      {selected.method ? `${selected.method} ${selected.route ?? ''}` : (selected.route ?? '—')}
                    </span>
                  </div>
                  <div className="et-detail-item">
                    <span className="et-detail-label">Status code</span>
                    <span className="et-detail-value mono">{selected.statusCode ?? '—'}</span>
                  </div>
                  <div className="et-detail-item">
                    <span className="et-detail-label">Request ID</span>
                    <span className="et-detail-value mono">{selected.requestId ?? '—'}</span>
                  </div>
                  <div className="et-detail-item">
                    <span className="et-detail-label">Trace ID</span>
                    <span className="et-detail-value mono">{selected.traceId ?? '—'}</span>
                  </div>
                  <div className="et-detail-item">
                    <span className="et-detail-label">Span ID</span>
                    <span className="et-detail-value mono">{selected.spanId ?? '—'}</span>
                  </div>
                  <div className="et-detail-item">
                    <span className="et-detail-label">Tenant ID</span>
                    <span className="et-detail-value mono">{selected.tenantId ?? '—'}</span>
                  </div>
                  <div className="et-detail-item">
                    <span className="et-detail-label">User ID</span>
                    <span className="et-detail-value mono">{selected.userId ?? '—'}</span>
                  </div>
                </div>

                {selected.causeChain.length > 0 && (
                  <div style={{ marginTop: '16px' }}>
                    <span className="et-detail-label">Cause chain</span>
                    <ul className="et-notes-list" style={{ marginTop: '6px' }}>
                      {selected.causeChain.map((cause, idx) => (
                        <li className="et-note-item" key={`${cause}-${idx}`}>
                          {cause}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {selected.stackTrace && (
                  <div style={{ marginTop: '16px' }}>
                    <span className="et-detail-label">Stack trace</span>
                    <pre className="et-stack-trace" style={{ marginTop: '6px' }}>
                      {selected.stackTrace}
                    </pre>
                  </div>
                )}
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
