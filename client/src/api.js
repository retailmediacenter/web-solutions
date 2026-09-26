// The public API base is injected at build time by the selected Render environment.
// Keeping it explicit prevents a staging build from accidentally using production.
export const apiBaseUrl=(import.meta.env.VITE_API_BASE_URL||'').replace(/\/$/,'');
export const apiUrl=path=>apiBaseUrl+path;
