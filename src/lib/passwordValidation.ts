/**
 * Validates password according to requirements:
 * - At least 6 characters long
 * - At least 1 uppercase letter
 * - At least 1 special character
 */
export function validatePassword(password: string): { valid: boolean; error?: string } {
  if (!password) {
    return { valid: false, error: 'Mật khẩu là bắt buộc' };
  }

  if (password.length < 6) {
    return { valid: false, error: 'Mật khẩu phải có ít nhất 6 ký tự' };
  }

  // Check for at least 1 uppercase letter
  if (!/[A-Z]/.test(password)) {
    return { valid: false, error: 'Mật khẩu phải có ít nhất 1 chữ cái viết hoa' };
  }

  // Check for at least 1 special character
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    return { valid: false, error: 'Mật khẩu phải có ít nhất 1 ký tự đặc biệt (!@#$%^&*()_+-=[]{}|;:,.<>?)' };
  }

  return { valid: true };
}

/**
 * Gets password requirements message
 */
export function getPasswordRequirements(): string {
  return 'Mật khẩu phải có: tối thiểu 6 ký tự, ít nhất 1 chữ cái viết hoa và 1 ký tự đặc biệt';
}



