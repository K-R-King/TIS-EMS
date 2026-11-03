import axios from 'axios';

// The API is served from the same address as the app: in development the React dev server
// forwards /api to the backend ("proxy" in package.json); in Docker, nginx does; on Vercel, a rewrite does.
export const API_URL = process.env.REACT_APP_API_URL || '/api';

// The backend keeps the login in a session cookie, so every request sends cookies
const api = axios.create({ baseURL: API_URL, withCredentials: true });

let onUnauthorized = () => {};

/** Lets the auth provider log the user out when the session has expired. */
export function setUnauthorizedHandler(handler) {
  onUnauthorized = handler;
}

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const url = error.config?.url || '';
    if (error.response?.status === 401 && !url.startsWith('/auth/')) {
      onUnauthorized();
    }
    return Promise.reject(error);
  }
);

/** The server's error message for a failed request, or a generic fallback. */
export function errorMessage(error, fallback = 'Something went wrong. Please try again.') {
  if (!error.response) return 'Cannot reach the server. Is the backend running?';
  return error.response.data?.error || fallback;
}

export default api;
