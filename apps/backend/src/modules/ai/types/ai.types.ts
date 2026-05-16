export interface AiGenerateInput {
  prompt: string;
  currentCode?: string;
}

export interface AiGenerateOutput {
  code: string;
  assistantMessage: string;
}
