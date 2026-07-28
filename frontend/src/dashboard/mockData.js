import { EXTRACT_COLUMNS } from './constants.js';

const DEFINITION_VERSIONS = {
  OUTCOME_SUMMARY: 1,
  FUNNEL: 1,
  DECLINE_REASONS: 1,
  EXTRACT: 1,
};

const ZERO_COUNTS = {
  COMPLETED: 0,
  REJECTED: 0,
  REFERRED: 0,
  IN_PROGRESS: 0,
};

const WORKED_SUMMARY = {
  counts: {
    COMPLETED: 143,
    REJECTED: 36,
    REFERRED: 10,
    IN_PROGRESS: 3,
  },
  total: 192,
};

const FUNNEL = [
  { step: 'Verification', reached: 200, passed: 191 },
  { step: 'Eligibility', reached: 191, passed: 184 },
  { step: 'Affordability', reached: 184, passed: 176 },
  { step: 'Policy', reached: 176, passed: 166 },
  { step: 'Credit', reached: 166, passed: 157 },
  { step: 'Agreement', reached: 157, passed: 150 },
  { step: 'Account', reached: 150, passed: 144 },
  { step: 'Card', reached: 144, passed: 143 },
];

const FIXED_ROWS = [
  {
    applicationId: 'app-1001',
    status: 'COMPLETED',
    submittedAt: '2026-07-01T08:15:00Z',
    decidedAt: '2026-07-01T12:45:00Z',
    productCode: 'CREDIT_CARD_REWARDS',
    channel: 'WEB',
    requestedCreditLimit: 3000,
    grantedCreditLimit: 2800,
    apr: 24.9,
    declineReasonCode: null,
  },
  {
    applicationId: 'app-1004',
    status: 'REJECTED',
    submittedAt: '2026-07-02T10:10:00Z',
    decidedAt: '2026-07-02T10:29:00Z',
    productCode: 'CREDIT_CARD_STUDENT',
    channel: 'MOBILE_APP',
    requestedCreditLimit: 1500,
    grantedCreditLimit: null,
    apr: 0,
    declineReasonCode: 'CRE_INCOME_BELOW_MINIMUM',
  },
  {
    applicationId: 'app-1012',
    status: 'REFERRED',
    submittedAt: '2026-07-04T11:30:00Z',
    decidedAt: null,
    productCode: 'CREDIT_CARD_REWARDS',
    channel: 'BRANCH',
    requestedCreditLimit: 5000,
    grantedCreditLimit: null,
    apr: 24.9,
    declineReasonCode: null,
  },
  {
    applicationId: 'app-1017',
    status: 'IN_PROGRESS',
    submittedAt: '2026-07-06T14:05:00Z',
    decidedAt: null,
    productCode: 'CREDIT_CARD_STANDARD',
    channel: 'WEB',
    requestedCreditLimit: 2000,
    grantedCreditLimit: null,
    apr: 26.9,
    declineReasonCode: null,
  },
  {
    applicationId: 'app-1023',
    status: 'REJECTED',
    submittedAt: '2026-07-08T09:20:00Z',
    decidedAt: '2026-07-08T09:42:00Z',
    productCode: 'CREDIT_CARD_STANDARD',
    channel: 'AGGREGATOR',
    requestedCreditLimit: 2500,
    grantedCreditLimit: null,
    apr: 26.9,
    declineReasonCode: 'VER_MISSING_FIELD',
  },
  {
    applicationId: 'app-1034',
    status: 'COMPLETED',
    submittedAt: '2026-07-10T16:40:00Z',
    decidedAt: '2026-07-10T18:05:00Z',
    productCode: 'CREDIT_CARD_REWARDS',
    channel: 'MOBILE_APP',
    requestedCreditLimit: 4000,
    grantedCreditLimit: 4000,
    apr: 24.9,
    declineReasonCode: null,
  },
  {
    applicationId: 'app-1048',
    status: 'REJECTED',
    submittedAt: '2026-07-12T07:55:00Z',
    decidedAt: '2026-07-12T08:23:00Z',
    productCode: 'CREDIT_CARD_STUDENT',
    channel: 'WEB',
    requestedCreditLimit: 1000,
    grantedCreditLimit: null,
    apr: 29.9,
    declineReasonCode: 'UNKNOWN_UPSTREAM_CODE',
  },
  {
    applicationId: 'app-1059',
    status: 'COMPLETED',
    submittedAt: '2026-07-14T12:00:00Z',
    decidedAt: '2026-07-14T14:20:00Z',
    productCode: 'CREDIT_CARD_STANDARD',
    channel: 'BRANCH',
    requestedCreditLimit: 3500,
    grantedCreditLimit: 3200,
    apr: 26.9,
    declineReasonCode: null,
  },
];

