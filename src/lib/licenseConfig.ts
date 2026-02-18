// LifeOS License Configuration
// Integrates with portal.itsupport.com.bd licensing system

export const LICENSE_PORTAL_URL = 'https://portal.itsupport.com.bd';
export const LICENSE_VERIFY_ENDPOINT = `${LICENSE_PORTAL_URL}/verify_license.php`;
export const ENCRYPTION_KEY = 'ITSupportBD_SecureKey_2024';

export interface LicenseInfo {
  licenseKey: string;
  status: 'active' | 'expired' | 'revoked' | 'free' | 'invalid' | 'in_use' | 'not_found';
  maxDevices: number;
  expiresAt: string | null;
  lastVerified: string;
  installationId: string;
  plan: 'basic' | 'standard' | 'professional' | 'unknown';
}

export interface LicenseVerifyResponse {
  success: boolean;
  message: string;
  max_devices?: number;
  actual_status?: string;
  expires_at?: string | null;
}

export const LICENSE_PLANS = [
  {
    id: 'basic' as const,
    name: 'LifeOS Basic',
    price: 'Free',
    maxDevices: 5,
    features: [
      'Up to 5 users',
      'Core modules (Tasks, Notes, Calendar)',
      'Basic budget tracking',
      'Community support',
    ],
  },
  {
    id: 'standard' as const,
    name: 'LifeOS Standard',
    price: '$10/year',
    maxDevices: 20,
    features: [
      'Up to 20 users',
      'All Basic features',
      'Device Inventory Management',
      'Support Ticket System',
      'Family Management',
      'Email notifications',
      'Priority support',
    ],
  },
  {
    id: 'professional' as const,
    name: 'LifeOS Professional',
    price: '$100/year',
    maxDevices: 99999,
    features: [
      'Unlimited users',
      'All Standard features',
      'Advanced Analytics & Reports',
      'Calendar integrations (Google/Microsoft)',
      'Custom branding',
      'API access',
      'Dedicated support',
    ],
  },
];

// Get or generate a unique installation ID for this LifeOS instance
export function getInstallationId(): string {
  let id = localStorage.getItem('lifeos_installation_id');
  if (!id) {
    id = 'LIFEOS-' + crypto.randomUUID();
    localStorage.setItem('lifeos_installation_id', id);
  }
  return id;
}

// Store license info locally
export function saveLicenseInfo(info: LicenseInfo): void {
  localStorage.setItem('lifeos_license', JSON.stringify(info));
}

// Get stored license info
export function getLicenseInfo(): LicenseInfo | null {
  const stored = localStorage.getItem('lifeos_license');
  if (!stored) return null;
  try {
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

// Clear stored license
export function clearLicenseInfo(): void {
  localStorage.removeItem('lifeos_license');
}

// Determine plan from max_devices
export function getPlanFromMaxDevices(maxDevices: number): LicenseInfo['plan'] {
  if (maxDevices <= 5) return 'basic';
  if (maxDevices <= 20) return 'standard';
  return 'professional';
}

// Verify license with the portal (client-side for self-hosted)
export async function verifyLicenseWithPortal(
  licenseKey: string,
  userId: string,
  currentDeviceCount: number = 1
): Promise<LicenseVerifyResponse> {
  const installationId = getInstallationId();

  try {
    const response = await fetch(LICENSE_VERIFY_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        app_license_key: licenseKey,
        user_id: userId,
        current_device_count: currentDeviceCount,
        installation_id: installationId,
      }),
    });

    if (!response.ok) {
      return { success: false, message: 'License server unreachable.' };
    }

    // The response is AES-256-CBC encrypted
    const encryptedText = await response.text();
    
    // For client-side, we'll use the backend proxy to decrypt
    // Or handle it via the self-hosted API
    try {
      const decoded = decryptLicenseResponse(encryptedText);
      return decoded;
    } catch {
      // If decryption fails, try parsing as plain JSON (fallback)
      try {
        return JSON.parse(encryptedText);
      } catch {
        return { success: false, message: 'Failed to process license response.' };
      }
    }
  } catch (error: any) {
    return { success: false, message: error.message || 'Network error verifying license.' };
  }
}

// Client-side AES-256-CBC decryption using Web Crypto API
async function decryptLicenseResponse(encryptedBase64: string): Promise<LicenseVerifyResponse> {
  const encryptedData = Uint8Array.from(atob(encryptedBase64), c => c.charCodeAt(0));
  
  // AES-256-CBC: first 16 bytes = IV, rest = ciphertext
  const ivLength = 16;
  const iv = encryptedData.slice(0, ivLength);
  const ciphertextBase64 = new TextDecoder().decode(encryptedData.slice(ivLength));
  const ciphertext = Uint8Array.from(atob(ciphertextBase64), c => c.charCodeAt(0));

  // Derive key from ENCRYPTION_KEY (must match PHP's openssl_encrypt behavior)
  // PHP uses the key directly padded/truncated to 32 bytes for aes-256-cbc
  const keyBytes = new TextEncoder().encode(ENCRYPTION_KEY.padEnd(32, '\0').slice(0, 32));
  
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyBytes,
    { name: 'AES-CBC' },
    false,
    ['decrypt']
  );

  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-CBC', iv },
    cryptoKey,
    ciphertext
  );

  const jsonStr = new TextDecoder().decode(decrypted);
  // Remove PKCS7 padding artifacts if any trailing characters
  const cleanJson = jsonStr.replace(/[\x00-\x1f]+$/, '');
  return JSON.parse(cleanJson);
}

// Verify license via self-hosted backend proxy (preferred for Docker/XAMPP)
export async function verifyLicenseViaBackend(
  licenseKey: string,
  apiUrl: string = '/api'
): Promise<LicenseVerifyResponse> {
  try {
    const response = await fetch(`${apiUrl}/license/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('lifeos_token') || ''}`,
      },
      body: JSON.stringify({ license_key: licenseKey }),
    });
    return await response.json();
  } catch (error: any) {
    return { success: false, message: error.message || 'Backend license check failed.' };
  }
}
