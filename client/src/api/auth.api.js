import api from "./axios";

export const signupApi = (payload) =>
  api.post("/auth/signup", payload).then((r) => r.data);

export const loginApi = (payload) =>
  api.post("/auth/login", payload).then((r) => r.data);

export const logoutApi = () => api.post("/auth/logout").then((r) => r.data);

export const meApi = () => api.get("/auth/me").then((r) => r.data);
export const forgotPasswordApi = (email) =>
  api.post("/auth/forgot-password", { email }).then((r) => r.data);

export const verifyResetTokenApi = (token) =>
  api
    .get("/auth/reset-password/verify", { params: { token } })
    .then((r) => r.data);

export const resetPasswordApi = (token, new_password) =>
  api.post("/auth/reset-password", { token, new_password }).then((r) => r.data);
