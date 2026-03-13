import api from "./client";

export const getInstruments = () => api.get("/instruments/").then(r => r.data);
export const getAllInstruments = () => api.get("/instruments/all").then(r => r.data);
export const getInstrument = (id) => api.get(`/instruments/${id}`).then(r => r.data);
export const createInstrument = (data) => api.post("/instruments/", data).then(r => r.data);
export const updateInstrument = (id, data) => api.patch(`/instruments/${id}`, data).then(r => r.data);
export const deleteInstrument = (id) => api.delete(`/instruments/${id}`);
export const addOperation = (catId, data) => api.post(`/instruments/${catId}/operations`, data).then(r => r.data);
export const updateOperation = (catId, opId, data) => api.patch(`/instruments/${catId}/operations/${opId}`, data).then(r => r.data);
export const deleteOperation = (catId, opId) => api.delete(`/instruments/${catId}/operations/${opId}`);
