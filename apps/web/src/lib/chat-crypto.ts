/**
 * Campizo — End-to-end chat crypto helpers (WebCrypto API)
 * Messages in random chat are encrypted client-side with AES-256-GCM.
 * The per-conversation key arrives over TLS from the server ONLY at match
 * time and is kept in browser memory (never persisted to disk). The server
 * stores ciphertext only — it cannot decrypt message contents.
 */

export type ChatCryptoKey = string; // base64url-encoded 32-byte AES key

export function generateChatKey(): Promise<ChatCryptoKey> {
  const raw = crypto.getRandomValues(new Uint8Array(32));
  return Promise.resolve(bufferToBase64Url(raw));
}

export async function encryptMessage(
  plaintext: string,
  keyB64Url: ChatCryptoKey
): Promise<{ ciphertext: string; iv: string }> {
  const key = await importKey(keyB64Url);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plaintext);
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv as BufferSource }, key, encoded);
  return {
    ciphertext: bufferToBase64Url(new Uint8Array(encrypted as ArrayBuffer)),
    iv: bufferToBase64Url(iv)
  };
}

export async function decryptMessage(ciphertext: string, iv: string, keyB64Url: ChatCryptoKey): Promise<string> {
  const key = await importKey(keyB64Url);
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: base64ToBytes(iv) as BufferSource },
    key,
    base64ToBytes(ciphertext) as BufferSource
  );
  return new TextDecoder().decode(new Uint8Array(decrypted as ArrayBuffer));
}

async function importKey(keyB64Url: ChatCryptoKey): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    base64ToBytes(keyB64Url) as BufferSource,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export function bufferToBase64Url(buf: Uint8Array): string {
  let binary = '';
  const bytes = buf;
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64ToBytes(b64Url: string): Uint8Array {
  const b64 = b64Url.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}
