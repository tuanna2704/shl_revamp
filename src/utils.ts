import { randomBytes } from 'crypto';

export const randomStringWithEntropy = (length: number, prefix = ''): string => {
  // Generate a buffer with random bytes
  const buffer = randomBytes(Math.ceil((length * 3) / 4)); // Ensure we have enough bytes to base64 encode

  // Convert to a base64url string
  const randomString = buffer
    .toString('base64') // Base64 encode
    .replace(/=/g, '')  // Remove '=' padding
    .replace(/\+/g, '-') // Replace '+' with '-'
    .replace(/\//g, '_') // Replace '/' with '_'
    .slice(0, length);   // Trim to the desired length

  // Return the random string with the optional prefix
  return `${prefix}${randomString}`;
};