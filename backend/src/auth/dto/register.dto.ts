import { Transform } from 'class-transformer';
import { IsEmail, IsString, Length } from 'class-validator';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);
const normalizeEmail = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;

export class RegisterDto {
  @Transform(trim)
  @IsString()
  @Length(2, 100)
  name: string;

  @Transform(normalizeEmail)
  @IsEmail()
  email: string;

  // 72 é o limite de bytes que o bcrypt considera.
  @IsString()
  @Length(8, 72)
  password: string;
}
