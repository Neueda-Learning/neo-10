import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AppShell, Button, Modal, SideBrand, SideNav, StatusPill } from './design-system';
import { api, isMockMode } from './api.js';
import DataDashboard from './components/DataDashboard.jsx';

const INITIAL_FILTERS = { from: '2026-01-01', to: '2026-07-31', productCode: 'ALL', channel: 'ALL' };
const ANALYTICS_SCREENS = [
  { id: 'overview', label: 'Overview', hint: 'Portfolio at a glance' },
  { id: 'journey', label: 'Journey funnel', hint: 'Steps, stops and reasons' },
  { id: 'product-channel', label: 'Product & channel', hint: 'Mix, outcomes and limits' },
  { id: 'credit-risk', label: 'Credit & risk', hint: 'Cohorts and controls' },
];
const DATA_SCREENS = [
  { id: 'raw-data', label: 'Raw data', hint: 'Application records' },
  { id: 'scan-history', label: 'Scan history', hint: 'File processing audit' },
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
  const [actionResult, setActionResult] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const dashboardRequest = useRef(0);
  const processedRequest = useRef(0);

  const loadDashboard = useCallback(async (nextFilters) => {
    const requestId = ++dashboardRequest.current;
    setLoading(true); setError(null);
    try {
      const [raw, analytics] = await Promise.all([api.getRawData({ ...nextFilters, page: 0, size: 50 }), api.getAnalytics(nextFilters)]);
      if (requestId === dashboardRequest.current) setData({ rows: raw.items, total: raw.total, analytics });
    } catch (nextError) {
      if (requestId === dashboardRequest.current) setError(nextError.message || 'Could not load dashboard data.');
    } finally {
      if (requestId === dashboardRequest.current) setLoading(false);
    }
  }, []);

  const loadProcessedFiles = useCallback(async () => {
    const requestId = ++processedRequest.current;
    setProcessedLoading(true); setProcessedError(null);
    try {
      const nextProcessed = await api.getProcessedFiles();
      if (requestId === processedRequest.current) setProcessed(nextProcessed);
    } catch (nextError) {
      if (requestId === processedRequest.current) setProcessedError(nextError.message || 'Could not load scan history.');
    } finally {
      if (requestId === processedRequest.current) setProcessedLoading(false);
    }
  }, []);

  useEffect(() => { loadDashboard(filters); }, [filters, loadDashboard]);
  useEffect(() => { loadProcessedFiles(); }, [loadProcessedFiles]);

  async function scanFolder() {
    setScanning(true); setActionResult(null); setScreen('scan-history');
    try { setActionResult({ type: 'scan', payload: await api.scanFiles() }); await Promise.all([loadDashboard(filters), loadProcessedFiles()]); }
    catch (nextError) { setActionResult({ type: 'error', message: nextError.message }); }
    finally { setScanning(false); }
  }

  async function resetData() {
    setResetting(true); setActionResult(null);
    try {
      const payload = await api.resetData();
      // Clear the browser state immediately after the server confirms the reset.
      // The following reload then verifies the database is empty. Request IDs in
      // the loaders prevent an older in-flight response from restoring stale rows.
      setData({ rows: [], total: 0, analytics: null });
      setProcessed({ items: [], total: 0 });
      setActionResult({ type: 'reset', payload });
      setResetOpen(false);
      setScreen('overview');
      await Promise.all([loadDashboard(filters), loadProcessedFiles()]);
    }
    catch (nextError) { setActionResult({ type: 'error', message: nextError.message }); setResetOpen(false); }
    finally { setResetting(false); }
  }

  return <>
    <AppShell wide side={<>
      <SideBrand brand="NEO · DATA" product="Portfolio analytics" meta="Daily application journey feed" />
      <div className="csv-side-group">Analytics</div>
      <SideNav items={ANALYTICS_SCREENS} active={screen} onSelect={setScreen} label="Analytics screens" />
      <div className="csv-side-group">Data</div>
      <SideNav items={DATA_SCREENS} active={screen} onSelect={setScreen} label="Data screens" />
      <div className="csv-side-group">Actions</div>
      <div className="csv-side-actions">
        <Button variant="primary" block onClick={scanFolder} busy={scanning} busyLabel="Scanning folder">Scan folder</Button>
        <Button variant="danger" block onClick={() => setResetOpen(true)} disabled={scanning}>Reset data</Button>
        <StatusPill tone={isMockMode ? 'warning' : 'positive'}>{isMockMode ? 'Demo data mode' : 'API connected'}</StatusPill>
      </div>
    </>} footer={isMockMode ? 'Front-end demo mode · Docker uses the live API' : 'Dashboard data is served from imported application records'}>
      <DataDashboard screen={screen} filters={filters} onApplyFilters={setFilters} rows={data.rows} total={data.total}
        analytics={data.analytics} processed={processed} loading={loading} processedLoading={processedLoading}
        error={error} processedError={processedError} actionResult={actionResult} />
    </AppShell>
    <Modal open={resetOpen} title="Reset all business data?" onClose={() => !resetting && setResetOpen(false)} footer={<><Button onClick={() => setResetOpen(false)} disabled={resetting}>Cancel</Button><Button variant="danger" onClick={resetData} busy={resetting} busyLabel="Resetting data">Reset all business data</Button></>}>
      <p>This permanently deletes imported applications, file-processing history and demonstration records. Database migration history and CSV source files are not deleted, so the next scan can import the folder again.</p>
    </Modal>
  </>;
}
