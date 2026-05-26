export function translateAuthError(error, t) {
  const msg = error?.message?.toLowerCase() ?? '';
  if (msg.includes('invalid login credentials')) return t('auth.invalidCredentials');
  if (msg.includes('email not confirmed')) return t('auth.emailNotVerified');
  if (msg.includes('rate limit') || msg.includes('too many')) return t('auth.rateLimited');
  if (msg.includes('user already registered')) return t('auth.alreadyAccount');
  return error?.message ?? t('auth.genericError');
}
