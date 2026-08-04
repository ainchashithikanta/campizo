/**
 * Error Tracking & Incident Response — Incident Engine (MS-56)
 * Evaluates an aggregated error against the incident rules and, when a rule
 * matches within its rolling window, produces a new incident. Deduplication of
 * already-open incidents is the responsibility of the tracker (via the
 * repository) so the engine stays pure and testable.
 */

import { randomUUID } from 'node:crypto';
import type { IncidentEntity, TrackedErrorEntity } from '../domain/entities.js';
import { SEVERITY_WEIGHTS } from '../domain/entities.js';
import { INCIDENT_RULES, type IncidentRule } from './incident-rules.js';

export class IncidentEngine {
  constructor(private readonly rules: IncidentRule[] = INCIDENT_RULES) {}

  public evaluate(error: TrackedErrorEntity, now: Date = new Date()): IncidentEntity | null {
    for (const rule of this.rules) {
      if (!this.matches(rule, error)) {
        continue;
      }
      const occurrencesInWindow = error.recentOccurrences.filter(
        (timestamp) => now.getTime() - timestamp.getTime() <= rule.windowSeconds * 1000
      ).length;
      if (occurrencesInWindow < rule.minOccurrences) {
        continue;
      }
      return this.buildIncident(rule, error, now);
    }
    return null;
  }

  private matches(rule: IncidentRule, error: TrackedErrorEntity): boolean {
    if (rule.errorClass !== 'any' && rule.errorClass !== error.errorClass) {
      return false;
    }
    if (rule.source !== 'any' && rule.source !== error.source) {
      return false;
    }
    return SEVERITY_WEIGHTS[error.severity] >= SEVERITY_WEIGHTS[rule.minSeverity];
  }

  private buildIncident(rule: IncidentRule, error: TrackedErrorEntity, now: Date): IncidentEntity {
    return {
      id: randomUUID(),
      ruleId: rule.id,
      fingerprint: error.fingerprint,
      title: rule.name,
      summary: `${rule.description} Error '${error.message}' (${error.errorClass}/${error.severity}) in service '${error.serviceName}'.`,
      severity: error.severity,
      status: 'OPEN',
      source: error.source,
      serviceName: error.serviceName,
      relatedErrorIds: [error.id],
      occurrenceCount: error.occurrenceCount,
      affectedServices: [...error.affectedServices],
      firstSeenAt: error.firstSeenAt,
      lastSeenAt: now,
      acknowledgedAt: undefined,
      acknowledgedBy: undefined,
      investigatingAt: undefined,
      investigatingBy: undefined,
      resolvedAt: undefined,
      resolvedBy: undefined,
      closedAt: undefined,
      closedBy: undefined,
      runbookRef: rule.runbookRef,
      notes: [],
      attributes: {}
    };
  }
}
