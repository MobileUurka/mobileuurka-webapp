// utils/encryption.ts

import CryptoJS from 'crypto-js';

class EncryptionService {
  private encryptionKey: string | null = null;

  setKey(key: string) {
    this.encryptionKey = key;
  }

  getKey(): string | null {
    return this.encryptionKey;
  }

  clearKey() {
    this.encryptionKey = null;
  }

  hasKey(): boolean {
    return !!this.encryptionKey;
  }

  encrypt(data: string): string {
    if (!this.encryptionKey) {
      console.error('Encryption key not set');
      return data;
    }

    try {
      return CryptoJS.AES.encrypt(data, this.encryptionKey).toString();
    } catch (error) {
      console.error('Encryption failed:', error);
      return data;
    }
  }

  decrypt(encryptedData: string): string {
    if (!this.encryptionKey) {
      console.error('Encryption key not set');
      return '';
    }

    try {
      const bytes = CryptoJS.AES.decrypt(encryptedData, this.encryptionKey);
      return bytes.toString(CryptoJS.enc.Utf8);
    } catch (error) {
      console.error('Decryption failed:', error);
      return '';
    }
  }

  // Optional: Hash for verification
  hash(data: string): string {
    return CryptoJS.SHA256(data).toString();
  }
}

// Export singleton instance
export const encryption = new EncryptionService();