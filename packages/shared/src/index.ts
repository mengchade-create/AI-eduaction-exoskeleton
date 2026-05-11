/**
 * User roles shared by the web app and API clients.
 *
 * Values mirror SPEC section 4 `users.role`.
 */
export enum UserRole {
  Admin = "admin",
  Teacher = "teacher",
  Student = "student",
}

/**
 * Minimal JWT payload shared by auth-facing clients.
 */
export interface JwtPayload {
  sub: string;
  username: string;
  role: UserRole;
  exp?: number;
  iat?: number;
}
