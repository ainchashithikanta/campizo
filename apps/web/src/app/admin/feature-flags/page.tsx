'use client';

import React, { useState, useEffect, useMemo } from 'react';
import '@web/styles/feature-flags-console.css';

export interface FeatureFlagItem {
  id: string;
  flagKey: string;
  module: string;
  description: string;
  environment: 'PRODUCTION' | 'STAGING' | 'TESTING' | 'DEVELOPMENT';
  enabled: boolean;
  lifecycleStage: 'DRAFT' | 'BETA' | 'PRODUCTION' | 'DEPRECATED' | 'REMOVED';
  rolloutPercentage: number;
  ownerTeam: string;
  dependencies: string[];
  version: number;
  updatedAt: string;
}

const INITIAL_FLAGS: FeatureFlagItem[] = [
  {
    id: 'f1',
    flagKey: 'marketplace.p2p_chat',
    module: 'Marketplace',
    description: 'Enables direct buyer-seller P2P chat in campus marketplace',
    environment: 'PRODUCTION',
    enabled: true,
    lifecycleStage: 'PRODUCTION',
    rolloutPercentage: 100,
    ownerTeam: 'Team Marketplace',
    dependencies: ['marketplace.user_auth'],
    version: 4,
    updatedAt: '2026-08-03T18:30:00Z'
  },
  {
    id: 'f2',
    flagKey: 'confessions.voting',
    module: 'Confessions',
    description: 'Real-time upvoting and downvoting algorithm for campus confessions',
    environment: 'PRODUCTION',
    enabled: true,
    lifecycleStage: 'PRODUCTION',
    rolloutPercentage: 75,
    ownerTeam: 'Team Confessions',
    dependencies: [],
    version: 2,
    updatedAt: '2026-08-03T17:15:00Z'
  },
  {
    id: 'f3',
    flagKey: 'academic.pdf_viewer',
    module: 'Academic Resources',
    description: 'High-performance PDF canvas renderer for course syllabus and notes',
    environment: 'PRODUCTION',
    enabled: true,
    lifecycleStage: 'BETA',
    rolloutPercentage: 50,
    ownerTeam: 'Team Academics',
    dependencies: ['academic.core'],
    version: 3,
    updatedAt: '2026-08-03T19:00:00Z'
  },
  {
    id: 'f4',
    flagKey: 'connect.peer_matching',
    module: 'Connect',
    description: 'AI-driven study group and peer matching recommendation engine',
    environment: 'PRODUCTION',
    enabled: false,
    lifecycleStage: 'BETA',
    rolloutPercentage: 10,
    ownerTeam: 'Team AI',
    dependencies: ['connect.profiles'],
    version: 1,
    updatedAt: '2026-08-03T12:00:00Z'
  },
  {
    id: 'f5',
    flagKey: 'events.ticket_resale',
    module: 'Events',
    description: 'Student-to-student verified campus event ticket resale market',
    environment: 'PRODUCTION',
    enabled: false,
    lifecycleStage: 'DEPRECATED',
    rolloutPercentage: 0,
    ownerTeam: 'Team Events',
    dependencies: ['marketplace.payment'],
    version: 5,
    updatedAt: '2026-08-02T10:00:00Z'
  },
  {
    id: 'f6',
    flagKey: 'ai.study_assistant',
    module: 'AI',
    description: 'RAG-powered campus course exam preparation copilot',
    environment: 'PRODUCTION',
    enabled: true,
    lifecycleStage: 'BETA',
    rolloutPercentage: 25,
    ownerTeam: 'Team AI',
    dependencies: ['academic.pdf_viewer'],
    version: 2,
    updatedAt: '2026-08-03T19:40:00Z'
  }
];