const FIXED_APPLICANTS = {
  'app-1001': 'Maria Shah',
  'app-1004': 'Aisha Khan',
  'app-1012': 'Daniel Wright',
  'app-1017': 'Holly Jenkins',
  'app-1023': 'Noah Smith',
  'app-1034': 'Priya Raman',
  'app-1048': 'Jordan Bell',
  'app-1059': 'Owen Lewis',
};

const PRODUCT_CODES = ['CREDIT_CARD_REWARDS', 'CREDIT_CARD_STANDARD', 'CREDIT_CARD_STUDENT'];
const CHANNELS = ['WEB', 'MOBILE_APP', 'BRANCH', 'AGGREGATOR'];

function repeat(value, count) {
  return Array.from({ length: count }, () => value);
}

// The three fixed rejected examples above account for one occurrence each. These
// values complete the 36 frozen rejections, including the published top reasons.
const GENERATED_REJECTION_REASONS = [
  ...repeat('CRE_INCOME_BELOW_MINIMUM', 8),
  ...repeat('VER_MISSING_FIELD', 4),
  ...repeat('POL_PRODUCT_NOT_ELIGIBLE', 4),
  ...repeat('CRE_AFFORDABILITY_THRESHOLD', 4),
  ...repeat('VER_DOCUMENT_EXPIRED', 3),
  ...repeat('UNKNOWN_UPSTREAM_CODE', 1),
  ...repeat('POL_HIGH_RISK', 4),
  ...repeat('CRE_DEBT_TO_INCOME', 3),
  ...repeat('VER_IDENTITY_UNVERIFIED', 2),
];

let nextSyntheticApplication = 1100;
let nextRejectionReason = 0;

function paddedDay(day) {
  return String(day).padStart(2, '0');
}

function syntheticTimestamp(day, sequence, decided = false) {
  const hour = String(8 + (sequence % 9)).padStart(2, '0');
  const minute = String((sequence * 7) % 60).padStart(2, '0');
  const offset = decided ? 2 : 0;
  const decidedHour = String(Math.min(23, Number(hour) + offset)).padStart(2, '0');
  return '2026-07-' + paddedDay(day) + 'T' + (decided ? decidedHour : hour) + ':' + minute + ':00Z';
}

function makeSyntheticRows(status, count, firstDay, lastDay) {
  const rows = [];
  const dayCount = lastDay - firstDay + 1;
  for (let index = 0; index < count; index += 1) {
    const sequence = nextSyntheticApplication - 1100;
    const applicationId = 'app-' + nextSyntheticApplication;
    const day = firstDay + (index % dayCount);
    const requestedCreditLimit = 1000 + ((sequence % 9) + 1) * 500;
    const completed = status === 'COMPLETED';
    const rejected = status === 'REJECTED';
    rows.push({
      applicationId,
      status,
      submittedAt: syntheticTimestamp(day, sequence),
      decidedAt: completed || rejected ? syntheticTimestamp(day, sequence, true) : null,
      productCode: PRODUCT_CODES[sequence % PRODUCT_CODES.length],
      channel: CHANNELS[sequence % CHANNELS.length],
      requestedCreditLimit,
      grantedCreditLimit: completed ? requestedCreditLimit - (sequence % 3) * 100 : null,
      apr: [24.9, 26.9, 29.9][sequence % 3],
      declineReasonCode: rejected ? GENERATED_REJECTION_REASONS[nextRejectionReason++] : null,
    });
    nextSyntheticApplication += 1;
  }
  return rows;
}

// Rows are deliberately generated as fixture data before any snapshot exists.
// Each snapshot below freezes a separate copy of the rows in its own range.
const SNAPSHOT_ROWS = [
  ...FIXED_ROWS,
  ...makeSyntheticRows('COMPLETED', 92, 1, 10),
  ...makeSyntheticRows('REJECTED', 20, 1, 10),
  ...makeSyntheticRows('REFERRED', 6, 1, 10),
  ...makeSyntheticRows('IN_PROGRESS', 2, 1, 10),
  ...makeSyntheticRows('COMPLETED', 48, 11, 14),
  ...makeSyntheticRows('REJECTED', 13, 11, 14),
  ...makeSyntheticRows('REFERRED', 3, 11, 14),
].sort((left, right) => left.submittedAt.localeCompare(right.submittedAt) || left.applicationId.localeCompare(right.applicationId));

