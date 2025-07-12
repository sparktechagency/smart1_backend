import crypto from 'crypto';

const cryptoToken = () => {
     return crypto.randomBytes(64).toString('hex');
};

// Encrypt function
// Encrypt function
export const encryptUrl = (url: string, secret: string): string => {
     // Ensure the secret is exactly 32 bytes (for AES-256)
     const key = crypto.createHash('sha256').update(String(secret)).digest('base64').substr(0, 32);
     // Create a random IV
     const iv = crypto.randomBytes(16);
     // Create cipher
     const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
     // Encrypt the URL
     let encrypted = cipher.update(url, 'utf8', 'hex');
     encrypted += cipher.final('hex');

     // Combine IV and encrypted data
     return `${iv.toString('hex')}:${encrypted}`;
};
// Decrypt function
export const decryptUrl = (encryptedUrl: string, secret: string): string => {
     // Ensure the secret is exactly 32 bytes (same as for encryption)
     const key = crypto.createHash('sha256').update(String(secret)).digest('base64').substr(0, 32);
     // Split the IV and encrypted data
     const [ivString, encrypted] = encryptedUrl.split(':');
     // Create buffers from the hex strings
     const iv = Buffer.from(ivString, 'hex');
     // Create decipher
     const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
     // Decrypt the URL
     let decrypted = decipher.update(encrypted, 'hex', 'utf8');
     decrypted += decipher.final('utf8');
     return decrypted;
};
export default cryptoToken;
