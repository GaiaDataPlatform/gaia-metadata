import api from "./client";

export const getCruises = () => api.get("/cruises/").then(r => r.data);
export const getActiveCruise = () => api.get("/cruises/active").then(r => r.data);
export const getCruise = (id) => api.get(`/cruises/${id}`).then(r => r.data);
export const createCruise = (data) => api.post("/cruises/", data).then(r => r.data);
export const updateCruise = (id, data) => api.patch(`/cruises/${id}`, data).then(r => r.data);
export const deleteCruise = (id) => api.delete(`/cruises/${id}`);
export const activateCruise = (id) => api.post(`/cruises/${id}/activate`).then(r => r.data);
export const completeCruise = (id) => api.post(`/cruises/${id}/complete`).then(r => r.data);

export const importCruisesCSV = (file) => {
  const form = new FormData();
  form.append("file", file);
  return api.post("/cruises/import/csv", form).then(r => r.data);
};

// Authenticated downloads — use axios (carries JWT) then trigger browser save
const _download = async (url, filename) => {
  const res = await api.get(url, { responseType: "blob" });
  const href = URL.createObjectURL(res.data);
  const a = document.createElement("a");
  a.href = href;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(href);
};

export const exportCruiseCSV  = (id) => _download(`/cruises/${id}/export/csv`,  `cruise_${id}_tasks.csv`);
export const exportCruiseJSON = (id) => _download(`/cruises/${id}/export/json`, `cruise_${id}.json`);
