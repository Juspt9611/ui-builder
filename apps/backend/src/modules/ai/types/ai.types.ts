export interface AiHistoryEntry {
  role: 'user' | 'assistant';
  content: string;
}

export interface AiGenerateInput {
  prompt: string;
  history?: AiHistoryEntry[];
}

export interface AiGenerateOutput {
  code: string;
  assistantMessage: string;
}
