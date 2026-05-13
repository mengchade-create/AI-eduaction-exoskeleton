import { apiRequest } from "./client";
import type { LoginResponse, User } from "./types";

export function login(username: string, password: string): Promise<LoginResponse> {
  return apiRequest<LoginResponse>("/auth/login", {
    method: "POST",
    body: { username, password },
  });
}

export function getMe(token: string): Promise<User> {
  return apiRequest<User>("/auth/me", {
    method: "GET",
    token,
  });
}
