const authService = require('../services/auth.service');
const { asyncHandler } = require('../middleware/errorHandler');
const env = require('../config/env');

const COOKIE_OPTS = {
  httpOnly: true,
  sameSite: 'lax',
  secure: env.NODE_ENV === 'production',
  maxAge: 7 * 24 * 60 * 60 * 1000,
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
  res.clearCookie(env.COOKIE_NAME);
  res.json({ message: 'Logged out' });
});

const me = asyncHandler(async (req, res) => {
  const user = await authService.me(req.user.id);
  res.json({ user });
});

module.exports = { signup, login, logout, me };