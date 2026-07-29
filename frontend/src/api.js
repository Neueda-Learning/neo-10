import { mockRawDataApi } from './dashboard/rawDataMock.js';

export const isMockMode = import.meta.env.VITE_DATA_MODE === 'mock';
const API_BASE = import.meta.env.VITE_API_BASE || '';

async function request(path, options = {}) {
  const { headers, ...requestOptions } = options;
  const response = await fetch(API_BASE + path, {
    cache: 'no-store',
    ...requestOptions,
    headers: { Accept: 'application/json', ...(headers ?? {}) },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload.message || payload.error || 'The request could not be completed.');
    error.status = response.status;
    throw error;
  }
  return payload;
}

const paramsFor = ({ from, to, productCode, channel, page, size }) => new URLSearchParams({
  ...(from ? { from } : {}), ...(to ? { to } : {}), productCode: productCode || 'ALL', channel: channel || 'ALL',
  ...(page != null ? { page: String(page) } : {}), ...(size != null ? { size: String(size) } : {}),
});

const liveApi = {
  scanFiles: () => request('/api/v1/files/scan', { method: 'POST' }),
  resetData: () => request('/api/v1/data/reset', { method: 'DELETE' }),
  getRawData(filters) { return request('/api/v1/raw-data?' + paramsFor(filters)); },
  getAnalytics(filters) { return request('/api/v1/dashboard/analytics?' + paramsFor(filters)); },
  getProcessedFiles: () => request('/api/v1/processed-files'),
};

export const api = isMockMode ? mockRawDataApi : liveApi;
