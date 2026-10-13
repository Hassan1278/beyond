// One-use in-memory navigation intent. Email is never placed in URLs or storage.
let email: string | null = null;
export function beginSignup(value: string): void {
  email = value;
}
export function signupRequested(): boolean {
  return email !== null;
}
export function takeSignupEmail(): string {
  const value = email ?? '';
  email = null;
  return value;
}
