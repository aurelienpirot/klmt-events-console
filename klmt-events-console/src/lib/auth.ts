const encoder = new TextEncoder();

async function getSubtleCryptoKey(secret: string): Promise<CryptoKey> {
  const keyData = encoder.encode(secret);
  return crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

/**
 * Crée une session signée cryptographiquement (HMAC-SHA256).
 * @param expiresInMs Temps d'expiration de la session en millisecondes.
 * @param secret Clé secrète de signature.
 * @returns Le token de session au format base64(payload).signatureHex
 */
export async function createSession(expiresInMs: number, secret: string): Promise<string> {
  const expiresAt = Date.now() + expiresInMs;
  const payloadStr = JSON.stringify({ expiresAt });
  // btoa est disponible dans le runtime Edge (Next.js Middleware) et Node.js moderne
  const payloadBase64 = btoa(payloadStr);
  
  const key = await getSubtleCryptoKey(secret);
  const signatureBuffer = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(payloadBase64)
  );
  
  const hashArray = Array.from(new Uint8Array(signatureBuffer));
  const signatureHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  return `${payloadBase64}.${signatureHex}`;
}

/**
 * Vérifie l'intégrité et la validité temporelle d'une session.
 * @param token Le token de session à vérifier.
 * @param secret Clé secrète de signature.
 * @returns true si la session est valide et non expirée, false sinon.
 */
export async function verifySession(token: string, secret: string): Promise<boolean> {
  try {
    if (!token) return false;
    
    const parts = token.split('.');
    if (parts.length !== 2) return false;
    const [payloadBase64, signatureHex] = parts;
    
    const key = await getSubtleCryptoKey(secret);
    
    const verified = await crypto.subtle.verify(
      'HMAC',
      key,
      hexToUint8Array(signatureHex) as BufferSource,
      encoder.encode(payloadBase64) as BufferSource
    );
    
    if (!verified) return false;
    
    const payloadStr = atob(payloadBase64);
    const { expiresAt } = JSON.parse(payloadStr);
    
    if (typeof expiresAt !== 'number' || Date.now() > expiresAt) {
      return false; // Expire ou format invalide
    }
    
    return true;
  } catch (error) {
    console.error('Error verifying session:', error);
    return false;
  }
}

function hexToUint8Array(hexString: string): Uint8Array {
  const pairs = hexString.match(/[\da-f]{2}/gi) || [];
  const arr = new Uint8Array(pairs.length);
  for (let i = 0; i < pairs.length; i++) {
    arr[i] = parseInt(pairs[i], 16);
  }
  return arr;
}
