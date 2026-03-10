/**
 * Cryptographic utilities for End-to-End Encryption (E2EE)
 * Using Web Crypto API for performance and security.
 */

export interface KeyPair {
    publicKey: string;
    privateKey: string;
}

/**
 * Generates a periodic ECDH key pair for the user
 */
export async function generateKeyPair(): Promise<KeyPair> {
    const keyPair = await window.crypto.subtle.generateKey(
        {
            name: 'ECDH',
            namedCurve: 'P-256',
        },
        true, 
        ['deriveKey', 'deriveBits']
    );

    const publicKeyBuffer = await window.crypto.subtle.exportKey('spki', keyPair.publicKey);
    const privateKeyBuffer = await window.crypto.subtle.exportKey('pkcs8', keyPair.privateKey);

    return {
        publicKey: btoa(String.fromCharCode(...new Uint8Array(publicKeyBuffer))),
        privateKey: btoa(String.fromCharCode(...new Uint8Array(privateKeyBuffer))),
    };
}

/**
 * Generates a random AES-GCM key
 */
export async function generateSessionKey(): Promise<CryptoKey> {
    return await window.crypto.subtle.generateKey(
        {
            name: 'AES-GCM',
            length: 256,
        },
        true,
        ['encrypt', 'decrypt']
    );
}

/**
 * Encrypts content using AES-GCM
 */
export async function encryptContent(content: string, key: CryptoKey): Promise<{ ciphertext: string; iv: string }> {
    const enc = new TextEncoder();
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const ciphertextBuffer = await window.crypto.subtle.encrypt(
        {
            name: 'AES-GCM',
            iv: iv,
        },
        key,
        enc.encode(content)
    );

    return {
        ciphertext: btoa(String.fromCharCode(...new Uint8Array(ciphertextBuffer))),
        iv: btoa(String.fromCharCode(...new Uint8Array(iv))),
    };
}

export async function decryptContent(ciphertext: string, iv: string, key: CryptoKey): Promise<string> {
    const dec = new TextDecoder();
    const ciphertextBuffer = new Uint8Array(atob(ciphertext).split('').map(c => c.charCodeAt(0)));
    const ivBuffer = new Uint8Array(atob(iv).split('').map(c => c.charCodeAt(0)));

    const decryptedBuffer = await window.crypto.subtle.decrypt(
        {
            name: 'AES-GCM',
            iv: ivBuffer,
        },
        key,
        ciphertextBuffer
    );

    return dec.decode(decryptedBuffer);
}


export async function deriveSharedSecret(privateKeyBase64: string, publicKeyBase64: string): Promise<CryptoKey> {
    const privateKeyBuffer = new Uint8Array(atob(privateKeyBase64).split('').map(c => c.charCodeAt(0)));
    const publicKeyBuffer = new Uint8Array(atob(publicKeyBase64).split('').map(c => c.charCodeAt(0)));

    const privateKey = await window.crypto.subtle.importKey(
        'pkcs8',
        privateKeyBuffer,
        { name: 'ECDH', namedCurve: 'P-256' },
        false,
        ['deriveKey']
    );

    const publicKey = await window.crypto.subtle.importKey(
        'spki',
        publicKeyBuffer,
        { name: 'ECDH', namedCurve: 'P-256' },
        false,
        []
    );

    return await window.crypto.subtle.deriveKey(
        { name: 'ECDH', public: publicKey },
        privateKey,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
    );
}
