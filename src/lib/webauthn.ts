// WebAuthn utilities for PWA biometric authentication

export interface WebAuthnCapabilities {
  isSupported: boolean;
  isPlatformAuthenticatorAvailable: boolean;
  isAndroid: boolean;
  isIOS: boolean;
  isSafari: boolean;
  canUseBiometrics: boolean;
}

// Detect platform and WebAuthn capabilities
export async function detectWebAuthnCapabilities(): Promise<WebAuthnCapabilities> {
  const userAgent = navigator.userAgent.toLowerCase();
  const isAndroid = /android/.test(userAgent);
  const isIOS = /iphone|ipad|ipod/.test(userAgent);
  const isSafari = /safari/.test(userAgent) && !/chrome/.test(userAgent);
  
  const isSupported = !!(window.PublicKeyCredential);
  
  let isPlatformAuthenticatorAvailable = false;
  if (isSupported && PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable) {
    try {
      isPlatformAuthenticatorAvailable = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    } catch {
      isPlatformAuthenticatorAvailable = false;
    }
  }
  
  // Biometrics work on Android Chrome AND iOS Safari 14+ supports WebAuthn
  // Enable for all platforms that have platform authenticator available
  const canUseBiometrics = isSupported && isPlatformAuthenticatorAvailable;
  
  return {
    isSupported,
    isPlatformAuthenticatorAvailable,
    isAndroid,
    isIOS,
    isSafari,
    canUseBiometrics,
  };
}

// Convert ArrayBuffer to Base64 URL safe string
function arrayBufferToBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

// Convert Base64 URL safe string to ArrayBuffer
function base64UrlToArrayBuffer(base64url: string): ArrayBuffer {
  const base64 = base64url
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  const paddedBase64 = base64.padEnd(base64.length + (4 - base64.length % 4) % 4, '=');
  const binary = atob(paddedBase64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

export interface WebAuthnRegistrationResult {
  credentialId: string;
  publicKey: string;
  transports: string[];
}

// Register a new WebAuthn credential (biometric)
export async function registerWebAuthnCredential(
  userId: string,
  userEmail: string,
  userName: string
): Promise<WebAuthnRegistrationResult> {
  // Generate a random challenge
  const challenge = new Uint8Array(32);
  crypto.getRandomValues(challenge);
  
  const publicKeyCredentialCreationOptions: PublicKeyCredentialCreationOptions = {
    challenge: challenge.buffer,
    rp: {
      name: 'LifeOS',
      id: window.location.hostname,
    },
    user: {
      id: new TextEncoder().encode(userId),
      name: userEmail,
      displayName: userName || userEmail,
    },
    pubKeyCredParams: [
      { alg: -7, type: 'public-key' },   // ES256
      { alg: -257, type: 'public-key' }, // RS256
    ],
    authenticatorSelection: {
      authenticatorAttachment: 'platform', // Use device's built-in authenticator (fingerprint/face)
      userVerification: 'required',
      residentKey: 'preferred',
    },
    timeout: 60000,
    attestation: 'none',
  };
  
  const credential = await navigator.credentials.create({
    publicKey: publicKeyCredentialCreationOptions,
  }) as PublicKeyCredential;
  
  if (!credential) {
    throw new Error('Failed to create credential');
  }
  
  const response = credential.response as AuthenticatorAttestationResponse;
  
  // Extract the public key from attestation
  const publicKeyBytes = response.getPublicKey();
  if (!publicKeyBytes) {
    throw new Error('Failed to get public key');
  }
  
  return {
    credentialId: arrayBufferToBase64Url(credential.rawId),
    publicKey: arrayBufferToBase64Url(publicKeyBytes),
    transports: response.getTransports?.() || [],
  };
}

export interface WebAuthnAuthResult {
  credentialId: string;
  signature: string;
  authenticatorData: string;
  clientDataJSON: string;
}

// Authenticate with existing WebAuthn credential
export async function authenticateWithWebAuthn(
  allowedCredentialIds: string[]
): Promise<WebAuthnAuthResult> {
  // Generate a random challenge
  const challenge = new Uint8Array(32);
  crypto.getRandomValues(challenge);
  
  const allowCredentials: PublicKeyCredentialDescriptor[] = allowedCredentialIds.map(id => ({
    id: base64UrlToArrayBuffer(id),
    type: 'public-key',
    transports: ['internal'] as AuthenticatorTransport[],
  }));
  
  const publicKeyCredentialRequestOptions: PublicKeyCredentialRequestOptions = {
    challenge: challenge.buffer,
    rpId: window.location.hostname,
    allowCredentials: allowCredentials.length > 0 ? allowCredentials : undefined,
    userVerification: 'required',
    timeout: 60000,
  };
  
  const assertion = await navigator.credentials.get({
    publicKey: publicKeyCredentialRequestOptions,
  }) as PublicKeyCredential;
  
  if (!assertion) {
    throw new Error('Authentication failed');
  }
  
  const response = assertion.response as AuthenticatorAssertionResponse;
  
  return {
    credentialId: arrayBufferToBase64Url(assertion.rawId),
    signature: arrayBufferToBase64Url(response.signature),
    authenticatorData: arrayBufferToBase64Url(response.authenticatorData),
    clientDataJSON: arrayBufferToBase64Url(response.clientDataJSON),
  };
}

// Get stored credential IDs for a user from localStorage (for quick lookup)
export function getStoredCredentialIds(): string[] {
  try {
    const stored = localStorage.getItem('webauthn_credentials');
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

// Store credential ID locally for quick access
export function storeCredentialId(credentialId: string): void {
  const existing = getStoredCredentialIds();
  if (!existing.includes(credentialId)) {
    existing.push(credentialId);
    localStorage.setItem('webauthn_credentials', JSON.stringify(existing));
  }
}

// Store the email associated with biometric login
export function storeBiometricEmail(email: string): void {
  localStorage.setItem('webauthn_email', email);
}

export function getStoredBiometricEmail(): string | null {
  return localStorage.getItem('webauthn_email');
}

// Check if biometric login is available for this device
export function hasBiometricCredentials(): boolean {
  return getStoredCredentialIds().length > 0 && getStoredBiometricEmail() !== null;
}

// Clear biometric data
export function clearBiometricData(): void {
  localStorage.removeItem('webauthn_credentials');
  localStorage.removeItem('webauthn_email');
}
