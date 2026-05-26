export function validatePassword(password) {
  const hasLength = password.length >= 10;
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /\d/.test(password);
  return {
    hasLength,
    hasMix: hasLetter && hasNumber,
    valid: hasLength && hasLetter && hasNumber,
  };
}
