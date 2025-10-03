import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;
const ITERATIONS = 100000;
const KEY_LENGTH = 32;

// Get encryption key from environment
function getMasterKey(): Buffer {
    const key = process.env.NEXT_BLOG_ENCRYPTION_KEY;

    if (!key) {
        throw new Error('NEXT_BLOG_ENCRYPTION_KEY environment variable is not set. This is required for secure settings encryption.');
    }

    return Buffer.from(key, 'utf-8');
}

// Derive a key from the master key using PBKDF2
function deriveKey(masterKey: Buffer, salt: Buffer): Buffer {
    return crypto.pbkdf2Sync(masterKey, salt, ITERATIONS, KEY_LENGTH, 'sha256');
}

// Check if a value looks like it's encrypted (base64 with our prefix)
// DEPRECATED: We now rely on the isSecure flag instead of checking the value format
// Keeping this for potential migration/debugging purposes only
function isEncrypted(value: any): boolean {
    // Since encrypted values are always strings with our prefix,
    // non-strings are definitely not encrypted
    if (typeof value !== 'string') {
        return false;
    }

    // Our encrypted values start with a specific prefix
    return value.startsWith('enc:v1:');
}

// Encrypt a value
export function encrypt(value: any): string {
    // Always serialize to JSON for consistent handling
    const plaintext = JSON.stringify(value);

    const masterKey = getMasterKey();

    // Generate random salt and IV
    const salt = crypto.randomBytes(SALT_LENGTH);
    const iv = crypto.randomBytes(IV_LENGTH);

    // Derive key from master key and salt
    const key = deriveKey(masterKey, salt);

    // Create cipher
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    // Encrypt the value
    const encrypted = Buffer.concat([
        cipher.update(plaintext, 'utf8'),
        cipher.final()
    ]);

    // Get the authentication tag
    const tag = cipher.getAuthTag();

    // Combine salt, iv, tag, and encrypted data
    const combined = Buffer.concat([salt, iv, tag, encrypted]);

    // Return as base64 with version prefix
    return `enc:v1:${combined.toString('base64')}`;
}

// Decrypt a value
// Note: Caller should check isSecure flag before calling this function
export function decrypt(encryptedValue: any): any {
    // If the value doesn't look encrypted (safety check), return as is
    // This is a fallback for data integrity, but ideally should not happen
    if (typeof encryptedValue !== 'string' || !encryptedValue.startsWith('enc:v1:')) {
        console.warn('decrypt() called on non-encrypted value. Check isSecure flag before calling.');
        return encryptedValue;
    }

    const masterKey = getMasterKey();

    // Remove prefix and decode from base64
    const combined = Buffer.from(encryptedValue.slice('enc:v1:'.length), 'base64');

    // Extract components
    const salt = combined.slice(0, SALT_LENGTH);
    const iv = combined.slice(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
    const tag = combined.slice(SALT_LENGTH + IV_LENGTH, SALT_LENGTH + IV_LENGTH + TAG_LENGTH);
    const encrypted = combined.slice(SALT_LENGTH + IV_LENGTH + TAG_LENGTH);

    // Derive key from master key and salt
    const key = deriveKey(masterKey, salt);

    // Create decipher
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);

    // Decrypt the value
    const decrypted = decipher.update(encrypted) + decipher.final('utf8');

    // Always parse as JSON since we always stringify before encryption
    return JSON.parse(decrypted);
}

// Check if a setting key should be treated as secure
export function isSecureKey(key: string): boolean {
    const lowerKey = key.toLowerCase();
    const securePatterns = [
        'secret',
        'key',
        'token',
        'password',
        'credential',
        'api_key',
        'apikey',
        'private',
        'auth',
        'access_token',
        'refresh_token',
        'client_secret',
        'webhook_secret'
    ];

    return securePatterns.some(pattern => lowerKey.includes(pattern));
}

// Mask a value for display
export function maskValue(value: any): string {
    return '***';
}