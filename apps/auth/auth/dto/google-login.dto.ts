import { IsNotEmpty, IsString } from 'class-validator';

/**
 * Google Login DTO
 * Used to receive Google ID Token from frontend
 */
export class GoogleLoginDto {
  @IsNotEmpty()
  @IsString()
  idToken: string;
}
