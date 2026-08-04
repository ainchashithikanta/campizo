'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import '@web/styles/feature-flags.css';

/**
 * Navigation Bar Header for Platform Feature Management Admin Console
 */
export function FeatureFlagsNavHeader({ activePath }: { activePath: string }) {
  const links = [
    { href: '/admin/feature-flags', label: '📊 Dashboard' },
    { href: '/admin/feature-flags/evaluate', label: '🧪 Evaluation Playground' },
    { href: '/admin/feature-flags/dependencies', label: '🕸️ Dependency Graph' },
    { href: '/admin/feature-flags/rollouts', label: '🚀 Rollout Wizard' },
    { href: '/admin/feature-flags/snapshots', label: '📸 Snapshots' },
    { href: '/admin/feature-flags/approvals', label: '🛡️ Approvals' },
    { href: '/admin/feature-flags/kill-switch', label: '🚨 Kill Switch' },
    { href: '/admin/feature-flags/health', label: '📈 Health' },
    { href: '/admin/feature-flags/analytics', label: '📊 Analytics' },
    { href: '/admin/feature-flags/audit', label: '📜 Audit' }
  ];

  return (
    <nav className="ff-nav-grid" aria-label="Feature Flags Console Navigation">
      {links.map((link) => (
        <Link key={link.href} href={link.href} className={`ff-nav-link ${activePath === link.href ? 'active' : ''}`}>
          {link.label}
        </Link>
      ))}
    </nav>
  );
}

/**
 * HoldToActivateButton
 * Requires holding the button down for 2000ms to confirm destructive actions.
 */
export function HoldToActivateButton({
  onActivated,
  label = 'HOLD FOR 2 SECONDS TO TRIP KILL SWITCH'
}: {
  onActivated: () => void;
  label?: string;
}) {
  const [progress, setProgress] = useState(0);
  const [isHolding, setIsHolding] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const startHold = () => {
    setIsHolding(true);
    const startTime = Date.now();
    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min(100, (elapsed / 2000) * 100);
      setProgress(pct);

      if (pct >= 100) {
        if (timerRef.current) clearInterval(timerRef.current);
        setIsHolding(false);
        setProgress(0);
        onActivated();
      }
    }, 50);
  };

  const stopHold = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setIsHolding(false);
    setProgress(0);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  return (
    <button
      type="button"
      className="ff-hold-btn"
      onMouseDown={startHold}
      onMouseUp={stopHold}
      onMouseLeave={stopHold}
      onTouchStart={startHold}
      onTouchEnd={stopHold}
      aria-label="Hold to activate emergency kill switch"
    >
      <div className="ff-hold-progress" style={{ width: `${progress}%` }} />
      <span className="ff-hold-text">{isHolding ? `HOLDING... ${Math.round(progress)}%` : label}</span>
    </button>
  );
}

/**
 * MetricCard Stat Display
 */
export function MetricCard({ title, value, subtitle }: { title: string; value: string | number; subtitle?: string }) {
  return (
    <div className="ff-metric-box">
      <div className="ff-metric-title">{title}</div>
      <div className="ff-metric-val">{value}</div>
      {subtitle && <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '4px' }}>{subtitle}</div>}
    </div>
  );
}

/**
 * TraceIdBadge Display
 */
export function TraceIdBadge({ traceId }: { traceId: string }) {
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '4px 8px',
        background: '#334155',
        borderRadius: '4px',
        fontFamily: 'monospace',
        fontSize: '11px',
        color: '#06B6D4'
      }}
    >
      <span>🔍 Trace ID:</span>
      <span>{traceId}</span>
    </div>
  );
}
