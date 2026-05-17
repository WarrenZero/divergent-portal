import Anthropic from '@anthropic-ai/sdk';

// Singleton — instantiated once per server process
export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export const COPILOT_MODEL = 'claude-sonnet-4-6';
export const COPILOT_MAX_TOKENS = 1024;