const APPLICANTS = SNAPSHOT_ROWS.reduce(
  (names, row) => {
    if (!names[row.applicationId]) names[row.applicationId] = 'Sample applicant ' + row.applicationId.slice(4);
    return names;
  },
  { ...FIXED_APPLICANTS }
);

const DEFINITIONS = [
  {
    key: 'OUTCOME_SUMMARY',
    version: 1,
    effectiveFrom: '2026-07-01T00:00:00Z',
    text: 'Counts are grouped by journey status and filtered by submittedAt.',
  },
  {
    key: 'FUNNEL',
    version: 1,
    effectiveFrom: '2026-07-01T00:00:00Z',
    text: 'Reached means a step appears in a frozen journey. Passed means its outcome moved the journey forward.',
  },
  {
    key: 'DECLINE_REASONS',
    version: 1,
    effectiveFrom: '2026-07-01T00:00:00Z',
    text: 'Each rejected journey contributes exactly one reason: the deciding step first reason frozen at snapshot time.',
  },
  {
    key: 'EXTRACT',
    version: 1,
    effectiveFrom: '2026-07-01T00:00:00Z',
    text: 'A decided journey is COMPLETED or REJECTED. The published columns and their order are the consumer contract.',
    columns: EXTRACT_COLUMNS,
  },
];

const snapshotRowsById = new Map();

function delay(value) {
  const schedule = typeof window === 'undefined' ? setTimeout : window.setTimeout.bind(window);
  return new Promise((resolve) => schedule(() => resolve(value), 120));
}

function rowIsInRange(row, range) {
  const submittedDate = row.submittedAt.slice(0, 10);
  return submittedDate >= range.from && submittedDate <= range.to;
}

function frozenFixtureRows(range) {
  return SNAPSHOT_ROWS.filter((row) => rowIsInRange(row, range)).map((row) => ({ ...row }));
}

function countStatuses(rows) {
  return rows.reduce(
    (counts, row) => {
      counts[row.status] = (counts[row.status] ?? 0) + 1;
      return counts;
    },
    { ...ZERO_COUNTS }
  );
}

function publicSnapshot(snapshot) {
  return {
    ...snapshot,
    range: { ...snapshot.range },
    statusCounts: { ...snapshot.statusCounts },
    definitionVersions: { ...snapshot.definitionVersions },
  };
}

// A fresh boot deliberately has no stored snapshots. Taking one creates a
// frozen copy of this fixture for the requested period, matching UC 05/06.
let snapshots = [];
let nextSnapshotNumber = 1;
let temporarilyUnavailableApplicantIds = new Set(['app-1048']);

function covers(snapshot, range) {
  return snapshot.range.from <= range.from && snapshot.range.to >= range.to;
}

function latestSnapshot(range) {
  return snapshots.find((snapshot) => covers(snapshot, range)) ?? null;
}

function snapshotFor({ range, snapshotId }) {
  if (snapshotId) return snapshots.find((snapshot) => snapshot.snapshotId === snapshotId) ?? null;
  return latestSnapshot(range);
}

function rowsForSnapshot(snapshot) {
  return snapshotRowsById.get(snapshot.snapshotId) ?? [];
}

function noSnapshotError() {
  const error = new Error('Take a snapshot first. This module never reads the live journey feed for analytics.');
  error.status = 409;
  return error;
}

function notFoundError() {
  const error = new Error('Snapshot not found.');
  error.status = 404;
  return error;
}

function snapshotCoverageError() {
  const error = new Error('The selected snapshot does not cover the requested reporting period.');
  error.status = 400;
  return error;
}

function analyticsSnapshot(input) {
  const snapshot = snapshotFor(input);
  if (!snapshot) return { error: input.snapshotId ? notFoundError() : noSnapshotError() };
  if (!covers(snapshot, input.range)) return { error: snapshotCoverageError() };
  return { snapshot };
}

function funnelFor(snapshot, range) {
  const rowCount = rowsForSnapshot(snapshot).filter((row) => rowIsInRange(row, range)).length;
  if (rowCount === WORKED_SUMMARY.total) return FUNNEL.map((row) => ({ ...row }));
  if (rowCount === 0) return FUNNEL.map((row) => ({ ...row, reached: 0, passed: 0 }));
  const ratio = rowCount / WORKED_SUMMARY.total;
  return FUNNEL.map((row) => {
    const reached = Math.round(row.reached * ratio);
    return { ...row, reached, passed: Math.min(reached, Math.round(row.passed * ratio)) };
  });
}

