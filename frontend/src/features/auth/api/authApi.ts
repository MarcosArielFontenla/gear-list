import { apiRequest } from "../../../shared/api/httpClient";
import type {
  AuthResponse,
  ChangePasswordInput,
  ForgotPasswordInput,
  LoginInput,
  PasswordRecoveryAcceptedResponse,
  RegisterInput,
  ResetPasswordInput,
} from "../types";

export function login(input: LoginInput): Promise<AuthResponse> {
  return apiRequest<AuthResponse>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function register(input: RegisterInput): Promise<AuthResponse> {
  return apiRequest<AuthResponse>("/api/auth/register", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function refreshSession(): Promise<AuthResponse> {
  return apiRequest<AuthResponse>("/api/auth/refresh", { method: "POST" });
}

export function logout(): Promise<void> {
  return apiRequest<void>("/api/auth/logout", { method: "POST" });
}

export function forgotPassword(
  input: ForgotPasswordInput,
): Promise<PasswordRecoveryAcceptedResponse> {
  return apiRequest<PasswordRecoveryAcceptedResponse>(
    "/api/auth/forgot-password",
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );
}

export function resetPassword(input: ResetPasswordInput): Promise<void> {
  return apiRequest<void>("/api/auth/reset-password", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function changePassword(
  input: ChangePasswordInput,
  accessToken: string,
): Promise<void> {
  return apiRequest<void>("/api/auth/change-password", {
    method: "POST",
    accessToken,
    body: JSON.stringify(input),
  });
}
