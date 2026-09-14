export default {
  registration: {
    passwordHint: 'Use 15–30 characters, uppercase and lowercase Latin letters, a number and a symbol (!@#$%^&*(),.?":{}|<>). Do not repeat a character more than 3 times in a row.',
    exists: 'An account with this email already exists. Please log in.',
    error: 'Registration failed. Check your details and try again.',
  },
  validation: {
    errors: {
      email: {
        required: 'Email is required',
        incorrect: 'Enter a valid email',
      },
      password: {
        required: 'Password is required',
        minLength: 'Password must be at least 6 characters long',
        mustContainLetter: 'Password must contain at least one letter',
        mustContainDigit: 'Password must contain at least one digit',
        mismatch: 'Passwords do not match',
      },
    },
  },
  notifications: {
    resetLinkSent: 'If the account exists, instructions will be sent to the email address.',
    resetError: 'An error occurred while requesting a password reset.',
    tokenMissing: 'Recovery token not found in URL.',
    passwordsMismatch: 'Passwords do not match.',
    resetSuccess: 'Password successfully updated!',
  },
  fields: {
    password: {
      label: 'Password',
    },
    email: {
      label: 'Email',
    },
    passwordConfirm: {
      label: 'Confirm Password',
    },
  },
  buttons: {
    showPassword: 'Show password',
    hidePassword: 'Hide password',
    showConfirmation: 'Show password confirmation',
    hideConfirmation: 'Hide password confirmation',
    register: 'Create an account',
    login: 'Login',
    forgotPassword: 'Forgot password?',
    logout: 'Log out',
    sendResetLink: 'Send Reset Link',
    backToLogin: 'Back to Login',
    saveNewPassword: 'Save New Password',
  },
  labels: {
    login: 'Login to system',
    forgotPassword: 'Reset Password',
    resetPassword: 'Reset Password',
  },
};
