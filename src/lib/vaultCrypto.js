import { argon2id } from 'hash-wasm'

const ARGON2_MEM = 46 * 1024  // 46 MiB en KiB
const ARGON2_TIME = 2
const ARGON2_PARALLELISM = 1
const HASH_LEN = 32

function b64encode(buf) {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf)
  let str = ''
  for (let i = 0; i < bytes.length; i++) str += String.fromCharCode(bytes[i])
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

function b64decode(str) {
  str = str.replace(/-/g, '+').replace(/_/g, '/')
  while (str.length % 4) str += '='
  const bin = atob(str)
  const buf = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i)
  return buf
}

/** Genera 16 bytes aleatorios codificados en base64url (salt para Argon2). */
export function generateSalt() {
  return b64encode(crypto.getRandomValues(new Uint8Array(16)))
}

/** Genera un DEK aleatorio de 32 bytes. */
export function generateDEK() {
  return crypto.getRandomValues(new Uint8Array(32))
}

/**
 * Deriva la KEK desde la contraseña maestra y el salt usando Argon2id.
 * ~3-4 s en móvil mid-range con los parámetros definidos.
 * @returns {Promise<Uint8Array>} 32 bytes (KEK)
 */
export async function deriveKEK(masterPassword, saltB64) {
  const salt = b64decode(saltB64)
  const hash = await argon2id({
    password: masterPassword,
    salt,
    iterations: ARGON2_TIME,
    memorySize: ARGON2_MEM,
    parallelism: ARGON2_PARALLELISM,
    hashLength: HASH_LEN,
    outputType: 'binary',
  })
  return hash
}

async function importAESKey(rawKey) {
  return crypto.subtle.importKey('raw', rawKey, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt'])
}

/**
 * Envuelve el DEK con la KEK usando AES-256-GCM.
 * @returns {Promise<string>} base64url(nonce[12] + ciphertext)
 */
export async function wrapDEK(kekRaw, dekRaw) {
  const kek = await importAESKey(kekRaw)
  const nonce = crypto.getRandomValues(new Uint8Array(12))
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, kek, dekRaw)
  const out = new Uint8Array(12 + ct.byteLength)
  out.set(nonce)
  out.set(new Uint8Array(ct), 12)
  return b64encode(out)
}

/**
 * Desenvuelve el DEK. Lanza Error('Contraseña incorrecta.') si la KEK no coincide
 * (AES-GCM autentica el ciphertext — falla silenciosamente si la clave es incorrecta).
 * @returns {Promise<Uint8Array>} 32 bytes (DEK)
 */
export async function unwrapDEK(kekRaw, wrappedB64) {
  const kek = await importAESKey(kekRaw)
  const wrapped = b64decode(wrappedB64)
  const nonce = wrapped.slice(0, 12)
  const ct = wrapped.slice(12)
  try {
    const dek = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: nonce }, kek, ct)
    return new Uint8Array(dek)
  } catch {
    throw new Error('Contraseña incorrecta.')
  }
}

/**
 * Cifra un objeto plano con el DEK.
 * @returns {Promise<string>} base64url(nonce[12] + ciphertext)
 */
export async function encryptItem(dekRaw, plainObj) {
  const dek = await importAESKey(dekRaw)
  const nonce = crypto.getRandomValues(new Uint8Array(12))
  const data = new TextEncoder().encode(JSON.stringify(plainObj))
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, dek, data)
  const out = new Uint8Array(12 + ct.byteLength)
  out.set(nonce)
  out.set(new Uint8Array(ct), 12)
  return b64encode(out)
}

/**
 * Descifra un item cifrado con el DEK.
 * @returns {Promise<object>} objeto plano del item
 */
export async function decryptItem(dekRaw, ciphertextB64) {
  const dek = await importAESKey(dekRaw)
  const ct = b64decode(ciphertextB64)
  const nonce = ct.slice(0, 12)
  const data = ct.slice(12)
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: nonce }, dek, data)
  return JSON.parse(new TextDecoder().decode(plain))
}
