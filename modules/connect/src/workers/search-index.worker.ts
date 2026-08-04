/**
 * Campus Connect — Search Index Worker
 * Updates discovery search indexes asynchronously without blocking HTTP request execution. Target <80ms.
 */

import { ConnectEventEnvelope } from '../events/event-envelope.js';
import { WorkerMetrics } from '../metrics/worker-metrics.js';

export class SearchIndexWorker {
  private indexedDocuments: Map<string, any> = new Map();

  async processSearchIndexUpdate(event: ConnectEventEnvelope<{ docId: string; docType: string; content: Record<string, any> }>): Promise<void> {
    const startTime = Date.now();
    try {
      const { docId, docType, content } = event.payload;
      const indexKey = `${event.collegeId}:${docType}:${docId}`;

      // Asynchronous non-blocking index update
      this.indexedDocuments.set(indexKey, {
        docId,
        docType,
        collegeId: event.collegeId,
        content,
        updatedAt: new Date().toISOString()
      });

      const duration = Date.now() - startTime;
      WorkerMetrics.getInstance().recordJobExecution('SearchIndexWorker', duration, true);
    } catch (err) {
      const duration = Date.now() - startTime;
      WorkerMetrics.getInstance().recordJobExecution('SearchIndexWorker', duration, false);
      throw err;
    }
  }

  getIndexedDocument(indexKey: string): any | undefined {
    return this.indexedDocuments.get(indexKey);
  }

  clear(): void {
    this.indexedDocuments.clear();
  }
}
