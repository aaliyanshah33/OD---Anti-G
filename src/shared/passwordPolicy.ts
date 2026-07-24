/** Shared password policy for account creation and password changes. */

export const PASSWORD_MIN_LENGTH = 11

export const PASSWORD_REQUIREMENTS_TEXT =
  'Minimum 11 characters, including at least one number and one special character'

/**
 * Validates password strength.
 * Rules: at least 11 characters, one digit, and one special character.
 */
export function validatePasswordStrength(password: string): { valid: boolean; error?: string } {
  if (!password || password.length < PASSWORD_MIN_LENGTH) {
    return { valid: false, error: `Password must be at least ${PASSWORD_MIN_LENGTH} characters` }
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, error: 'Password must include at least one number' }
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    return { valid: false, error: 'Password must include at least one special character' }
  }
  return { valid: true }
}
