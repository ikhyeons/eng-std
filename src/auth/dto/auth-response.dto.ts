import { AuthProvider } from '../../users/entities/user.entity';
import { User } from '../../users/entities/user.entity';

export class PublicUserDto {
  id: string;
  email: string | null;
  name: string;
  provider: AuthProvider;
  avatarUrl: string | null;
  emailVerified: boolean;
}

export class TokenResponseDto {
  accessToken: string;
  refreshToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
  user: PublicUserDto;
}

export function toPublicUser(user: User): PublicUserDto {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    provider: user.provider,
    avatarUrl: user.avatarUrl,
    emailVerified: user.emailVerified,
  };
}
