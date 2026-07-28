import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AppShell, Button, SideBrand, SideNav, StatusPill } from './design-system';
import { api } from './api.js';
import { DEFAULT_RANGE } from './dashboard/constants.js';
import OutcomeSummaryScreen from './components/OutcomeSummaryScreen.jsx';
import FunnelDeclineScreen from './components/FunnelDeclineScreen.jsx';
import RegulatoryExtractScreen from './components/RegulatoryExtractScreen.jsx';
import SnapshotWorkspaceScreen from './components/SnapshotWorkspaceScreen.jsx';
import DefinitionsScreen from './components/DefinitionsScreen.jsx';

const SCREENS = [
  { id: 'summary', label: 'Outcome summary' },
  { id: 'funnel', label: 'Funnel & decline reasons' },
  { id: 'extract', label: 'Regulatory extract' },
  { id: 'snapshots', label: 'Snapshots & drill' },
  { id: 'definitions', label: 'Counting definitions' },
];

export default function App() {
  const [screen, setScreen] = useState('summary');
  const [range, setRange] = useState(DEFAULT_RANGE);
  const [snapshots, setSnapshots] = useState([]);
  const [snapshotTotal, setSnapshotTotal] = useState(0);
  const [selectionMode, setSelectionMode] = useState('latest');
  const [selectedSnapshotId, setSelectedSnapshotId] = useState(null);
  const [snapshot, setSnapshot] = useState(null);
  const [availability, setAvailability] = useState('loading');
  const [contextError, setContextError] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [analyticsError, setAnalyticsError] = useState(null);
  const [takingSnapshot, setTakingSnapshot] = useState(false);
  const [takeError, setTakeError] = useState(null);
  const [definitions, setDefinitions] = useState([]);
  const [definitionsLoading, setDefinitionsLoading] = useState(true);
  const [definitionsError, setDefinitionsError] = useState(null);
  const [health, setHealth] = useState(null);
  const [info, setInfo] = useState(null);
  const contextRequestRef = useRef(0);
  const analyticsRequestRef = useRef(0);
  const takeRequestRef = useRef(false);

  const loadSnapshotIndex = useCallback(async () => {
    const result = await api.listSnapshots({ limit: 10 });
    setSnapshots(result.items);
    setSnapshotTotal(result.total);
    return result;
  }, []);

  const resolveContext = useCallback(async (nextRange, snapshotId) => {
    const requestId = ++contextRequestRef.current;
    setAvailability('loading');
    setSnapshot(null);
    setContextError(null);
    setAnalytics(null);
    setAnalyticsError(null);
    try {
      const resolved = await api.resolveSnapshot({ range: nextRange, snapshotId });
      if (requestId !== contextRequestRef.current) return;
      if (!resolved) {
        setSnapshot(null);
        setAvailability('no-snapshot');
        return;
      }
      setSnapshot(resolved);
      setAvailability('available');
    } catch (error) {
      if (requestId !== contextRequestRef.current) return;
      setSnapshot(null);
      if (error.status === 404) {
        setSelectionMode('latest');
        setSelectedSnapshotId(null);
        setAvailability('no-snapshot');
        setContextError('The selected snapshot no longer exists. Choose a current history record.');
        return;
      }
      if (error.status === 409) {
        setAvailability('no-snapshot');
        setContextError(error.message);
        return;
      }
      setAvailability('error');
      setContextError(error.message);
    }
  }, []);

  useEffect(() => {
    Promise.all([api.health(), api.info(), loadSnapshotIndex()])
      .then(([nextHealth, nextInfo]) => {
        setHealth(nextHealth);
        setInfo(nextInfo);
      })
      .catch(() => setHealth(null));
    api
      .listDefinitions()
      .then((items) => {
        setDefinitions(items);
        setDefinitionsError(null);
      })
      .catch((error) => setDefinitionsError(error.message))
      .finally(() => setDefinitionsLoading(false));
  }, [loadSnapshotIndex]);

  useEffect(() => {
    resolveContext(range, selectedSnapshotId);
  }, [range, selectedSnapshotId, resolveContext]);

  useEffect(() => {
    if (availability !== 'available' || !snapshot) return;
    const requestId = ++analyticsRequestRef.current;
    let cancelled = false;
    setAnalytics(null);
    setAnalyticsError(null);
    Promise.all([
      api.getSummary({ range, snapshotId: snapshot.snapshotId }),
      api.getFunnel({ range, snapshotId: snapshot.snapshotId }),
      api.getDeclineReasons({ range, snapshotId: snapshot.snapshotId }),
      api.getExtractMeta({ range, snapshotId: snapshot.snapshotId }),
    ])
      .then(([summary, funnel, declineReasons, extractMeta]) => {
        if (!cancelled && requestId === analyticsRequestRef.current) {
          setAnalytics({ summary, funnel, declineReasons, extractMeta });
          setAnalyticsError(null);
        }
      })
      .catch((error) => {
        if (cancelled || requestId !== analyticsRequestRef.current) return;
        setAnalytics(null);
        if (error.status === 404) {
          setSnapshot(null);
          setSelectionMode('latest');
          setSelectedSnapshotId(null);
          setAvailability('no-snapshot');
          setContextError('The selected snapshot no longer exists. Choose a current history record.');
          return;
        }
        if (error.status === 409) {
          setSnapshot(null);
          setSelectionMode('latest');
          setSelectedSnapshotId(null);
          setAvailability('no-snapshot');
          setContextError(error.message);
          return;
        }
        setAvailability('error');
        setAnalyticsError(error.message);
      });
    return () => {
      cancelled = true;
    };
  }, [availability, range.from, range.to, snapshot?.snapshotId]);

  function invalidateAnalyticsContext() {
    contextRequestRef.current += 1;
    analyticsRequestRef.current += 1;
    setSnapshot(null);
    setAvailability('loading');
    setContextError(null);
    setAnalytics(null);
    setAnalyticsError(null);
  }

  function applyRange(nextRange) {
    invalidateAnalyticsContext();
    setTakeError(null);
    setSelectionMode('latest');
    setSelectedSnapshotId(null);
    setRange(nextRange);
  }

  function selectSnapshot(snapshotId) {
    if (!snapshotId) {
      invalidateAnalyticsContext();
      setTakeError(null);
      setSelectionMode('latest');
      setSelectedSnapshotId(null);
      return;
    }
    const selected = snapshots.find((item) => item.snapshotId === snapshotId);
    if (selected) {
      invalidateAnalyticsContext();
      setTakeError(null);
      setRange(selected.range);
      setSelectionMode('pinned');
      setSelectedSnapshotId(snapshotId);
    }
  }

  async function takeSnapshot() {
    if (takeRequestRef.current) return;
    takeRequestRef.current = true;
    setTakingSnapshot(true);
    setTakeError(null);
    try {
      const created = await api.createSnapshot({ range });
      await loadSnapshotIndex();
      invalidateAnalyticsContext();
      setSelectionMode('pinned');
      setSelectedSnapshotId(created.snapshotId);
    } catch (error) {
      setTakeError(error.message);
    } finally {
      takeRequestRef.current = false;
      setTakingSnapshot(false);
    }
  }

  async function downloadExtract() {
    if (availability !== 'available' || !snapshot || !analytics?.extractMeta) {
      const error = new Error('Take a snapshot first.');
      error.status = 409;
      throw error;
    }
    return api.downloadExtract({ range, snapshotId: snapshot.snapshotId });
  }

  const context = {
    range,
    snapshot,
    selectionMode,
    availability,
    error: contextError || analyticsError,
    takeError,
  };

  const up = health?.status === 'UP';
  const commonProps = {
    context,
    snapshots,
    onApplyRange: applyRange,
    onSelectSnapshot: selectSnapshot,
    onTakeSnapshot: takeSnapshot,
    takingSnapshot,
  };

  return (
    <AppShell
      wide
      side={
        <>
          <SideBrand
            brand={info?.team ?? 'Team 10'}
            product={info?.service ?? 'Portfolio & Regulatory Analytics'}
            meta={info ? info.serviceId + ' · ' + info.domain : 'neo-10 · analytics'}
          />
          <SideNav items={SCREENS} active={screen} onSelect={setScreen} />
          <div className="app-side-status">
            <StatusPill tone={up ? 'positive' : 'neutral'}>{up ? 'Mock API ready' : 'Starting'}</StatusPill>
            <Button variant="ghost" size="sm" onClick={() => loadSnapshotIndex()}>
              Reload history
            </Button>
          </div>
        </>
      }
      footer="Module 10 of 10 · analytics answers are served from frozen snapshots · front-end mock mode"
    >
      {screen === 'summary' && (
        <OutcomeSummaryScreen
          {...commonProps}
          analytics={analytics}
          onOpenSnapshots={() => setScreen('snapshots')}
        />
      )}
      {screen === 'funnel' && <FunnelDeclineScreen {...commonProps} analytics={analytics} />}
      {screen === 'extract' && (
        <RegulatoryExtractScreen {...commonProps} extractMeta={analytics?.extractMeta} onDownload={downloadExtract} />
      )}
      {screen === 'snapshots' && (
        <SnapshotWorkspaceScreen
          {...commonProps}
          snapshotTotal={snapshotTotal}
          selectedSnapshot={snapshot}
          api={api}
        />
      )}
      {screen === 'definitions' && (
        <DefinitionsScreen definitions={definitions} loading={definitionsLoading} error={definitionsError} />
      )}
    </AppShell>
  );
}
