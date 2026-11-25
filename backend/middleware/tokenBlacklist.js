const revokedTokens = new Set();

export function revokeToken(jti) {
  if (jti) revokedTokens.add(jti);
}

export function isTokenRevoked(jti) {
  return !!jti && revokedTokens.has(jti);
}