function sortedReasons(rows) {
  const counts = rows
    .filter((row) => row.status === 'REJECTED' && row.declineReasonCode)
    .reduce((map, row) => {
      map.set(row.declineReasonCode, (map.get(row.declineReasonCode) ?? 0) + 1);
      return map;
    }, new Map());
  return Array.from(counts, ([code, count]) => ({ code, count })).sort(
    (left, right) => right.count - left.count || left.code.localeCompare(right.code)
  );
}

function csvCell(value) {
  const text = String(value ?? '');
  return /[",\r\n]/.test(text) ? '"' + text.replaceAll('"', '""') + '"' : text;
}

function journeyDurationHours(row) {
  if (!row.decidedAt || !row.submittedAt) return null;
  return Number(((new Date(row.decidedAt).getTime() - new Date(row.submittedAt).getTime()) / 3600000).toFixed(1));
}

function publicDrillRow(row) {
  return { ...row, journeyDurationHours: journeyDurationHours(row) };
}

function makeCsv(range, snapshot) {
  const records = rowsForSnapshot(snapshot)
    .filter((row) => rowIsInRange(row, range) && (row.status === 'COMPLETED' || row.status === 'REJECTED'))
    .slice()
    .sort((left, right) => left.submittedAt.localeCompare(right.submittedAt) || left.applicationId.localeCompare(right.applicationId));
  const lines = [EXTRACT_COLUMNS.join(',')];
  records.forEach((row) => {
    const duration = journeyDurationHours(row);
    lines.push(
      [
        row.applicationId,
        row.submittedAt,
        row.decidedAt ?? '',
        row.status,
        row.productCode,
        row.channel,
        row.requestedCreditLimit,
        row.grantedCreditLimit ?? '',
        row.apr.toFixed(1),
        row.declineReasonCode ?? '',
        duration == null ? '' : duration.toFixed(1),
        range.from,
        range.to,
        snapshot.takenAt,
      ]
        .map(csvCell)
        .join(',')
    );
  });
  return lines.join('\r\n') + '\r\n';
}

function currentDate() {
  return new Date().toISOString().slice(0, 10);
}

export const mockAnalytics = {
  health: () => delay({ status: 'UP' }),
  info: () =>
    delay({
      team: 'Team 10',
      service: 'Portfolio & Regulatory Analytics',
      serviceId: 'neo-10',
      domain: 'analytics',
      version: '5',
      mockedDependencies: ['frozen journey fixture'],
    }),
  listSnapshots: ({ limit = 10 } = {}) =>
    delay({
      items: snapshots.slice(0, Math.min(limit, 10)).map(publicSnapshot),
      total: snapshots.length,
    }),
  getSnapshot: (snapshotId) => {
    const snapshot = snapshots.find((item) => item.snapshotId === snapshotId);
    if (!snapshot) return Promise.reject(notFoundError());
    return delay(publicSnapshot(snapshot));
  },
  resolveSnapshot: ({ range, snapshotId }) => {
    const snapshot = snapshotFor({ range, snapshotId });
    if (!snapshot && snapshotId) return Promise.reject(notFoundError());
    if (snapshot && !covers(snapshot, range)) return Promise.reject(snapshotCoverageError());
    return delay(snapshot ? publicSnapshot(snapshot) : null);
  },
  createSnapshot: ({ range }) => {
    if (!range.from || !range.to || range.from > range.to) {
      const error = new Error('Choose a valid inclusive date range.');
      error.status = 400;
      return Promise.reject(error);
    }
    const frozenRows = frozenFixtureRows(range);
    const sequence = nextSnapshotNumber++;
    const snapshotId = 'snap-' + String(sequence).padStart(6, '0');
    const snapshot = {
      snapshotId,
      takenAt: new Date(Date.UTC(2026, 6, 17, 9, 0, sequence)).toISOString(),
      range: { ...range },
      rowCount: frozenRows.length,
      source: 'fixture-v1',
      servedCount: 0,
      statusCounts: countStatuses(frozenRows),
      definitionVersions: { ...DEFINITION_VERSIONS },
    };
    snapshotRowsById.set(snapshotId, frozenRows);
    snapshots = [snapshot, ...snapshots];
    // Deliberately return the transport-level create response. App.jsx follows
    // it with getSnapshot(id), just as the live API integration will do.
    return delay({
      snapshotId: snapshot.snapshotId,
      takenAt: snapshot.takenAt,
      rowCount: snapshot.rowCount,
      source: snapshot.source,
    });
  },
  getSummary: ({ range, snapshotId }) => {
    const { snapshot, error } = analyticsSnapshot({ range, snapshotId });
    if (error) return Promise.reject(error);
    const rows = rowsForSnapshot(snapshot).filter((row) => rowIsInRange(row, range));
    return delay({
      period: { ...range },
      snapshotId: snapshot.snapshotId,
      generatedAt: snapshot.takenAt,
      definitionVersion: snapshot.definitionVersions.OUTCOME_SUMMARY,
      counts: countStatuses(rows),
      total: rows.length,
      partialDay: range.to === currentDate(),
    });
  },
  getFunnel: ({ range, snapshotId }) => {
    const { snapshot, error } = analyticsSnapshot({ range, snapshotId });
    if (error) return Promise.reject(error);
    return delay({
      snapshotId: snapshot.snapshotId,
      takenAt: snapshot.takenAt,
      definitionVersion: snapshot.definitionVersions.FUNNEL,
      steps: funnelFor(snapshot, range),
    });
  },
  getDeclineReasons: ({ range, snapshotId }) => {
    const { snapshot, error } = analyticsSnapshot({ range, snapshotId });
    if (error) return Promise.reject(error);
    const rows = rowsForSnapshot(snapshot).filter((row) => rowIsInRange(row, range));
    return delay({
      period: { ...range },
      snapshotId: snapshot.snapshotId,
      takenAt: snapshot.takenAt,
      definitionVersion: snapshot.definitionVersions.DECLINE_REASONS,
      reasons: sortedReasons(rows),
    });
  },
  getExtractMeta: ({ range, snapshotId }) => {
    const { snapshot, error } = analyticsSnapshot({ range, snapshotId });
    if (error) return Promise.reject(error);
    const rowCount = rowsForSnapshot(snapshot).filter(
      (row) => rowIsInRange(row, range) && (row.status === 'COMPLETED' || row.status === 'REJECTED')
    ).length;
    return delay({
      snapshotId: snapshot.snapshotId,
      generatedAt: snapshot.takenAt,
      definitionVersion: snapshot.definitionVersions.EXTRACT,
      rowCount,
      columns: EXTRACT_COLUMNS,
    });
  },
  downloadExtract: ({ range, snapshotId }) => {
    const { snapshot, error } = analyticsSnapshot({ range, snapshotId });
    if (error) return Promise.reject(error);
    const blob = new Blob([makeCsv(range, snapshot)], { type: 'text/csv;charset=utf-8' });
    return delay({
      blob,
      filename: 'regulatory-extract-' + snapshot.snapshotId + '-' + range.from + '.csv',
      contentType: 'text/csv',
    });
  },
  searchSnapshotRows: ({ snapshotId, q = '', status = 'All', limit = 10 }) => {
    const snapshot = snapshots.find((item) => item.snapshotId === snapshotId);
    if (!snapshot) return Promise.reject(notFoundError());
    const query = q.trim().toLowerCase();
    if (!query && (!status || status === 'All')) return delay({ rows: [], total: 0, limit: 10, truncated: false });
    const matches = rowsForSnapshot(snapshot).filter((row) => {
      const applicantName = APPLICANTS[row.applicationId]?.toLowerCase() ?? '';
      const queryMatches = !query || row.applicationId.includes(query) || applicantName.includes(query);
      const statusMatches = !status || status === 'All' || row.status === status;
      return queryMatches && statusMatches;
    });
    const safeLimit = Math.min(Math.max(Number(limit) || 10, 1), 10);
    return delay({
      rows: matches.slice(0, safeLimit).map(publicDrillRow),
      total: matches.length,
      limit: safeLimit,
      truncated: matches.length > safeLimit,
    });
  },
  hydrateApplicantNames: (applicationIds) => {
    const ids = Array.from(new Set(applicationIds)).slice(0, 10);
    return delay(
      ids.reduce((names, id) => {
        if (temporarilyUnavailableApplicantIds.has(id)) {
          temporarilyUnavailableApplicantIds.delete(id);
          return names;
        }
        if (APPLICANTS[id]) names[id] = APPLICANTS[id];
        return names;
      }, {})
    );
  },
  listDefinitions: () => delay(DEFINITIONS.map((definition) => ({ ...definition, columns: definition.columns ? [...definition.columns] : undefined }))),
};
