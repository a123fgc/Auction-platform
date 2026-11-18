import api from './axios';

function toFormData(obj, files = []) {
  const fd = new FormData();
  Object.entries(obj).forEach(([k, v]) => {
    if (v !== undefined && v !== null) fd.append(k, v);
  });
  files.forEach((f) => fd.append('images', f));
  return fd;
}

export const updateProfileApi = (payload, files = []) =>
  api
    .patch('/me/profile', toFormData(payload, files), {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    .then((r) => r.data.user);

export const changePasswordApi = (current_password, new_password) =>
  api
    .patch('/me/password', { current_password, new_password })
    .then((r) => r.data);

export const getPublicProfileApi = (userId) =>
  api.get(`/users/${userId}/profile`).then((r) => r.data.user);