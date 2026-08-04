import type { StorageProvider, StorageUploadResult } from '../storage.interface.js';
import type { NotificationProvider, NotificationPayload } from '../notification.interface.js';
import type { EmailProvider } from '../email.interface.js';
import type { AiProvider, AiOptions } from '../ai.interface.js';
import type { SearchProvider, SearchOptions, SearchResult } from '../search.interface.js';
import type { ProviderHealth } from '../base.interface.js';

export class MockStorageProvider implements StorageProvider {
  public readonly name = 'mock-storage';
  public readonly type = 'STORAGE' as const;
  public readonly version = '1.0.0';
  public readonly priority: number;

  private files = new Map<string, Buffer>();

  constructor(priority = 1) {
    this.priority = priority;
  }

  public async initialize(): Promise<void> {}
  public async healthCheck(): Promise<ProviderHealth> {
    return { healthy: true, details: { storedFiles: this.files.size } };
  }
  public getCapabilities(): string[] {
    return ['upload', 'download', 'delete', 'getPublicUrl'];
  }

  public async upload(path: string, content: Buffer | Uint8Array, _mimeType: string): Promise<StorageUploadResult> {
    const buf = Buffer.isBuffer(content) ? content : Buffer.from(content);
    this.files.set(path, buf);
    return {
      path,
      url: `https://mock-storage.collegehub.internal/${path}`,
      sizeBytes: buf.length
    };
  }

  public async download(path: string): Promise<Buffer> {
    const file = this.files.get(path);
    if (!file) throw new Error(`File not found: ${path}`);
    return file;
  }

  public async delete(path: string): Promise<boolean> {
    return this.files.delete(path);
  }

  public getPublicUrl(path: string): string {
    return `https://mock-storage.collegehub.internal/${path}`;
  }
}

export class MockEmailProvider implements EmailProvider {
  public readonly name: string;
  public readonly type = 'EMAIL' as const;
  public readonly version = '1.0.0';
  public readonly priority: number;
  public shouldFail: boolean;

  public sentEmails: Array<{ to: string; subject: string; bodyHtml: string }> = [];

  constructor(name = 'mock-email-primary', priority = 1, shouldFail = false) {
    this.name = name;
    this.priority = priority;
    this.shouldFail = shouldFail;
  }

  public async initialize(): Promise<void> {}
  public async healthCheck(): Promise<ProviderHealth> {
    return { healthy: !this.shouldFail };
  }
  public getCapabilities(): string[] {
    return ['sendEmail'];
  }

  public async sendEmail(
    to: string,
    subject: string,
    bodyHtml: string
  ): Promise<{ success: boolean; messageId: string }> {
    if (this.shouldFail) {
      throw new Error(`Mock email provider '${this.name}' simulated failure`);
    }
    this.sentEmails.push({ to, subject, bodyHtml });
    return { success: true, messageId: `msg-${Date.now()}` };
  }
}

export class MockNotificationProvider implements NotificationProvider {
  public readonly name = 'mock-notification';
  public readonly type = 'NOTIFICATION' as const;
  public readonly version = '1.0.0';
  public readonly priority = 1;

  public async initialize(): Promise<void> {}
  public async healthCheck(): Promise<ProviderHealth> {
    return { healthy: true };
  }
  public getCapabilities(): string[] {
    return ['sendNotification', 'sendBatchNotifications'];
  }

  public async sendNotification(payload: NotificationPayload): Promise<{ success: boolean; messageId: string }> {
    return { success: true, messageId: `notif-${payload.recipientUserId}` };
  }

  public async sendBatchNotifications(
    payloads: NotificationPayload[]
  ): Promise<{ successCount: number; failureCount: number }> {
    return { successCount: payloads.length, failureCount: 0 };
  }
}

export class MockAiProvider implements AiProvider {
  public readonly name = 'mock-ai';
  public readonly type = 'AI' as const;
  public readonly version = '1.0.0';
  public readonly priority = 1;

  public async initialize(): Promise<void> {}
  public async healthCheck(): Promise<ProviderHealth> {
    return { healthy: true };
  }
  public getCapabilities(): string[] {
    return ['generateText', 'generateEmbeddings'];
  }

  public async generateText(prompt: string, _options?: AiOptions): Promise<string> {
    return `Mock AI response to: ${prompt}`;
  }

  public async generateEmbeddings(_text: string): Promise<number[]> {
    return Array.from({ length: 1536 }, () => Math.random());
  }
}

export class MockSearchProvider implements SearchProvider {
  public readonly name = 'mock-search';
  public readonly type = 'SEARCH' as const;
  public readonly version = '1.0.0';
  public readonly priority = 1;

  private docs = new Map<string, Record<string, unknown>>();

  public async initialize(): Promise<void> {}
  public async healthCheck(): Promise<ProviderHealth> {
    return { healthy: true };
  }
  public getCapabilities(): string[] {
    return ['indexDocument', 'search', 'deleteDocument'];
  }

  public async indexDocument<T extends Record<string, unknown>>(
    indexName: string,
    id: string,
    doc: T
  ): Promise<boolean> {
    this.docs.set(`${indexName}:${id}`, doc);
    return true;
  }

  public async search<T = unknown>(
    indexName: string,
    _query: string,
    _options?: SearchOptions
  ): Promise<SearchResult<T>> {
    const items: T[] = [];
    for (const [key, doc] of this.docs) {
      if (key.startsWith(`${indexName}:`)) {
        items.push(doc as T);
      }
    }
    return { items, total: items.length };
  }

  public async deleteDocument(indexName: string, id: string): Promise<boolean> {
    return this.docs.delete(`${indexName}:${id}`);
  }
}
