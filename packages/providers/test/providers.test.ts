import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  ProviderManager,
  CircuitBreaker,
  MockStorageProvider,
  MockEmailProvider,
  MockAiProvider,
  type EmailProvider
} from '../src/index.js';

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn(),
        download: vi.fn(),
        exists: vi.fn(),
        list: vi.fn(),
        remove: vi.fn(),
        copy: vi.fn(),
        move: vi.fn(),
        getSignedUrl: vi.fn()
      }))
    }
  }))
}));

describe('Provider Abstraction Layer & Plugin Architecture', () => {
  let manager: ProviderManager;

  beforeEach(() => {
    manager = new ProviderManager();
  });

  it('should register providers and sort them by priority', () => {
    const backupEmail = new MockEmailProvider('mock-email-backup', 2);
    const primaryEmail = new MockEmailProvider('mock-email-primary', 1);

    manager.register(backupEmail);
    manager.register(primaryEmail);

    const activeEmailProvider = manager.getProvider<EmailProvider>('EMAIL');
    expect(activeEmailProvider.name).toBe('mock-email-primary');
    expect(activeEmailProvider.priority).toBe(1);
  });

  it('should execute automatic failover when primary provider fails', async () => {
    const primaryFailingEmail = new MockEmailProvider('email-primary', 1, true); // Failing primary
    const backupWorkingEmail = new MockEmailProvider('email-backup', 2, false); // Working backup

    manager.register(primaryFailingEmail);
    manager.register(backupWorkingEmail);

    const result = await manager.executeWithFailover<EmailProvider, { success: boolean; messageId: string }>(
      'EMAIL',
      'sendEmail',
      (provider) => provider.sendEmail('student@stanford.edu', 'Welcome', '<h1>Hello</h1>')
    );

    expect(result.success).toBe(true);
    expect(backupWorkingEmail.sentEmails.length).toBe(1);
    expect(backupWorkingEmail.sentEmails[0]?.to).toBe('student@stanford.edu');
  });

  it('should trip CircuitBreaker to OPEN state when threshold exceeded', async () => {
    const cb = new CircuitBreaker({ failureThreshold: 2, resetTimeoutMs: 1000 });

    const failingTask = async () => {
      throw new Error('Simulated network error');
    };

    await expect(cb.execute(failingTask)).rejects.toThrow('Simulated network error');
    await expect(cb.execute(failingTask)).rejects.toThrow('Simulated network error');

    // 3rd call should be blocked by OPEN circuit breaker
    expect(cb.getState()).toBe('OPEN');
    await expect(cb.execute(failingTask)).rejects.toThrow('CircuitBreaker is OPEN');
  });

  it('should execute upload, download, exists, signedUrl, list, copy, move, and delete operations on MockStorageProvider', async () => {
    const storage = new MockStorageProvider();
    manager.register(storage);

    const activeStorage = manager.getProvider<MockStorageProvider>('STORAGE');
    const uploadRes = await activeStorage.upload(
      'documents/syllabus.pdf',
      Buffer.from('Syllabus Content'),
      'application/pdf',
      { bucket: 'documents' }
    );

    expect(uploadRes.path).toBe('documents/syllabus.pdf');
    expect(uploadRes.sizeBytes).toBeGreaterThan(0);

    const exists = await activeStorage.exists('documents/syllabus.pdf', { bucket: 'documents' });
    expect(exists).toBe(true);

    const downloaded = await activeStorage.download('documents/syllabus.pdf', { bucket: 'documents' });
    expect(downloaded.toString()).toBe('Syllabus Content');

    const signedUrl = await activeStorage.signedUrl('documents/syllabus.pdf', 3600, { bucket: 'documents' });
    expect(signedUrl).toContain('mock-jwt');

    const listItems = await activeStorage.list('documents/', { bucket: 'documents' });
    expect(listItems.length).toBeGreaterThan(0);

    const copied = await activeStorage.copy('documents/syllabus.pdf', 'documents/syllabus-copy.pdf', { fromBucket: 'documents' });
    expect(copied).toBe(true);

    const moved = await activeStorage.move('documents/syllabus-copy.pdf', 'documents/syllabus-moved.pdf', { fromBucket: 'documents' });
    expect(moved).toBe(true);

    const deleted = await activeStorage.delete('documents/syllabus.pdf', { bucket: 'documents' });
    expect(deleted).toBe(true);
  });

  it('should validate SupabaseStorageProvider options, MIME types, and size limits', async () => {
    const { SupabaseStorageProvider } = await import('../src/supabase-storage.provider.js');
    const provider = new SupabaseStorageProvider({
      supabaseUrl: 'http://localhost:54321',
      supabaseServiceRoleKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.mock'
    });

    expect(provider.name).toBe('supabase-storage');
    expect(provider.getCapabilities()).toContain('mimeValidation');

    expect(() => provider.validateMimeType('application/pdf')).not.toThrow();
    expect(() => provider.validateMimeType('image/png')).not.toThrow();
    expect(() => provider.validateMimeType('video/mp4')).not.toThrow();
    expect(() => provider.validateMimeType('application/executable-exe')).toThrow();

    expect(() => provider.validateFileSize(100, 500)).not.toThrow();
    expect(() => provider.validateFileSize(1000, 500)).toThrow();
  });

  it('should generate embeddings and text completions on MockAiProvider', async () => {
    const ai = new MockAiProvider();
    manager.register(ai);

    const activeAi = manager.getProvider<MockAiProvider>('AI');
    const text = await activeAi.generateText('Explain Quantum Physics');
    expect(text).toContain('Mock AI response to: Explain Quantum Physics');

    const embeddings = await activeAi.generateEmbeddings('Vector Text');
    expect(embeddings.length).toBe(1536);
  });
});

