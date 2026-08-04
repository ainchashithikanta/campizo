/**
 * Campus Connect — Event Envelope Specification
 * Every event MUST contain: eventId, requestId, traceId, collegeId, timestamp, payload, version.
 */

export interface ConnectEventEnvelope<T = Record<string, unknown>> {
  eventId: string;
  requestId: string;
  traceId: string;
  collegeId: string;
  timestamp: string;
  eventType: string;
  version: number;
  payload: T;
}

export function buildEventEnvelope<T>(
  eventType: string,
  payload: T,
  header: {
    eventId?: string;
    requestId?: string;
    traceId?: string;
    collegeId?: string;
    timestamp?: string;
    version?: number;
  }
): ConnectEventEnvelope<T> {
  return {
    eventId: header.eventId || `evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    requestId: header.requestId || `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    traceId: header.traceId || `trace_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    collegeId: header.collegeId || 'college_stanford_001',
    timestamp: header.timestamp || new Date().toISOString(),
    eventType,
    version: header.version || 1,
    payload
  };
}

export function validateEventEnvelope(event: unknown): ConnectEventEnvelope {
  if (!event || typeof event !== 'object') {
    throw new Error('Event payload must be a non-null object.');
  }

  const e = event as Record<string, unknown>;
  const required = ['eventId', 'requestId', 'traceId', 'collegeId', 'timestamp', 'eventType', 'payload'];

  for (const field of required) {
    if (!e[field]) {
      throw new Error(`Invalid event envelope: missing mandatory field '${field}'.`);
    }
  }

  return {
    eventId: String(e['eventId']),
    requestId: String(e['requestId']),
    traceId: String(e['traceId']),
    collegeId: String(e['collegeId']),
    timestamp: String(e['timestamp']),
    eventType: String(e['eventType']),
    version: typeof e['version'] === 'number' ? e['version'] : 1,
    payload: e['payload'] as Record<string, unknown>
  };
}
