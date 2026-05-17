export const ApiErrorCode = {
  UNPROCESSABLE_PROMPT: 'UNPROCESSABLE_PROMPT',
} as const;

export type ApiErrorCode = (typeof ApiErrorCode)[keyof typeof ApiErrorCode];
