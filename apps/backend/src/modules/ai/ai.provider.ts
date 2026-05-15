import { AiGenerateInput, AiGenerateOutput } from './types/ai.types';

export abstract class AiProvider {
  abstract generate(input: AiGenerateInput): Promise<AiGenerateOutput>;
}
