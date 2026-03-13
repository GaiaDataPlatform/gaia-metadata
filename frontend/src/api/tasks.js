import api from "./client";

export const getTasks = (cruiseId) => api.get(`/tasks/cruise/${cruiseId}`).then(r => r.data);
export const getActiveTasks = (cruiseId) => api.get(`/tasks/cruise/${cruiseId}/active`).then(r => r.data);
export const startTask = (data) => api.post("/tasks/", data).then(r => r.data);
export const addOperation = (taskId, data) => api.post(`/tasks/${taskId}/operations`, data).then(r => r.data);
export const abortTask = (taskId, notes) => api.post(`/tasks/${taskId}/abort`, { notes }).then(r => r.data);
