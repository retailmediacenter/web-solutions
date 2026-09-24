// Vite proxy handles /api in local development. The public Render URL is not a secret.
// Override with VITE_API_BASE_URL when deploying to another API environment.
const defaultProductionApi='https://rmc-web-solutions-api.onrender.com';
export const apiBaseUrl=(import.meta.env.VITE_API_BASE_URL||(import.meta.env.PROD?defaultProductionApi:'')).replace(/\/$/,'');
export const apiUrl=path=>apiBaseUrl+path;
