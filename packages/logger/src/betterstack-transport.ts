import { Writable } from 'node:stream';
import { redactSensitiveObject } from './redactor.js';

export interface BetterStackTransportOptions {
  sourceToken?: string | undefined;
  ingestingHost?: string | undefined;
  batchSize?: number | undefined;
  flushIntervalMs?: number | undefined;
}

export class BetterStackTransportStream extends Writable {
  private sourceToken: string;
  private ingestingHost: string;
  private batchSize: number;
  private flushIntervalMs: number;
  private buffer: Array<Record<string, unknown>> = [];
  private timer: NodeJS.Timeout | null = null;
  private isFlushing = false;

  constructor(options: BetterStackTransportOptions = {}) {
    super({ objectMode: false });

    this.sourceToken =
      options.sourceToken || process.env.BETTERSTACK_SOURCE_TOKEN || '';
    this.ingestingHost =
      options.ingestingHost ||
      process.env.BETTERSTACK_INGESTING_HOST ||
      'in.logs.betterstack.com';
    this.batchSize = options.batchSize ?? 50;
    this.flushIntervalMs = options.flushIntervalMs ?? 1000;

    if (this.sourceToken) {
      this.startTimer();
    }
  }

  public isEnabled(): boolean {
    return Boolean(this.sourceToken);
  }

  private startTimer(): void {
    if (this.timer) return;
    this.timer = setInterval(() => {
      void this.flush();
    }, this.flushIntervalMs);
    if (this.timer.unref) {
      this.timer.unref();
    }
  }

  override _write(
    chunk: any,
    _encoding: BufferEncoding,
    callback: (error?: Error | null) => void
  ): void {
    if (!this.sourceToken) {
      callback();
      return;
    }

    try {
      const raw = chunk.toString();
      const parsed = JSON.parse(raw) as Record<string, unknown>;

      // Ensure PII redaction on log payload
      const sanitized = redactSensitiveObject(parsed);

      // Normalize fields for Better Stack ingestion
      const dt =
        typeof sanitized.time === 'number'
          ? new Date(sanitized.time).toISOString()
          : typeof sanitized.timestamp === 'string'
          ? sanitized.timestamp
          : new Date().toISOString();

      const logRecord: Record<string, unknown> = {
        dt,
        level: sanitized.levelName || sanitized.level || 'info',
        message: sanitized.msg || sanitized.message || '',
        service: sanitized.name || sanitized.serviceName || process.env.SERVICE_NAME || 'college-hub',
        environment: sanitized.environment || process.env.NODE_ENV || 'development',
        ...sanitized
      };

      this.buffer.push(logRecord);

      if (this.buffer.length >= this.batchSize) {
        void this.flush();
      }
    } catch {
      // Ignore parse errors to prevent application crashes
    }

    callback();
  }

  public async flush(): Promise<void> {
    if (this.buffer.length === 0 || this.isFlushing || !this.sourceToken) {
      return;
    }

    this.isFlushing = true;
    const batch = this.buffer.splice(0, this.batchSize);

    const host = this.ingestingHost.replace(/^https?:\/\//, '').replace(/\/$/, '');
    const url = `https://${host}`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.sourceToken}`
        },
        body: JSON.stringify(batch)
      });

      if (!response.ok) {
        if (response.status >= 500 && this.buffer.length < 1000) {
          this.buffer.unshift(...batch);
        }
      }
    } catch {
      if (this.buffer.length < 1000) {
        this.buffer.unshift(...batch.slice(0, 10));
      }
    } finally {
      this.isFlushing = false;
    }
  }

  public async close(): Promise<void> {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    await this.flush();
  }
}

export function createBetterStackStream(
  options?: BetterStackTransportOptions
): BetterStackTransportStream | undefined {
  const stream = new BetterStackTransportStream(options);
  return stream.isEnabled() ? stream : undefined;
}
