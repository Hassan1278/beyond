import * as ExpoCrypto from 'expo-crypto';

/** Supabase's native PKCE must use native random bytes and SHA-256. */
const current = globalThis.crypto;
if (!current?.getRandomValues || !current?.subtle?.digest) {
  const getRandomValues = ExpoCrypto.getRandomValues;
  const digest = async (
    algorithm: AlgorithmIdentifier,
    data: BufferSource,
  ): Promise<ArrayBuffer> => {
    if ((typeof algorithm === 'string' ? algorithm : algorithm.name) !== 'SHA-256')
      throw new Error('Unsupported digest.');
    return ExpoCrypto.digest(ExpoCrypto.CryptoDigestAlgorithm.SHA256, data);
  };
  Object.defineProperty(globalThis, 'crypto', {
    configurable: true,
    value: { getRandomValues, randomUUID: ExpoCrypto.randomUUID, subtle: { digest } },
  });
}
