const authService = require('../services/auth.service');
const { asyncHandler } = require('../middleware/errorHandler');
const env = require('../config/env');
const { disconnectUserSockets } = require('../sockets');

const COOKIE_OPTS = {
  httpOnly: true,
  sameSite: env.NODE_ENV === 'production' ? 'none' : 'lax',
  secure: env.NODE_ENV === 'production',
  path: '/',
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

const CLEAR_COOKIE_OPTS = {
  httpOnly: COOKIE_OPTS.httpOnly,
  sameSite: COOKIE_OPTS.sameSite,
  secure: COOKIE_OPTS.secure,
  path: COOKIE_OPTS.path,
};

const signup = asyncHandler(async (req, res) => {
  const { user, token } = await authService.signup(req.body);
  res.cookie(env.COOKIE_NAME, token, COOKIE_OPTS);
  res.status(201).json({ user, token });
});

const login = asyncHandler(async (req, res) => {
  const { user, token } = await authService.login(req.body);
  res.cookie(env.COOKIE_NAME, token, COOKIE_OPTS);
  res.json({ user, token });
});

const logout = asyncHandler(async (req, res) => {
  try {
    await authService.logout(req.user);
    disconnectUserSockets(req.user.id);
  } finally {
    res.clearCookie(env.COOKIE_NAME, CLEAR_COOKIE_OPTS);
  }
  res.json({ message: 'Logged out' });
});

const me = asyncHandler(async (req, res) => {
  const user = await authService.me(req.user.id);
  res.json({ user });
});

module.exports = { signup, login, logout, me };
