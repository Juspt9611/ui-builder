import { HttpException, HttpStatus } from '@nestjs/common';

export const CANNOT_INTERPRET_SENTINEL = 'CANNOT_INTERPRET';

export class UnprocessablePromptException extends HttpException {
  constructor(reason: string) {
    super(
      { errorCode: 'UNPROCESSABLE_PROMPT', message: reason },
      HttpStatus.UNPROCESSABLE_ENTITY,
    );
  }
}
