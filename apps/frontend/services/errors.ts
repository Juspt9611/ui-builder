export const ApiErrorCode = {
  UNPROCESSABLE_PROMPT: 'UNPROCESSABLE_PROMPT',
} as const;

export type ApiErrorCode = (typeof ApiErrorCode)[keyof typeof ApiErrorCode];

export const UNPROCESSABLE_PROMPT_MESSAGE = 'Unclear request, please try again.';
