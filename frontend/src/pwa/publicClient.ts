import axios from "axios";

// Deliberately isolated from API's token interceptor. Only anonymous public GETs
// consumed by the public pages are eligible for IndexedDB persistence.
export const publicClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
  timeout: 8000,
  withCredentials: false,
  adapter: "fetch",
  fetchOptions: { credentials: "omit" },
});
