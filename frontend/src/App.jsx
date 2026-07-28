import React, { useCallback, useEffect, useState } from 'react';
import { AppShell, SideBrand, StatusPill } from './design-system';
import { api, isMockMode } from './api.js';
import CsvUploadPanel from './components/CsvUploadPanel.jsx';
import DataDashboard from './components/DataDashboard.jsx';

const INITIAL_FILTERS = {
  from: '2026-01-01',
  to: '2026-12-31',
  cardType: 'ALL',
};

export default function App() {
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [data, setData] = useState({ rows: [], total: 0, analytics: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadDashboard = useCallback(async (nextFilters) => {
    setLoading(true);
    setError(null);
    try {
      const [rawData, analytics] = await Promise.all([
        api.getRawData({ ...nextFilters, page: 0, size: 50 }),
        api.getAnalytics(nextFilters),
      ]);
      setData({ rows: rawData.items, total: rawData.total, analytics });
    } catch (nextError) {
      setError(nextError.message || 'Could not load dashboard data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard(filters);
  }, [filters, loadDashboard]);

  function applyFilters(nextFilters) {
    setFilters(nextFilters);
  }

  async function handleUpload(files) {
    const result = await api.uploadFiles(files);
    await loadDashboard(filters);
    return result;
  }

  return (
    <AppShell
      wide
      side={
        <>
          <SideBrand
            brand="NEO · DATA"
            product="Card portfolio dashboard"
            meta="CSV import · raw data reporting"
          />
          <div className="csv-side-context">
            <StatusPill tone={isMockMode ? 'warning' : 'positive'}>
              {isMockMode ? 'Demo data mode' : 'API connected'}
            </StatusPill>
            <p>
              Upload CSV files, then analyse the records stored in <code>raw_data</code>.
            </p>
          </div>
        </>
      }
      footer={isMockMode ? 'Front-end demo mode · set VITE_DATA_MODE=api when the backend endpoints are ready' : 'Data is served from raw_data'}
    >
      <CsvUploadPanel onUpload={handleUpload} />
      <DataDashboard
        filters={filters}
        onApplyFilters={applyFilters}
        rows={data.rows}
        total={data.total}
        analytics={data.analytics}
        loading={loading}
        error={error}
      />
    </AppShell>
  );
}
