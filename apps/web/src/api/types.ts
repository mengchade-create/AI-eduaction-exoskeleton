export type UserRole = "admin" | "teacher" | "student";

export type User = {
  id: string;
  username: string;
  role: UserRole;
  display_name: string | null;
  avatar: string | null;
};

export type LoginResponse = {
  access_token: string;
  token_type: "bearer";
  user: User;
};
