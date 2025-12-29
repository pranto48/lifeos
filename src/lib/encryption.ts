/**
 * Client-side encryption utilities for vault notes
 * Uses Web Crypto API with AES-GCM for secure encryption
 */

const SALT_LENGTH = 16;
const IV_LENGTH = 12;
const PBKDF2_ITERATIONS = 100000;

/**
 * Derives a cryptographic key from a passphrase using PBKDF2
 */
async function deriveKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const passphraseKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(passphrase),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as unknown as BufferSource,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    passphraseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypts content using AES-GCM with a passphrase
 * Returns base64-encoded string containing salt + iv + ciphertext
 */
export async function encryptContent(content: string, passphrase: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);

  // Generate random salt and IV
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));

  // Derive key from passphrase
  const key = await deriveKey(passphrase, salt);

  // Encrypt the content
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv as unknown as BufferSource },
    key,
    data
  );

  // Combine salt + iv + ciphertext into single array
  const combined = new Uint8Array(SALT_LENGTH + IV_LENGTH + ciphertext.byteLength);
  combined.set(salt, 0);
  combined.set(iv, SALT_LENGTH);
  combined.set(new Uint8Array(ciphertext), SALT_LENGTH + IV_LENGTH);

  // Return as base64
  return btoa(String.fromCharCode(...combined));
}

/**
 * Decrypts content that was encrypted with encryptContent
 * Throws if passphrase is incorrect
 */
export async function decryptContent(encryptedData: string, passphrase: string): Promise<string> {
  try {
    // Decode base64
    const combined = new Uint8Array(
      atob(encryptedData)
        .split('')
        .map((c) => c.charCodeAt(0))
    );

    // Extract salt, iv, and ciphertext
    const salt = combined.slice(0, SALT_LENGTH);
    const iv = combined.slice(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
    const ciphertext = combined.slice(SALT_LENGTH + IV_LENGTH);

    // Derive key from passphrase
    const key = await deriveKey(passphrase, salt);

    // Decrypt
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv as unknown as BufferSource },
      key,
      ciphertext
    );

    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
  } catch {
    throw new Error('Decryption failed. Incorrect passphrase or corrupted data.');
  }
}

/**
 * Validates if a passphrase meets security requirements
 */
export function validatePassphrase(passphrase: string): { valid: boolean; message?: string } {
  if (passphrase.length < 8) {
    return { valid: false, message: 'Passphrase must be at least 8 characters' };
  }
  if (!/[A-Z]/.test(passphrase)) {
    return { valid: false, message: 'Passphrase must contain at least one uppercase letter' };
  }
  if (!/[a-z]/.test(passphrase)) {
    return { valid: false, message: 'Passphrase must contain at least one lowercase letter' };
  }
  if (!/[0-9]/.test(passphrase)) {
    return { valid: false, message: 'Passphrase must contain at least one number' };
  }
  return { valid: true };
}

/**
 * Generates a hash of the passphrase for verification
 * Store this hash to verify user knows passphrase without storing it
 */
export async function hashPassphrase(passphrase: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(passphrase + 'vault-verification-salt');
  const hash = await crypto.subtle.digest('SHA-256', data);
  return btoa(String.fromCharCode(...new Uint8Array(hash)));
}
