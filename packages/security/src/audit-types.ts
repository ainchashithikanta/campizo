export type AuditEventSeverity = 'INFO' | 'WARNING' | 'SECURITY' | 'CRITICAL';
export type ActorType = 'USER' | 'ADMIN' | 'SYSTEM' | 'API';

export interface AuditLogEntryInput {
  collegeId: string;
  actorUserId: string;
  actorRole: string;
  actorType?: ActorType | undefined;
  severity?: AuditEventSeverity | undefined;
  action: string;
  targetEntityId: string;
  targetEntityType: string;
  oldValue?: Record<string, unknown> | undefined;
  newValue?: Record<string, unknown> | undefined;
  reason?: string | undefined; // Reason field for administrative / destructive actions
  ipAddress: string;
  userAgent: string;
  traceId?: string | undefined;
}

export interface AuditLogRecordPayload extends AuditLogEntryInput {
  id: string;
  actorType: ActorType;
  severity: AuditEventSeverity;
  previousHash: string;
  hash: string; // Cryptographic SHA-256 payload hash
  createdAt: Date;
}

export interface AuditSearchFilter {
  collegeId?: string;
  actorUserId?: string;
  severity?: AuditEventSeverity;
  action?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
}
