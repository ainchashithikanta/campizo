import type { BaseProvider } from './base.interface.js';

export interface AiOptions {
  temperature?: number;
  maxTokens?: number;
}

export interface AiProvider extends BaseProvider {
  readonly type: 'AI';
  generateText(prompt: string, options?: AiOptions): Promise<string>;
  generateEmbeddings(text: string): Promise<number[]>;
}
