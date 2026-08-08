export interface LoginFormData {
  email: string
  password: string
}

export interface RegisterFormData {
  full_name: string
  email: string
  password: string
  confirmPassword: string
}

export interface ForgotPasswordFormData {
  email: string
}

export interface ResetPasswordFormData {
  password: string
  confirmPassword: string
}
