export interface AiModerationScore {
  toxicityScore: number;
  hateSpeechScore: number;
  spamScore: number;
  piiScore: number;
  recommendedAction: 'ALLOW' | 'FLAG' | 'QUARANTINE';
}

export interface AiModerationProvider {
  analyzeContent(text: string): Promise<AiModerationScore>;
}

export class MockAiModerationProvider implements AiModerationProvider {
  async analyzeContent(text: string): Promise<AiModerationScore> {
    const isToxic = text.toLowerCase().includes('hate') || text.toLowerCase().includes('kill');
    return {
      toxicityScore: isToxic ? 0.95 : 0.05,
      hateSpeechScore: isToxic ? 0.9 : 0.02,
      spamScore: 0.01,
      piiScore: 0.0,
      recommendedAction: isToxic ? 'QUARANTINE' : 'ALLOW'
    };
  }
}
