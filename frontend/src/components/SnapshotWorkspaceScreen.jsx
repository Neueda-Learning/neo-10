import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Badge,
  Button,
  Card,
  DataTable,
  EmptyState,
  KeyValue,
  PageHeader,
  SearchInput,
  Section,
  Select,
  Split,
  StatusPill,
  Tag,
  Toolbar,
} from '../design-system';
import { STATUS_FILTERS } from '../dashboard/constants.js';
import { formatApr, formatHours, formatMoney, formatRange, formatUtc } from '../dashboard/format.js';
import { snapshotTone, statusTone } from '../status.js';
import AnalyticsContextBar from './AnalyticsContextBar.jsx';

export default function SnapshotWorkspaceScreen({
  context,
  snapshots,
  snapshotTotal,
  selectedSnapshot,
  takingSnapshot,
  onTakeSnapshot,
  onSelectSnapshot,
  onApplyRange,
  api,
}) {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('All');
  const [drill, setDrill] = useState({ rows: [], total: 0, searched: false, loading: false, error: null });
  const [names, setNames] = useState({});
  const [hydrationNotice, setHydrationNotice] = useState(null);
  const drillRequestRef = useRef(0);

  useEffect(() => {
    drillRequestRef.current += 1;
    setDrill({ rows: [], total: 0, searched: false, loading: false, error: null });
    setNames({});
    setHydrationNotice(null);
  }, [selectedSnapshot?.snapshotId]);

  const historyColumns = [
    { key: 'snapshotId', header: 'Snapshot ID', render: (row) => <Tag>{row.snapshotId}</Tag> },
    { key: 'takenAt', header: 'Taken at', render: (row) => formatUtc(row.takenAt) },
    { key: 'range', header: 'Period', render: (row) => formatRange(row.range) },
    { key: 'rowCount', header: 'Rows', numeric: true },
    { key: 'source', header: 'Source', render: (row) => <StatusPill tone={snapshotTone(row.source)}>{row.source}</StatusPill> },
    { key: 'servedCount', header: 'Served', numeric: true },
  ];

  const drillRows = useMemo(
    () =>
      drill.rows.map((row) => ({
        ...row,
        applicantName: names[row.applicationId] ?? '—',
      })),
    [drill.rows, names]
  );

  const drillColumns = [
    { key: 'applicationId', header: 'Application ID', mono: true },
    { key: 'applicantName', header: 'Applicant name' },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <Badge tone={statusTone(row.status)}>{row.status}</Badge>,
    },
    { key: 'submittedAt', header: 'Submitted', render: (row) => formatUtc(row.submittedAt) },
    { key: 'decidedAt', header: 'Decided', render: (row) => formatUtc(row.decidedAt) },
    { key: 'productCode', header: 'Product', render: (row) => <Tag>{row.productCode}</Tag> },
    { key: 'channel', header: 'Channel' },
    { key: 'requestedCreditLimit', header: 'Requested (GBP)', numeric: true, render: (row) => formatMoney(row.requestedCreditLimit) },
    { key: 'grantedCreditLimit', header: 'Granted (GBP)', numeric: true, render: (row) => formatMoney(row.grantedCreditLimit) },
    { key: 'apr', header: 'APR', numeric: true, render: (row) => formatApr(row.apr) },
    { key: 'journeyDurationHours', header: 'Duration', numeric: true, render: (row) => formatHours(row.journeyDurationHours) },
    {
      key: 'declineReasonCode',
      header: 'Reason',
      render: (row) => (row.declineReasonCode ? <Tag>{row.declineReasonCode}</Tag> : '—'),
    },
  ];

  async function hydrateNames(rows, requestId = drillRequestRef.current) {
    setHydrationNotice(null);
    setNames({});
    try {
      const hydrated = await api.hydrateApplicantNames(rows.map((row) => row.applicationId));
      if (requestId !== drillRequestRef.current) return;
      setNames(hydrated);
      if (Object.keys(hydrated).length < rows.length) {
        setHydrationNotice('One or more applicant names are unavailable. Frozen journey facts remain visible.');
      }
    } catch {
      if (requestId !== drillRequestRef.current) return;
      setNames({});
      setHydrationNotice('Applicant-name hydration is unavailable. Frozen journey facts remain visible.');
    }
  }

  async function search(event) {
    event.preventDefault();
    if (!selectedSnapshot) return;
    const requestId = ++drillRequestRef.current;
    setDrill((value) => ({ ...value, loading: true, error: null, searched: true }));
    setHydrationNotice(null);
    setNames({});
    try {
      const result = await api.searchSnapshotRows({
        snapshotId: selectedSnapshot.snapshotId,
        q: query,
        status,
        limit: 10,
      });
      if (requestId !== drillRequestRef.current) return;
      setDrill({ ...result, searched: true, loading: false, error: null });
      await hydrateNames(result.rows, requestId);
    } catch (error) {
      if (requestId !== drillRequestRef.current) return;
      setDrill({ rows: [], total: 0, searched: true, loading: false, error: error.message });
    }
  }

  return (
    <>
      <PageHeader
        title="Snapshots & drill"
        lede="take once · immutable from commit · inspect and trace frozen journeys"
        meta="History is created as it happens. A correction is always a new snapshot."
      />

      <AnalyticsContextBar
        range={context.range}
        snapshots={snapshots}
        snapshot={context.snapshot}
        selectionMode={context.selectionMode}
        availability={context.availability}
        onApplyRange={onApplyRange}
        onSelectSnapshot={onSelectSnapshot}
        onTakeSnapshot={onTakeSnapshot}
        takingSnapshot={takingSnapshot}
        error={context.error}
        takeError={context.takeError}
      />

      <Split
        sidebar={
          selectedSnapshot ? (
            <Card
              title="Selected snapshot"
              subtitle="This detail is calculated from the selected snapshot own rows."
              headEnd={<StatusPill tone={snapshotTone(selectedSnapshot.source)}>{selectedSnapshot.source}</StatusPill>}
            >
              <KeyValue
                stacked
                items={[
                  { label: 'Snapshot ID', value: selectedSnapshot.snapshotId, mono: true },
                  ['Taken at', formatUtc(selectedSnapshot.takenAt)],
                  ['Period', formatRange(selectedSnapshot.range)],
                  ['Frozen rows', selectedSnapshot.rowCount],
                  ['Served count', selectedSnapshot.servedCount],
                ]}
              />
              <div className="analytics-status-counts">
                {Object.entries(selectedSnapshot.statusCounts ?? {}).map(([key, value]) => (
                  <Badge key={key} tone={statusTone(key)}>
                    {key} {value}
                  </Badge>
                ))}
              </div>
              {selectedSnapshot.definitionVersions && (
                <div className="analytics-definition-versions" aria-label="Definition versions used by this snapshot">
                  <span className="analytics-detail-label">Rules at snapshot time</span>
                  {Object.entries(selectedSnapshot.definitionVersions).map(([key, version]) => (
                    <Tag key={key}>
                      {key} v{version}
                    </Tag>
                  ))}
                </div>
              )}
            </Card>
          ) : (
            <EmptyState title="Select a snapshot">
              Choose a history row to inspect the frozen header and status counts.
            </EmptyState>
          )
        }
      >
        <Section title="Snapshot history" aside="Newest first · at most 10 shown · true total stated.">
          <DataTable
            columns={historyColumns}
            rows={snapshots}
            total={snapshotTotal}
            rowKey={(row) => row.snapshotId}
            selectedKey={selectedSnapshot?.snapshotId}
            onRowClick={(row) => onSelectSnapshot(row.snapshotId)}
            footnote="select a row to inspect it"
            empty={<EmptyState title="No snapshots yet">Take a snapshot to capture the first historical record.</EmptyState>}
          />
        </Section>
      </Split>

      <Section title="Journey drill" aside="Empty until you search · max 10 rows · names fetched live for display only, never stored.">
        <Card>
          {!selectedSnapshot ? (
            <EmptyState title="Select a snapshot before drilling">
              The rows behind an aggregate belong to a particular frozen snapshot.
            </EmptyState>
          ) : (
            <>
              <form onSubmit={search}>
                <Toolbar>
                  <SearchInput
                    grow
                    placeholder="Application ID or applicant name"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    aria-label="Application ID or applicant name"
                  />
                  <Select options={STATUS_FILTERS} value={status} onChange={(event) => setStatus(event.target.value)} aria-label="Status filter" />
                  <Button type="submit" variant="primary" disabled={drill.loading}>
                    {drill.loading ? 'Searching…' : 'Search'}
                  </Button>
                </Toolbar>
              </form>

              {drill.error && (
                <Alert tone="negative" title="Could not search the selected snapshot">
                  {drill.error}
                </Alert>
              )}
              {hydrationNotice && (
                <Alert
                  tone="warning"
                  title="Applicant names partially unavailable"
                  action={
                    <Button variant="secondary" size="sm" onClick={() => hydrateNames(drill.rows, drillRequestRef.current)}>
                      Retry names
                    </Button>
                  }
                >
                  {hydrationNotice}
                </Alert>
              )}

              {!drill.searched ? (
                <EmptyState title="Search for an applicant to begin">
                  No rows are loaded by default. Search by application ID or applicant name, or choose a status.
                </EmptyState>
              ) : (
                <DataTable
                  columns={drillColumns}
                  rows={drillRows}
                  total={drill.total}
                  rowKey={(row) => row.applicationId}
                  footnote="rows are frozen snapshot facts; applicant names are render-time only"
                  empty={<EmptyState title="No journey matches this search">Try another ID, name or status filter.</EmptyState>}
                />
              )}
            </>
          )}
        </Card>
      </Section>
    </>
  );
}
