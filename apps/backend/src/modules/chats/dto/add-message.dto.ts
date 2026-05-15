import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class AddMessageDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(4000)
  content: string;
}
