import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export const WORLDS = {
  anomaly: {
    key: "anomaly",
    index: "01",
    title: "Design Anomaly",
    titleLines: ["Design", "Anomaly"],
    path: "/anomaly",
    description:
      "Experimental architecture and spatial research. Structures, installations and fragments produced by subtraction, displacement, folding and collision.",
  },
  furniture: {
    key: "furniture",
    index: "02",
    title: "Design Furniture",
    titleLines: ["Design", "Furniture"],
    path: "/furniture",
    description:
      "Objects and furniture understood as small architecture. Each piece records a single design operation — peeling, compression, splitting — made legible in material.",
  },
};

export const getToken = () => localStorage.getItem("editor_token");
export const setToken = (t) => localStorage.setItem("editor_token", t);
export const clearToken = () => localStorage.removeItem("editor_token");
export const authHeaders = () => ({
  headers: { Authorization: `Bearer ${getToken()}` },
});

export const fetchPublished = async (world) => {
  const { data } = await axios.get(`${API}/projects`, {
    params: world ? { world } : {},
  });
  return data;
};

export const fetchProject = async (slug) => {
  const { data } = await axios.get(`${API}/projects/${slug}`);
  return data;
};

export const adminLogin = async (passcode) => {
  const { data } = await axios.post(`${API}/auth/login`, { passcode });
  return data;
};

export const adminVerify = async () => {
  const { data } = await axios.get(`${API}/auth/verify`, authHeaders());
  return data;
};

export const adminFetchAll = async () => {
  const { data } = await axios.get(`${API}/admin/projects`, authHeaders());
  return data;
};

export const adminFetchBySlug = async (slug) => {
  const { data } = await axios.get(
    `${API}/admin/projects/by-slug/${slug}`,
    authHeaders()
  );
  return data;
};

export const adminCreate = async (payload) => {
  const { data } = await axios.post(`${API}/admin/projects`, payload, authHeaders());
  return data;
};

export const adminUpdate = async (id, payload) => {
  const { data } = await axios.put(`${API}/admin/projects/${id}`, payload, authHeaders());
  return data;
};

export const adminDelete = async (id) => {
  const { data } = await axios.delete(`${API}/admin/projects/${id}`, authHeaders());
  return data;
};

export const adminReorder = async (ids) => {
  const { data } = await axios.post(`${API}/admin/projects/reorder`, { ids }, authHeaders());
  return data;
};

export const adminUpload = async (files) => {
  const form = new FormData();
  for (const f of files) form.append("files", f);
  const { data } = await axios.post(`${API}/admin/uploads`, form, authHeaders());
  return data.urls;
};

export const pad = (n) => String(n + 1).padStart(2, "0");
