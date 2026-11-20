const AUTH_TOKEN_KEY = 'auction_token';

export function getAuthToken() {
  return null;
}

export function saveAuthToken(token) {
  void token;
  clearAuthToken();
}

export function clearAuthToken() {
  try {
    window.localStorage.removeItem(AUTH_TOKEN_KEY);
  } catch {
    // Cookie auth remains available if browser storage is disabled.
  }
}
