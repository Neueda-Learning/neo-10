import { mockRawDataApi } from './dashboard/rawDataMock.js';

// The UI works immediately in demo mode. Set VITE_DATA_MODE=api when the Spring
// endpoints below are available; components do not need to change.
export const isMockMode = import.meta.env.VITE_DATA_MODE !== 'api';

async function request(path, options = {}) {
  const response = await fetch(path, options);
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload.message || payload.error || 'The request could not be completed.');
    error.status = response.status;
    throw error;
  }
  return payload;
}

const liveApi = {
  uploadFiles(files) {
    const body = new FormData();
    files.forEach((file) => body.append('files', file));
    return request('/api/v1/raw-data/upload', { method: 'POST', body });
  },

  getRawData({ from, to, cardType, page, size }) {
    const params = new URLSearchParams({ from, to, cardType, page: String(page), size: String(size) });
    return request('/api/v1/raw-data?' + params.toString());
  },

  getAnalytics({ from, to, cardType }) {
    const params = new URLSearchParams({ from, to, cardType });
    return request('/api/v1/dashboard/analytics?' + params.toString());
  },

  getProcessedFiles() {
    return request('/api/v1/processed-files');
  },
};

export const api = isMockMode ? mockRawDataApi : liveApi;