export default function FeatureFlagsOpsConsole() {
  const [activeTab, setActiveTab] = useState<
    | 'overview'
    | 'explorer'
    | 'rollout'
    | 'topology'
    | 'snapshots'
    | 'approvals'
    | 'telemetry'
    | 'audit'
    | 'packs'
    | 'bulk'
  >('overview');
  const [environment, setEnvironment] = useState<'PRODUCTION' | 'STAGING' | 'TESTING' | 'DEVELOPMENT'>('PRODUCTION');
  const [flags, setFlags] = useState<FeatureFlagItem[]>(INITIAL_FLAGS);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFlag, setSelectedFlag] = useState<FeatureFlagItem | null>(null);

  // Modals & Drawers
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isKillSwitchModalOpen, setIsKillSwitchModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Kill Switch & Emergency State
  const [activeKillSwitches, setActiveKillSwitches] = useState<string[]>([]);
  const [killSwitchReason, setKillSwitchReason] = useState('');

  // Live Activity Stream Log
  const [activityStream, setActivityStream] = useState<
    Array<{ id: string; time: string; text: string; type: 'info' | 'warning' | 'danger' }>
  >([
    { id: '1', time: '19:54:12', text: 'Rollout percentage for ai.study_assistant increased to 25%', type: 'info' },
    { id: '2', time: '19:48:05', text: 'Snapshot snap_1722714488 restored in PRODUCTION environment', type: 'warning' },
    { id: '3', time: '19:30:22', text: 'Approval granted for marketplace.p2p_chat production deployment', type: 'info' }
  ]);

  // Form states for creation
  const [newFlagKey, setNewFlagKey] = useState('');
  const [newModule, setNewModule] = useState('Marketplace');
  const [newOwnerTeam, setNewOwnerTeam] = useState('Team Marketplace');

  // Rollout Simulator state
  const [simTargetPercentage, setSimTargetPercentage] = useState<number>(50);

  // Keyboard Shortcuts Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      } else if (e.shiftKey && e.key.toUpperCase() === 'K') {
        e.preventDefault();
        setIsKillSwitchModalOpen((prev) => !prev);
      } else if (e.key >= '1' && e.key <= '9' && !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        const tabs: Array<typeof activeTab> = [
          'overview',
          'explorer',
          'rollout',
          'topology',
          'snapshots',
          'approvals',
          'telemetry',
          'audit',
          'packs'
        ];
        const target = tabs[parseInt(e.key) - 1];
        if (target) setActiveTab(target);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Filtered Flags
  const filteredFlags = useMemo(() => {
    return flags.filter(
      (f) =>
        f.flagKey.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.module.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.ownerTeam.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [flags, searchQuery]);

  // Toggle Flag Treatment
  const toggleFlag = (flagKey: string) => {
    setFlags((prev) =>
      prev.map((f) => {
        if (f.flagKey === flagKey) {
          const nextState = !f.enabled;
          const nextVersion = f.version + 1;
          const now = new Date().toLocaleTimeString();

          // Append activity log
          setActivityStream((logs) => [
            {
              id: String(Date.now()),
              time: now,
              text: `Feature '${flagKey}' turned ${nextState ? 'ON' : 'OFF'} in ${environment}`,
              type: nextState ? 'info' : 'warning'
            },
            ...logs
          ]);

          return { ...f, enabled: nextState, version: nextVersion, updatedAt: new Date().toISOString() };
        }
        return f;
      })
    );
  };

  // Trip Emergency Kill Switch
  const handleTripKillSwitch = (flagKey: string) => {
    if (!killSwitchReason) return;
    setActiveKillSwitches((prev) => [...prev, flagKey]);
    setFlags((prev) => prev.map((f) => (f.flagKey === flagKey ? { ...f, enabled: false } : f)));

    setActivityStream((logs) => [
      {
        id: String(Date.now()),
        time: new Date().toLocaleTimeString(),
        text: `EMERGENCY KILL SWITCH TRIPPED for '${flagKey}'! Reason: ${killSwitchReason}`,
        type: 'danger'
      },
      ...logs
    ]);

    setIsKillSwitchModalOpen(false);
    setKillSwitchReason('');
  };

  // Create New Feature Flag
  const handleCreateFlag = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFlagKey) return;

    const newFlag: FeatureFlagItem = {
      id: `f_${Date.now()}`,
      flagKey: newFlagKey,
      module: newModule,
      description: `New feature flag for ${newModule}`,
      environment,
      enabled: false,
      lifecycleStage: 'DRAFT',
      rolloutPercentage: 0,
      ownerTeam: newOwnerTeam,
      dependencies: [],
      version: 1,
      updatedAt: new Date().toISOString()
    };

    setFlags((prev) => [newFlag, ...prev]);
    setIsCreateModalOpen(false);
    setNewFlagKey('');
  };

  return (
    <div className="ff-ops-console">
      {/* ---------- HEADER & LIVE TICKER ---------- */}
      <header className="ff-header">
        <div className="ff-header-top">
          <div className="ff-brand">
            <span className="ff-brand-badge">COLLEGE HUB PLATFORM</span>
            <h1 className="ff-title">⚡ Feature Management Operations Console</h1>
          </div>

          <div className="ff-header-actions">
            <select
              className="ff-env-select"
              value={environment}
              onChange={(e) => setEnvironment(e.target.value as any)}
            >
              <option value="PRODUCTION">🟢 PRODUCTION</option>
              <option value="STAGING">🟡 STAGING</option>
              <option value="TESTING">🔵 TESTING</option>
              <option value="DEVELOPMENT">🟣 DEVELOPMENT</option>
            </select>

            <button className="ff-cmd-trigger" onClick={() => setIsCommandPaletteOpen(true)}>
              <span>🔍 Command Palette</span>
              <span className="ff-cmd-key">Ctrl K</span>
            </button>

            <button className="ff-btn-killswitch" onClick={() => setIsKillSwitchModalOpen(true)}>
              <span>🚨 Emergency Kill Switch</span>
              <span className="ff-cmd-key">Shift K</span>
            </button>

            <button
              style={{
                background: 'linear-gradient(135deg, #6366F1, #4F46E5)',
                color: '#FFF',
                fontWeight: 700,
                fontSize: '13px',
                padding: '8px 16px',
                borderRadius: '8px'
              }}
              onClick={() => setIsCreateModalOpen(true)}
            >
              + Create Flag
            </button>
          </div>
        </div>

        {/* Operational Real-time Metrics Ticker */}
        <div className="ff-ticker">
          <div className="ff-ticker-item">
            <span className="ff-dot-green"></span>
            <span className="ff-ticker-label">L1 Latency:</span>
            <span className="ff-ticker-val">0.12 ms</span>
          </div>

          <div className="ff-ticker-item">
            <span className="ff-ticker-label">Cache Hit Ratio:</span>
            <span className="ff-ticker-val">99.98%</span>
          </div>

          <div className="ff-ticker-item">
            <span className="ff-ticker-label">Worker Pool:</span>
            <span className="ff-ticker-val">12 Active (0 Queue Depth)</span>
          </div>

          <div className="ff-ticker-item">
            <span className="ff-ticker-label">Redis Pub/Sub:</span>
            <span className="ff-ticker-val">CONNECTED (4 channels)</span>
          </div>

          <div className="ff-ticker-item">
            <span className="ff-ticker-label">Snapshot Freshness:</span>
            <span className="ff-ticker-val">2 min ago (v{flags[0]?.version || 1})</span>
          </div>

          {activeKillSwitches.length > 0 && (
            <div className="ff-ticker-item" style={{ color: '#EF4444', fontWeight: 700 }}>
              🚨 {activeKillSwitches.length} ACTIVE KILL SWITCH(ES) TRIPPED
            </div>
          )}
        </div>
      </header>

      {/* ---------- MAIN NAVIGATION TABS ---------- */}
      <nav className="ff-nav-tabs">
        <button
          className={`ff-tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          📊 Overview
        </button>
        <button
          className={`ff-tab-btn ${activeTab === 'explorer' ? 'active' : ''}`}
          onClick={() => setActiveTab('explorer')}
        >
          🚩 Feature Flags <span className="ff-tab-pill">{flags.length}</span>
        </button>
        <button
          className={`ff-tab-btn ${activeTab === 'rollout' ? 'active' : ''}`}
          onClick={() => setActiveTab('rollout')}
        >
          🚀 Canary Rollouts
        </button>
        <button
          className={`ff-tab-btn ${activeTab === 'topology' ? 'active' : ''}`}
          onClick={() => setActiveTab('topology')}
        >
          🕸️ Dependency Graph
        </button>
        <button
          className={`ff-tab-btn ${activeTab === 'snapshots' ? 'active' : ''}`}
          onClick={() => setActiveTab('snapshots')}
        >
          📸 Snapshots & Restore
        </button>
        <button
          className={`ff-tab-btn ${activeTab === 'approvals' ? 'active' : ''}`}
          onClick={() => setActiveTab('approvals')}
        >
          🛡️ 4-Eye Approvals <span className="ff-tab-pill">1</span>
        </button>
        <button
          className={`ff-tab-btn ${activeTab === 'telemetry' ? 'active' : ''}`}
          onClick={() => setActiveTab('telemetry')}
        >
          📈 Telemetry & Health
        </button>
        <button className={`ff-tab-btn ${activeTab === 'audit' ? 'active' : ''}`} onClick={() => setActiveTab('audit')}>
          📜 Audit Log
        </button>
        <button className={`ff-tab-btn ${activeTab === 'packs' ? 'active' : ''}`} onClick={() => setActiveTab('packs')}>
          📦 Feature Packs
        </button>
        <button className={`ff-tab-btn ${activeTab === 'bulk' ? 'active' : ''}`} onClick={() => setActiveTab('bulk')}>
          ⚡ Bulk Actions
        </button>
      </nav>

      {/* ---------- CONSOLE CONTENT AREA ---------- */}
      <main className="ff-content">
        {/* ================= TAB 1: OVERVIEW ================= */}
        {activeTab === 'overview' && (
          <div>
            <div className="ff-grid-4">
              <div className="ff-card">
                <div className="ff-card-header">
                  <span className="ff-card-title">Total Managed Flags</span>
                  <span>🚩</span>
                </div>
                <div className="ff-stat-num">{flags.length}</div>
                <div className="ff-stat-sub">Across 8 College Hub modules</div>
              </div>

              <div className="ff-card">
                <div className="ff-card-header">
                  <span className="ff-card-title">Active Flag Treatments</span>
                  <span>🟢</span>
                </div>
                <div className="ff-stat-num">{flags.filter((f) => f.enabled).length}</div>
                <div className="ff-stat-sub">{flags.filter((f) => !f.enabled).length} currently disabled</div>
              </div>

              <div className="ff-card">
                <div className="ff-card-header">
                  <span className="ff-card-title">In-Memory SLA Latency</span>
                  <span>⚡</span>
                </div>
                <div className="ff-stat-num" style={{ color: '#10B981' }}>
                  0.14 ms
                </div>
                <div className="ff-stat-sub">Target SLA &lt; 1.0 ms (100% PASS)</div>
              </div>

              <div className="ff-card">
                <div className="ff-card-header">
                  <span className="ff-card-title">Pending Change Tickets</span>
                  <span>🛡️</span>
                </div>
                <div className="ff-stat-num" style={{ color: '#F59E0B' }}>
                  1
                </div>
                <div className="ff-stat-sub">Requires 4-Eye Approval</div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
              {/* Operational Heatmap & Slowest Features */}
              <div className="ff-card">
                <h3 style={{ fontSize: '16px', marginBottom: '16px' }}>🔥 Module Evaluation Heatmap & Latency</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {flags.map((flag) => (
                    <div
                      key={flag.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '12px',
                        background: 'var(--ff-surface-elevated)',
                        borderRadius: '8px'
                      }}
                    >
                      <div>
                        <div className="ff-flag-key">{flag.flagKey}</div>
                        <div style={{ fontSize: '11px', color: 'var(--ff-text-muted)', marginTop: '2px' }}>
                          Owner: {flag.ownerTeam} | Version: v{flag.version}
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <span className="ff-stat-num" style={{ fontSize: '14px', color: '#06B6D4' }}>
                          0.11 ms
                        </span>
                        <label className="ff-switch">
                          <input type="checkbox" checked={flag.enabled} onChange={() => toggleFlag(flag.flagKey)} />
                          <span className="ff-slider"></span>
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Real-time Activity Stream */}
              <div className="ff-card">
                <h3 style={{ fontSize: '16px', marginBottom: '16px' }}>📡 Live Activity Stream</h3>
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                    maxHeight: '420px',
                    overflowY: 'auto'
                  }}
                >
                  {activityStream.map((log) => (
                    <div
                      key={log.id}
                      style={{
                        padding: '10px 12px',
                        borderRadius: '6px',
                        background: 'var(--ff-surface-elevated)',
                        borderLeft: `4px solid ${log.type === 'danger' ? '#EF4444' : log.type === 'warning' ? '#F59E0B' : '#6366F1'}`
                      }}
                    >
                      <div
                        style={{ fontSize: '11px', color: 'var(--ff-text-muted)', fontFamily: 'var(--ch-font-mono)' }}
                      >
                        {log.time}
                      </div>
                      <div style={{ fontSize: '12px', marginTop: '2px', color: 'var(--ff-text-bright)' }}>
                        {log.text}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 2: EXPLORER ================= */}
        {activeTab === 'explorer' && (
          <div className="ff-card">
            <div className="ff-toolbar">
              <input
                type="text"
                className="ff-search-input"
                placeholder="Search flag key, module, or team..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />

              <div style={{ fontSize: '13px', color: 'var(--ff-text-muted)' }}>
                Showing {filteredFlags.length} of {flags.length} flags
              </div>
            </div>

            <table className="ff-table">
              <thead>
                <tr>
                  <th>FEATURE FLAG KEY</th>
                  <th>MODULE</th>
                  <th>STAGE</th>
                  <th>ROLLOUT %</th>
                  <th>OWNER TEAM</th>
                  <th>TREATMENT</th>
                </tr>
              </thead>
              <tbody>
                {filteredFlags.map((flag) => (
                  <tr key={flag.id} onClick={() => setSelectedFlag(flag)}>
                    <td className="ff-flag-key">{flag.flagKey}</td>
                    <td>{flag.module}</td>
                    <td>
                      <span className={`ff-badge ff-badge-${flag.lifecycleStage.toLowerCase()}`}>
                        {flag.lifecycleStage}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div
                          style={{
                            flex: 1,
                            height: '6px',
                            background: 'var(--ff-surface-elevated)',
                            borderRadius: '3px',
                            width: '80px',
                            overflow: 'hidden'
                          }}
                        >
                          <div
                            style={{
                              height: '100%',
                              width: `${flag.rolloutPercentage}%`,
                              background: 'var(--ff-primary)'
                            }}
                          ></div>
                        </div>
                        <span style={{ fontSize: '11px', fontFamily: 'var(--ch-font-mono)' }}>
                          {flag.rolloutPercentage}%
                        </span>
                      </div>
                    </td>
                    <td>{flag.ownerTeam}</td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <label className="ff-switch">
                        <input type="checkbox" checked={flag.enabled} onChange={() => toggleFlag(flag.flagKey)} />
                        <span className="ff-slider"></span>
                      </label>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ================= TAB 3: CANARY ROLLOUTS ================= */}
        {activeTab === 'rollout' && (
          <div className="ff-card">
            <h3 style={{ fontSize: '18px', marginBottom: '8px' }}>🚀 Guided Canary Rollout Engine</h3>
            <p style={{ fontSize: '13px', color: 'var(--ff-text-muted)', marginBottom: '24px' }}>
              Safely increment rollout percentage buckets with target cohort controls and instant kill-switch
              protection.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
              <div style={{ background: 'var(--ff-surface-elevated)', padding: '20px', borderRadius: '10px' }}>
                <h4 style={{ fontSize: '14px', marginBottom: '12px' }}>Target Percentage Step Simulator</h4>

                <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                  {[0, 10, 25, 50, 100].map((pct) => (
                    <button
                      key={pct}
                      onClick={() => setSimTargetPercentage(pct)}
                      style={{
                        flex: 1,
                        padding: '10px',
                        borderRadius: '8px',
                        background: simTargetPercentage === pct ? 'var(--ff-primary)' : 'var(--ff-surface-dark)',
                        color: '#FFF',
                        fontWeight: 700,
                        border: '1px solid var(--ff-surface-border)'
                      }}
                    >
                      {pct}%
                    </button>
                  ))}
                </div>

                <div
                  style={{
                    padding: '16px',
                    background: 'var(--ff-surface-dark)',
                    borderRadius: '8px',
                    marginBottom: '16px'
                  }}
                >
                  <div style={{ fontSize: '12px', color: 'var(--ff-text-muted)' }}>Estimated Cohort Impact:</div>
                  <div
                    style={{ fontSize: '24px', fontWeight: 700, color: '#06B6D4', fontFamily: 'var(--ch-font-mono)' }}
                  >
                    ~{(14500 * (simTargetPercentage / 100)).toLocaleString()} / 14,500 active students
                  </div>
                </div>

                <button
                  style={{
                    width: '100%',
                    background: 'linear-gradient(135deg, #10B981, #059669)',
                    color: '#FFF',
                    fontWeight: 700,
                    padding: '12px',
                    borderRadius: '8px'
                  }}
                  onClick={() => alert(`Canary rollout set to ${simTargetPercentage}% across Production nodes.`)}
                >
                  Apply Canary Rollout ({simTargetPercentage}%)
                </button>
              </div>

              <div style={{ background: 'var(--ff-surface-elevated)', padding: '20px', borderRadius: '10px' }}>
                <h4 style={{ fontSize: '14px', marginBottom: '12px' }}>Audience Evaluation Rule Rules</h4>
                <ul
                  style={{
                    fontSize: '13px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    color: 'var(--ff-text-muted)'
                  }}
                >
                  <li>✔ Murmur3 Deterministic Hash Bucket matching</li>
                  <li>
                    ✔ Environment override guard: <code>PRODUCTION</code>
                  </li>
                  <li>
                    ✔ App Version requirement: <code>&gt;= 2.4.0</code>
                  </li>
                  <li>
                    ✔ Role restriction: <code>VERIFIED_STUDENT</code>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 4: DEPENDENCY GRAPH ================= */}
        {activeTab === 'topology' && (
          <div className="ff-card">
            <div
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}
            >
              <div>
                <h3 style={{ fontSize: '18px' }}>🕸️ Module Topology & Directed Acyclic Graph (DAG)</h3>
                <p style={{ fontSize: '12px', color: 'var(--ff-text-muted)' }}>
                  Kahn's Topological Sort cycle detection active. 0 cycles detected.
                </p>
              </div>
              <button
                style={{
                  background: 'var(--ff-surface-elevated)',
                  padding: '8px 14px',
                  borderRadius: '8px',
                  border: '1px solid var(--ff-surface-border)',
                  fontSize: '12px'
                }}
              >
                Validate Graph Integrity
              </button>
            </div>

            <div className="ff-graph-canvas">
              <div style={{ display: 'flex', alignItems: 'center', gap: '40px' }}>
                <div className="ff-node-card">
                  <div style={{ fontSize: '11px', color: 'var(--ff-text-muted)' }}>PREREQUISITE NODE</div>
                  <div className="ff-flag-key" style={{ fontSize: '14px', marginTop: '4px' }}>
                    marketplace.user_auth
                  </div>
                  <div className="ff-badge ff-badge-prod" style={{ marginTop: '6px' }}>
                    Rank 0
                  </div>
                </div>

                <span style={{ fontSize: '24px', color: 'var(--ff-primary)' }}>➔</span>

                <div className="ff-node-card" style={{ borderColor: 'var(--ff-primary)' }}>
                  <div style={{ fontSize: '11px', color: 'var(--ff-primary)' }}>DEPENDENT NODE</div>
                  <div className="ff-flag-key" style={{ fontSize: '14px', marginTop: '4px' }}>
                    marketplace.p2p_chat
                  </div>
                  <div className="ff-badge ff-badge-prod" style={{ marginTop: '6px' }}>
                    Rank 1
                  </div>
                </div>

                <span style={{ fontSize: '24px', color: 'var(--ff-primary)' }}>➔</span>

                <div className="ff-node-card">
                  <div style={{ fontSize: '11px', color: 'var(--ff-text-muted)' }}>DOWNSTREAM NODE</div>
                  <div className="ff-flag-key" style={{ fontSize: '14px', marginTop: '4px' }}>
                    ai.study_assistant
                  </div>
                  <div className="ff-badge ff-badge-beta" style={{ marginTop: '6px' }}>
                    Rank 2
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 5: SNAPSHOTS & RESTORE ================= */}
        {activeTab === 'snapshots' && (
          <div className="ff-card">
            <div
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}
            >
              <div>
                <h3 style={{ fontSize: '18px' }}>📸 Environment Configuration Snapshots</h3>
                <p style={{ fontSize: '12px', color: 'var(--ff-text-muted)' }}>
                  Immutable point-in-time state backups with 1-click restore.
                </p>
              </div>
              <button
                style={{
                  background: 'var(--ff-primary)',
                  color: '#FFF',
                  padding: '10px 16px',
                  borderRadius: '8px',
                  fontWeight: 600,
                  fontSize: '13px'
                }}
                onClick={() => alert('Created new point-in-time configuration snapshot snap_' + Date.now())}
              >
                + Create Snapshot
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {[
                {
                  id: 'snap_1722714488',
                  env: 'PRODUCTION',
                  flags: 6,
                  time: '2026-08-03 19:50:00',
                  hmac: 'hmac_sha256_88a91c',
                  note: 'Pre-deployment baseline'
                },
                {
                  id: 'snap_1722680000',
                  env: 'PRODUCTION',
                  flags: 6,
                  time: '2026-08-03 12:00:00',
                  hmac: 'hmac_sha256_44b20f',
                  note: 'Daily automated backup'
                }
              ].map((snap) => (
                <div
                  key={snap.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '16px',
                    background: 'var(--ff-surface-elevated)',
                    borderRadius: '10px'
                  }}
                >
                  <div>
                    <div style={{ fontFamily: 'var(--ch-font-mono)', fontWeight: 700, color: 'var(--ff-primary)' }}>
                      {snap.id}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--ff-text-muted)', marginTop: '4px' }}>
                      {snap.time} | {snap.flags} flags | HMAC: <code>{snap.hmac}</code> | Note: {snap.note}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                      style={{
                        background: 'var(--ff-surface-dark)',
                        border: '1px solid var(--ff-surface-border)',
                        color: 'var(--ff-text-bright)',
                        padding: '6px 12px',
                        borderRadius: '6px',
                        fontSize: '12px'
                      }}
                    >
                      Compare Diff
                    </button>
                    <button
                      style={{
                        background: 'var(--ff-warning)',
                        color: '#000',
                        fontWeight: 700,
                        padding: '6px 12px',
                        borderRadius: '6px',
                        fontSize: '12px'
                      }}
                      onClick={() => alert(`Restored snapshot ${snap.id}`)}
                    >
                      Restore Snapshot
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ================= TAB 6: 4-EYE APPROVALS ================= */}
        {activeTab === 'approvals' && (
          <div className="ff-card">
            <h3 style={{ fontSize: '18px', marginBottom: '16px' }}>🛡️ 4-Eye Change Request Approvals</h3>

            <div
              style={{
                background: 'var(--ff-surface-elevated)',
                padding: '20px',
                borderRadius: '10px',
                borderLeft: '4px solid var(--ff-warning)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--ff-warning)', fontWeight: 700 }}>PENDING REVIEW</div>
                  <h4 style={{ fontSize: '15px', marginTop: '4px' }}>
                    Enable <code>marketplace.p2p_chat</code> in PRODUCTION
                  </h4>
                  <div style={{ fontSize: '12px', color: 'var(--ff-text-muted)', marginTop: '4px' }}>
                    Requested by <strong>dev_lead_01</strong> | Ticket: <code>REQ-8841</code> | Policy: 4-Eye Double
                    Approval
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    style={{
                      background: 'var(--ff-danger)',
                      color: '#FFF',
                      fontWeight: 700,
                      padding: '8px 14px',
                      borderRadius: '6px',
                      fontSize: '12px'
                    }}
                    onClick={() => alert('Change ticket REJECTED.')}
                  >
                    Reject Ticket
                  </button>
                  <button
                    style={{
                      background: 'var(--ff-success)',
                      color: '#FFF',
                      fontWeight: 700,
                      padding: '8px 14px',
                      borderRadius: '6px',
                      fontSize: '12px'
                    }}
                    onClick={() => alert('Change ticket APPROVED.')}
                  >
                    Approve & Deploy
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 7: TELEMETRY & HEALTH ================= */}
        {activeTab === 'telemetry' && (
          <div className="ff-grid-4">
            <div className="ff-card">
              <div className="ff-card-title">In-Memory Engine</div>
              <div className="ff-stat-num" style={{ color: '#10B981' }}>
                0.14 ms
              </div>
              <div className="ff-stat-sub">Lock-free atomic evaluation</div>
            </div>

            <div className="ff-card">
              <div className="ff-card-title">Policy Chain Depth</div>
              <div className="ff-stat-num">10</div>
              <div className="ff-stat-sub">Pluggable policies active</div>
            </div>

            <div className="ff-card">
              <div className="ff-card-title">Redis Pub/Sub Latency</div>
              <div className="ff-stat-num" style={{ color: '#06B6D4' }}>
                1.4 ms
              </div>
              <div className="ff-stat-sub">Hot-invalidation broadcast</div>
            </div>

            <div className="ff-card">
              <div className="ff-card-title">Worker Queue Depth</div>
              <div className="ff-stat-num">0</div>
              <div className="ff-stat-sub">Optimal queue processing</div>
            </div>
          </div>
        )}

        {/* ================= TAB 8: AUDIT LOG ================= */}
        {activeTab === 'audit' && (
          <div className="ff-card">
            <h3 style={{ fontSize: '18px', marginBottom: '16px' }}>📜 Immutable Platform Audit Trail</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[
                {
                  time: '2026-08-03 19:40:00',
                  actor: 'admin_usr_101',
                  action: 'UPDATE_ROLLOUT',
                  flag: 'ai.study_assistant',
                  hash: 'hmac_9948a'
                },
                {
                  time: '2026-08-03 18:30:00',
                  actor: 'admin_usr_101',
                  action: 'ENABLE_FLAG',
                  flag: 'marketplace.p2p_chat',
                  hash: 'hmac_1120b'
                },
                {
                  time: '2026-08-03 17:15:00',
                  actor: 'system_worker',
                  action: 'AUTO_CACHE_WARMUP',
                  flag: 'global',
                  hash: 'hmac_7719c'
                }
              ].map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: '12px',
                    background: 'var(--ff-surface-elevated)',
                    borderRadius: '8px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <div>
                    <span
                      style={{ fontSize: '11px', fontFamily: 'var(--ch-font-mono)', color: 'var(--ff-text-muted)' }}
                    >
                      {item.time}
                    </span>
                    <div style={{ fontWeight: 600, fontSize: '13px', marginTop: '2px' }}>
                      {item.actor} performed <code>{item.action}</code> on <code>{item.flag}</code>
                    </div>
                  </div>
                  <span style={{ fontSize: '11px', fontFamily: 'var(--ch-font-mono)', color: 'var(--ff-accent-cyan)' }}>
                    {item.hash}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ================= TAB 9: PACKS & TEMPLATES ================= */}
        {activeTab === 'packs' && (
          <div className="ff-card">
            <h3 style={{ fontSize: '18px', marginBottom: '16px' }}>📦 Deployable Feature Packs & Presets</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div style={{ padding: '16px', background: 'var(--ff-surface-elevated)', borderRadius: '10px' }}>
                <h4 style={{ fontSize: '14px', color: 'var(--ff-primary)' }}>Pack: Campus Marketplace Suite v2.4</h4>
                <p style={{ fontSize: '12px', color: 'var(--ff-text-muted)', marginTop: '4px' }}>
                  Groups: <code>marketplace.p2p_chat</code>, <code>marketplace.payment</code>
                </p>
                <button
                  style={{
                    marginTop: '12px',
                    background: 'var(--ff-primary)',
                    color: '#FFF',
                    padding: '6px 12px',
                    borderRadius: '6px',
                    fontSize: '12px'
                  }}
                  onClick={() => alert('Pack deployed.')}
                >
                  Deploy Pack
                </button>
              </div>

              <div style={{ padding: '16px', background: 'var(--ff-surface-elevated)', borderRadius: '10px' }}>
                <h4 style={{ fontSize: '14px', color: 'var(--ff-accent-cyan)' }}>Template: Beta Testing Standard</h4>
                <p style={{ fontSize: '12px', color: 'var(--ff-text-muted)', marginTop: '4px' }}>
                  Enforces 10% canary rollout with 4-Eye Approval requirement
                </p>
                <button
                  style={{
                    marginTop: '12px',
                    background: 'var(--ff-surface-dark)',
                    color: '#FFF',
                    border: '1px solid var(--ff-surface-border)',
                    padding: '6px 12px',
                    borderRadius: '6px',
                    fontSize: '12px'
                  }}
                >
                  Apply Template
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 10: BULK ACTIONS ================= */}
        {activeTab === 'bulk' && (
          <div className="ff-card">
            <h3 style={{ fontSize: '18px', marginBottom: '16px' }}>⚡ Bulk Multi-Feature Operations</h3>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                style={{
                  background: 'var(--ff-success)',
                  color: '#FFF',
                  padding: '10px 16px',
                  borderRadius: '8px',
                  fontWeight: 600
                }}
                onClick={() => alert('Bulk ENABLE completed for selected flags.')}
              >
                Bulk Enable Selected (3)
              </button>
              <button
                style={{
                  background: 'var(--ff-warning)',
                  color: '#000',
                  padding: '10px 16px',
                  borderRadius: '8px',
                  fontWeight: 600
                }}
                onClick={() => alert('Bulk DISABLE completed for selected flags.')}
              >
                Bulk Disable Selected (3)
              </button>
              <button
                style={{
                  background: 'var(--ff-danger)',
                  color: '#FFF',
                  padding: '10px 16px',
                  borderRadius: '8px',
                  fontWeight: 600
                }}
                onClick={() => alert('Bulk DEPRECATE completed.')}
              >
                Bulk Deprecate (3)
              </button>
            </div>
          </div>
        )}
      </main>

      {/* ---------- SLIDE-OVER INSPECTOR DRAWER ---------- */}
      {selectedFlag && (
        <>
          <div className="ff-drawer-backdrop" onClick={() => setSelectedFlag(null)} />
          <div className="ff-drawer">
            <div
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}
            >
              <h3 className="ff-flag-key" style={{ fontSize: '16px' }}>
                {selectedFlag.flagKey}
              </h3>
              <button onClick={() => setSelectedFlag(null)} style={{ fontSize: '20px', color: 'var(--ff-text-muted)' }}>
                ✕
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', fontSize: '13px' }}>
              <div>
                <span style={{ color: 'var(--ff-text-muted)' }}>Description:</span>
                <p style={{ marginTop: '4px' }}>{selectedFlag.description}</p>
              </div>

              <div>
                <span style={{ color: 'var(--ff-text-muted)' }}>Module Group:</span>
                <p style={{ marginTop: '4px', fontWeight: 600 }}>{selectedFlag.module}</p>
              </div>

              <div>
                <span style={{ color: 'var(--ff-text-muted)' }}>Owner Team:</span>
                <p style={{ marginTop: '4px', fontWeight: 600 }}>{selectedFlag.ownerTeam}</p>
              </div>

              <div>
                <span style={{ color: 'var(--ff-text-muted)' }}>Configuration Version:</span>
                <p style={{ marginTop: '4px', fontFamily: 'var(--ch-font-mono)' }}>v{selectedFlag.version}</p>
              </div>

              <div style={{ padding: '16px', background: 'var(--ff-surface-elevated)', borderRadius: '8px' }}>
                <h4 style={{ fontSize: '13px', marginBottom: '8px' }}>Evaluation Chain (10 Policies):</h4>
                <ol
                  style={{
                    fontSize: '11px',
                    color: 'var(--ff-text-muted)',
                    paddingLeft: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px'
                  }}
                >
                  <li>1. KillSwitchPolicy (PASSED)</li>
                  <li>2. MaintenancePolicy (PASSED)</li>
                  <li>3. DependencyPolicy (PASSED)</li>
                  <li>4. LifecyclePolicy ({selectedFlag.lifecycleStage})</li>
                  <li>5. RolloutPolicy ({selectedFlag.rolloutPercentage}%)</li>
                </ol>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ---------- COMMAND PALETTE MODAL (Ctrl K) ---------- */}
      {isCommandPaletteOpen && (
        <div className="ff-modal-backdrop" onClick={() => setIsCommandPaletteOpen(false)}>
          <div className="ff-modal" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontSize: '16px', marginBottom: '12px' }}>🔍 Command Palette</h3>
            <input
              type="text"
              className="ff-search-input"
              placeholder="Type a command or flag key..."
              style={{ width: '100%', marginBottom: '16px' }}
              autoFocus
            />

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
              <div
                style={{
                  padding: '10px',
                  background: 'var(--ff-surface-elevated)',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
                onClick={() => {
                  setActiveTab('explorer');
                  setIsCommandPaletteOpen(false);
                }}
              >
                🚩 Go to Feature Flags Explorer
              </div>
              <div
                style={{
                  padding: '10px',
                  background: 'var(--ff-surface-elevated)',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
                onClick={() => {
                  setIsKillSwitchModalOpen(true);
                  setIsCommandPaletteOpen(false);
                }}
              >
                🚨 Trip Emergency Kill Switch (Shift + K)
              </div>
              <div
                style={{
                  padding: '10px',
                  background: 'var(--ff-surface-elevated)',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
                onClick={() => {
                  setActiveTab('snapshots');
                  setIsCommandPaletteOpen(false);
                }}
              >
                📸 Create Environment Snapshot
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ---------- EMERGENCY KILL SWITCH MODAL (Shift K) ---------- */}
      {isKillSwitchModalOpen && (
        <div className="ff-modal-backdrop" onClick={() => setIsKillSwitchModalOpen(false)}>
          <div className="ff-modal" onClick={(e) => e.stopPropagation()} style={{ borderColor: 'var(--ff-danger)' }}>
            <h3 style={{ fontSize: '18px', color: 'var(--ff-danger)', marginBottom: '8px' }}>
              🚨 Emergency Kill Switch Control
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--ff-text-muted)', marginBottom: '16px' }}>
              Tripping an emergency kill switch immediately forces a feature treatment to OFF across all production
              nodes in &lt;100ms.
            </p>

            <label style={{ fontSize: '12px', color: 'var(--ff-text-muted)', display: 'block', marginBottom: '6px' }}>
              Select Feature Flag:
            </label>
            <select id="ks-select" className="ff-env-select" style={{ width: '100%', marginBottom: '16px' }}>
              {flags.map((f) => (
                <option key={f.id} value={f.flagKey}>
                  {f.flagKey} ({f.module})
                </option>
              ))}
            </select>

            <label style={{ fontSize: '12px', color: 'var(--ff-text-muted)', display: 'block', marginBottom: '6px' }}>
              Emergency Reason Note (Mandatory):
            </label>
            <input
              type="text"
              className="ff-search-input"
              style={{ width: '100%', marginBottom: '20px' }}
              placeholder="e.g. High latency crash in database query"
              value={killSwitchReason}
              onChange={(e) => setKillSwitchReason(e.target.value)}
            />

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                style={{
                  background: 'var(--ff-surface-elevated)',
                  color: '#FFF',
                  padding: '10px 16px',
                  borderRadius: '8px',
                  border: '1px solid var(--ff-surface-border)'
                }}
                onClick={() => setIsKillSwitchModalOpen(false)}
              >
                Cancel
              </button>
              <button
                style={{
                  background: 'var(--ff-danger)',
                  color: '#FFF',
                  fontWeight: 700,
                  padding: '10px 20px',
                  borderRadius: '8px'
                }}
                onClick={() => {
                  const sel =
                    (document.getElementById('ks-select') as HTMLSelectElement)?.value || flags[0]?.flagKey || '';
                  handleTripKillSwitch(sel);
                }}
              >
                TRIP EMERGENCY KILL SWITCH NOW
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------- CREATE FEATURE FLAG MODAL ---------- */}
      {isCreateModalOpen && (
        <div className="ff-modal-backdrop" onClick={() => setIsCreateModalOpen(false)}>
          <div className="ff-modal" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontSize: '18px', marginBottom: '16px' }}>✨ Create Platform Feature Flag</h3>

            <form onSubmit={handleCreateFlag} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label
                  style={{ fontSize: '12px', color: 'var(--ff-text-muted)', display: 'block', marginBottom: '4px' }}
                >
                  Feature Flag Key (Format: <code>module.feature_name</code>):
                </label>
                <input
                  type="text"
                  className="ff-search-input"
                  style={{ width: '100%' }}
                  placeholder="e.g. marketplace.p2p_chat"
                  value={newFlagKey}
                  onChange={(e) => setNewFlagKey(e.target.value)}
                  required
                />
              </div>

              <div>
                <label
                  style={{ fontSize: '12px', color: 'var(--ff-text-muted)', display: 'block', marginBottom: '4px' }}
                >
                  Module Group:
                </label>
                <select
                  className="ff-env-select"
                  style={{ width: '100%' }}
                  value={newModule}
                  onChange={(e) => setNewModule(e.target.value)}
                >
                  <option value="Marketplace">Marketplace</option>
                  <option value="Confessions">Confessions</option>
                  <option value="Academic Resources">Academic Resources</option>
                  <option value="Connect">Connect</option>
                  <option value="Clubs">Clubs</option>
                  <option value="Events">Events</option>
                  <option value="AI">AI</option>
                </select>
              </div>

              <div>
                <label
                  style={{ fontSize: '12px', color: 'var(--ff-text-muted)', display: 'block', marginBottom: '4px' }}
                >
                  Owner Team:
                </label>
                <input
                  type="text"
                  className="ff-search-input"
                  style={{ width: '100%' }}
                  value={newOwnerTeam}
                  onChange={(e) => setNewOwnerTeam(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '10px' }}>
                <button
                  type="button"
                  style={{
                    background: 'var(--ff-surface-elevated)',
                    color: '#FFF',
                    padding: '10px 16px',
                    borderRadius: '8px'
                  }}
                  onClick={() => setIsCreateModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    background: 'var(--ff-primary)',
                    color: '#FFF',
                    fontWeight: 700,
                    padding: '10px 20px',
                    borderRadius: '8px'
                  }}
                >
                  Create Flag Definition
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
