import React, { useCallback, useEffect, useState } from 'react';
import { AppShell, Button, SideBrand, SideNav, StatusPill } from './design-system';
import { api, isMockMode } from './api.js';
import DataDashboard from './components/DataDashboard.jsx';

const INITIAL_FILTERS = { from: '2026-01-01', to: '2026-12-31', cardType: 'ALL' };
const ANALYTICS_SCREENS = [
  { id: 'overview', label: 'Overview', hint: 'Status at a glance' },
  { id: 'quarterly', label: 'Quarterly trend', hint: 'Q1 to Q4 outcomes' },
  { id: 'cards', label: 'Card analysis', hint: 'Product mix and outcomes' },
];
const DATA_SCREENS = [
  { id: 'raw-data', label: 'Raw data', hint: 'Filtered records' },
  { id: 'files', label: 'Processed files', hint: 'Import history' },
];

export default function App() {
  const [screen, setScreen] = useState('overview');
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [data, setData] = useState({ rows: [], total: 0, analytics: null });
  const [processed, setProcessed] = useState({ items: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [processedLoading, setProcessedLoading] = useState(true);
  const [error, setError] = useState(null);
  const [processedError, setProcessedError] = useState(null);

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

  const loadProcessedFiles = useCallback(async () => {
    setProcessedLoading(true);
    setProcessedError(null);
    try {
      setProcessed(await api.getProcessedFiles());
    } catch (nextError) {
      setProcessedError(nextError.message || 'Could not load processed files.');
    } finally {
      setProcessedLoading(false);
    }
  }, []);

  useEffect(() => { loadDashboard(filters); }, [filters, loadDashboard]);
  useEffect(() => { loadProcessedFiles(); }, [loadProcessedFiles]);

  async function handleUpload(files) {
    const result = await api.uploadFiles(files);
    await Promise.all([loadDashboard(filters), loadProcessedFiles()]);
    return result;
  }

  return (
    <AppShell
      wide
      side={
        <>
          <SideBrand brand="NEO · DATA" product="Card portfolio dashboard" meta="CSV import · raw data reporting" />
          <div className="csv-side-group">Analytics</div>
          <SideNav items={ANALYTICS_SCREENS} active={screen} onSelect={setScreen} label="Analytics screens" />
          <div className="csv-side-group">Data</div>
          <SideNav items={DATA_SCREENS} active={screen} onSelect={setScreen} label="Data screens" />
          <div className="csv-side-actions">
            <Button variant="primary" block onClick={() => setScreen('files')}>Upload CSV files</Button>
            <StatusPill tone={isMockMode ? 'warning' : 'positive'}>{isMockMode ? 'Demo data mode' : 'API connected'}</StatusPill>
          </div>
        </>
      }
      footer={isMockMode ? 'Front-end demo mode · set VITE_DATA_MODE=api when the backend endpoints are ready' : 'Data is served from raw_data'}
    >
      <DataDashboard
        screen={screen}
        filters={filters}
        onApplyFilters={setFilters}
        onUpload={handleUpload}
        rows={data.rows}
        total={data.total}
        analytics={data.analytics}
        processed={processed}
        loading={loading}
        processedLoading={processedLoading}
        error={error}
        processedError={processedError}
      />
    </AppShell>
  );
}
