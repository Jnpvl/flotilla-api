import bcrypt from "bcrypt";

const BCRYPT_ROUNDS = 10;
const BCRYPT_HASH_RE = /^\$2[aby]\$\d{2}\$/;

export function isPasswordHashed(value: string): boolean {
  return BCRYPT_HASH_RE.test(value);
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_ROUNDS);
}

export async function verifyPassword(
  plain: string,
  stored: string,
): Promise<boolean> {
  if (!isPasswordHashed(stored)) {
    return false;
  }
  return bcrypt.compare(plain, stored);
}
