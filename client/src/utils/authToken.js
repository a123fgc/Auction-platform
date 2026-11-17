const AUTH_TOKEN_KEY = 'auction_token';

export function getAuthToken() {
  try {
    return window.localStorage.getItem(AUTH_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function saveAuthToken(token) {
  try {
    if (token) window.localStorage.setItem(AUTH_TOKEN_KEY, token);
    else window.localStorage.removeItem(AUTH_TOKEN_KEY);
  } catch {
    // Cookie auth remains available if browser storage is disabled.
  }
}

export function clearAuthToken() {
  saveAuthToken(null);
}
