import { describe, it, expect, beforeEach } from 'vitest';
import {
  ProviderManager,
  CircuitBreaker,
  MockStorageProvider,
  MockEmailProvider,
  MockAiProvider,
  MockSearchProvider,
  type EmailProvider
} from '../src/index.js';

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

  it('should execute upload, download, and delete operations on MockStorageProvider', async () => {
    const storage = new MockStorageProvider();
    manager.register(storage);

    const activeStorage = manager.getProvider<MockStorageProvider>('STORAGE');
    const uploadRes = await activeStorage.upload(
      'documents/syllabus.pdf',
      Buffer.from('Syllabus Content'),
      'application/pdf'
    );

    expect(uploadRes.path).toBe('documents/syllabus.pdf');
    expect(uploadRes.sizeBytes).toBeGreaterThan(0);

    const downloaded = await activeStorage.download('documents/syllabus.pdf');
    expect(downloaded.toString()).toBe('Syllabus Content');

    const deleted = await activeStorage.delete('documents/syllabus.pdf');
    expect(deleted).toBe(true);
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
