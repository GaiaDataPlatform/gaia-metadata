import api from "./client";

export const login = async (username, password) => {
  const form = new URLSearchParams({ username, password });
  const res = await api.post("/auth/token", form, {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });
  return res.data;
};

export const getMe = () => api.get("/auth/me").then((r) => r.data);
