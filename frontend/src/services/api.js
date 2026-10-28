import axios from 'axios';

// Backend URL — Vercel/Netlify par VITE_API_BASE_URL set karo.
const API_BASE_URL =
  (import.meta.env && import.meta.env.VITE_API_BASE_URL) || 'http://127.0.0.1:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('leads_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// public
export const submitLead = async (payload) => (await api.post('/api/leads', payload)).data;

// admin
export const loginAdmin = async (email, password) => {
  const res = await api.post('/api/admin/login', { email, password });
  const token = res.data?.data?.token;
  if (token) localStorage.setItem('leads_token', token);
  return res.data;
};

export const logoutAdmin = () => localStorage.removeItem('leads_token');
export const isLoggedIn = () => Boolean(localStorage.getItem('leads_token'));

export const getLeads = async (params = {}) => (await api.get('/api/leads', { params })).data;
export const getLeadStats = async () => (await api.get('/api/leads/stats')).data;
export const updateLeadStatus = async (id, status) =>
  (await api.patch(`/api/leads/${id}`, { status })).data;

export const downloadLeadsCsv = async () => {
  const res = await api.get('/api/leads/export.csv', { responseType: 'blob' });
  const url = window.URL.createObjectURL(new Blob([res.data], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `leads-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

export default api;
