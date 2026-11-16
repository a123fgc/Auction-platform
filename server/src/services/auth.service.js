const bcrypt = require('bcryptjs');
const userRepo = require('../db/repositories/user.repo');
const { signToken } = require('../utils/jwt');
const ApiError = require('../utils/ApiError');

const BCRYPT_ROUNDS = 10;

async function signup({ email, password, full_name, role }) {
  if (!['buyer', 'seller'].includes(role)) {
    throw ApiError.badRequest('Role must be buyer or seller');
  }

  const existing = await userRepo.findByEmail(email);
  if (existing) throw ApiError.conflict('Email already registered');

  const password_hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const user = await userRepo.create({
    email: email.toLowerCase().trim(),
    password_hash,
    full_name: full_name.trim(),
    role,
  });

  const token = signToken({ sub: user.id, role: user.role });
  return { user, token };
}

async function login({ email, password }) {
  const user = await userRepo.findByEmail(email);
  if (!user) throw ApiError.unauthorized('Invalid email or password');
  if (user.is_suspended) throw ApiError.forbidden('Account suspended');

  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) throw ApiError.unauthorized('Invalid email or password');

  const token = signToken({ sub: user.id, role: user.role });
  return {
    user: {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      role: user.role,
    },
    token,
  };
}

async function me(userId) {
  const user = await userRepo.findById(userId);
  if (!user) throw ApiError.notFound('User not found');
  return user;
}

module.exports = { signup, login, me };