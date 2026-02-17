export type OAuthProfile = {
  googleId: string;
  email: string;
  firstName: string;
  lastName: string | null;
  picture: string;
};

export type AuthUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string | null;
  picture: string;
};

export type AuthJwtPayload = {
  sub: string;
  id: string;
  email: string;
  firstName: string;
  lastName: string | null;
  picture: string;
  tokenType: 'access' | 'refresh';
  iat: number;
  exp: number;
};

export type RefreshTokenBody = {
  refreshToken: string;
};
