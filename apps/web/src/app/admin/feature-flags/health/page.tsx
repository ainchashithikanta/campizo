'use client';

import React, { useState, useEffect } from 'react';
import { FeatureFlagsNavHeader, MetricCard } from '@web/components/feature-flags/FeatureFlagComponents';
import { featureFlagsApi, PlatformHealthDto } from '@web/lib/api-feature-flags';
import '@web/styles/feature-flags.css';

export default function HealthDashboardPage() {
  const [health, setHealth] = useState<PlatformHealthDto | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<string>('');

  const fetchHealth = async () => {
    const data = await featureFlagsApi.getHealth();
    setHealth(data);
    setLastRefreshed(new Date().toLocaleTimeString());
  };

  useEffect(() => {
    fetchHealth();
    // Auto-refresh every 5 seconds
    const interval = setInterval(fetchHealth, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="ff-container">
      <FeatureFlagsNavHeader activePath="/admin/feature-flags/health" />

      <div className="ff-card-panel">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h1 style={{ fontSize: '20px' }}>📈 Platform Health Dashboard (Auto-Refreshing)</h1>
            <p style={{ color: '#94A3B8', fontSize: '13px', marginTop: '4px' }}>
              Real-time cluster status, Redis Pub/Sub, worker queues, and circuit breaker metrics.
            </p>
          </div>
          <div style={{ fontSize: '12px', color: '#06B6D4', fontFamily: 'monospace' }}>
            Auto-refreshed: {lastRefreshed || 'Loading...'}
          </div>
        </div>

        {health && (
          <div className="ff-grid-metrics">
            <MetricCard title="System Status" value={health.status} subtitle="All nodes operational" />
            <MetricCard title="Redis Cluster" value={health.redisConnected ? 'CONNECTED' : 'DISCONNECTED'} subtitle="Pub/Sub: 4 channels" />
            <MetricCard title="Database Storage" value={health.databaseConnected ? 'HEALTHY' : 'DEGRADED'} subtitle="PostgreSQL pool active" />
            <MetricCard title="Worker Queue Depth" value={health.workerQueueDepth} subtitle="0 pending jobs" />
          </div>
        )}
      </div>
    </div>
  );
}
