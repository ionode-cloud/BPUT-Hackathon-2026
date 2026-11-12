/**
 * Dynamic API Configuration Helper
 * Automatically handles routing to production backend (https://sustainable.api.ionode.cloud)
 * or local development backend (http://localhost:5011).
 */

export function getBackendBaseUrl() {
  const envBackend = import.meta.env?.VITE_BACKEND_URL;
  
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    // Production cloud domain: always talk to the API subdomain
    if (host.includes('ionode.cloud')) {
      return 'https://sustainable.api.ionode.cloud';
    }
    // Localhost development
    if (host === 'localhost' || host === '127.0.0.1') {
      return envBackend && envBackend.includes('localhost') ? envBackend.replace(/\/+$/, '') : 'http://localhost:5011';
    }
    // Custom LAN or IP deployment
    return `${window.location.protocol}//${host}:5011`;
  }

  if (envBackend && /^https?:\/\//i.test(envBackend)) {
    return envBackend.replace(/\/+$/, '');
  }

  return 'https://sustainable.api.ionode.cloud';
}

export function apiRoute(subPath = '') {
  const base = getBackendBaseUrl();
  const cleanPath = subPath.startsWith('/') ? subPath : `/${subPath}`;
  return `${base}${cleanPath}`;
}

