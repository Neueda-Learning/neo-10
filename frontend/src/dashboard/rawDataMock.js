const STATUSES = ['COMPLETED', 'REJECTED', 'REFERRED', 'IN_PROGRESS', 'FAILED'];
const PRODUCTS = ['CREDIT_CARD_STANDARD', 'CREDIT_CARD_REWARDS', 'CREDIT_CARD_STUDENT'];
const CHANNELS = ['WEB', 'MOBILE_APP', 'BRANCH', 'AGGREGATOR'];
const STEPS = ['verification', 'policy', 'kyc', 'screening', 'credit', 'agreement', 'account', 'card'];

const seed = [
  ['APP-MOCK-001', '2026-01-01T09:00:00Z', 'WEB', 'CREDIT_CARD_STANDARD', 'COMPLETED', 8, 'card', null, 2500, 2500, '25-34', 'PERMANENT', 42000, 0.25, 'B'],
  ['APP-MOCK-002', '2026-01-02T11:00:00Z', 'BRANCH', 'CREDIT_CARD_REWARDS', 'REJECTED', 4, 'credit', 'CRE_AFFORDABILITY_EXCEEDED', 6000, null, '35-44', 'CONTRACT', 31000, 0.48, 'D'],
  ['APP-MOCK-001', '2026-02-03T13:00:00Z', 'MOBILE_APP', 'CREDIT_CARD_STUDENT', 'REFERRED', 3, 'screening', 'SCR_PARTIAL_MATCH', 1500, null, '18-24', 'STUDENT', 12000, 0.20, 'C'],
  ['APP-MOCK-004', '2026-03-04T08:30:00Z', 'AGGREGATOR', 'CREDIT_CARD_REWARDS', 'IN_PROGRESS', 5, 'agreement', null, 8500, null, '45-54', 'SELF_EMPLOYED', 55000, 0.38, 'C'],
  ['APP-MOCK-005', '2026-04-05T10:15:00Z', 'WEB', 'CREDIT_CARD_STANDARD', 'COMPLETED', 8, 'card', null, 4000, 3500, '55-64', 'RETIRED', 28000, 0.19, 'A'],
  ['APP-MOCK-006', '2026-05-06T16:45:00Z', 'BRANCH', 'CREDIT_CARD_STUDENT', 'REJECTED', 2, 'kyc', 'KYC_LOW_CONFIDENCE', 2000, null, '18-24', 'UNEMPLOYED', 9000, 0.56, 'E'],
];

function makeRow(values, index) {
  const [applicationId, submittedAt, channel, productCode, status, stepsReached, stoppedAtStep,
    declineReasonCode, requestedLimit, grantedLimit, ageBand, employmentStatus, annualIncome,
    dtiRatio, creditBand] = values;
  return {
    id: index + 1, applicationId, submittedAt, channel, productCode, status, stepsReached,
    stoppedAtStep, declineReasonCode, requestedLimit, grantedLimit,
    decidedAt: ['COMPLETED', 'REJECTED', 'REFERRED'].includes(status)
      ? new Date(new Date(submittedAt).valueOf() + 60 * 60 * 1000).toISOString() : null,
    lastUpdatedAt: submittedAt, ageBand, residenceCountry: 'GB', employmentStatus, annualIncome,
    dtiRatio, creditBand, apr: productCode === 'CREDIT_CARD_STANDARD' ? 19.9 : 24.9,
    screeningOutcome: stepsReached >= 3 ? 'CLEAR' : null,
    kycOutcome: stepsReached >= 2 ? 'VERIFIED' : null,
    agreementOutcome: status === 'COMPLETED' ? 'SIGNED' : null,
    sourceFilename: `neo_daily_${submittedAt.slice(0, 10)}.csv`,
    sourceFileDate: submittedAt.slice(0, 10), importedAt: '2026-07-29T00:00:00Z',
  };
}

let rows = seed.map(makeRow);
let files = [{
  id: 1, filename: 'neo_daily_2026-01-01.csv', status: 'PROCESSED',
  checksum: 'b80c2f51769d2d8da00b95f3f49d1a57b061337e05f07273a0268f653e4579b9',
  rowsRead: 1, rowsInserted: 1, errorMessage: null, processedAt: '2026-07-29T00:00:00Z',
}];

const wait = (value) => new Promise((resolve) => window.setTimeout(() => resolve(value), 120));
const percent = (part, total) => total ? Number((part * 100 / total).toFixed(1)) : 0;
const sum = (items, key) => items.reduce((total, item) => total + Number(item[key] ?? 0), 0);

function filtered(filters = {}) {
  return rows.filter((row) => {
    const date = row.submittedAt.slice(0, 10);
    return (!filters.from || date >= filters.from) && (!filters.to || date <= filters.to)
      && (!filters.productCode || filters.productCode === 'ALL' || row.productCode === filters.productCode)
      && (!filters.channel || filters.channel === 'ALL' || row.channel === filters.channel);
  }).sort((a, b) => b.submittedAt.localeCompare(a.submittedAt) || b.id - a.id);
}

function statusCounts(items) {
  return Object.fromEntries(STATUSES.map((status) => [status, items.filter((row) => row.status === status).length]));
}

function outcomeGroups(items, labels, getter) {
  return labels.map((label) => {
    const group = items.filter((row) => getter(row) === label);
    const count = statusCounts(group);
    return {
      label, completed: count.COMPLETED, rejected: count.REJECTED, referred: count.REFERRED,
      inProgress: count.IN_PROGRESS, failed: count.FAILED, total: group.length,
      completionRate: percent(count.COMPLETED, group.length),
    };
  });
}

function labels(items, getter) {
  const counts = new Map();
  items.map(getter).filter(Boolean).forEach((value) => counts.set(value, (counts.get(value) ?? 0) + 1));
  return [...counts].sort((a, b) => b[1] - a[1]).map(([label, count]) => ({ label, count }));
}

function analytics(items) {
  const counts = statusCounts(items);
  const topReasons = labels(items, (row) => row.declineReasonCode)
    .map(({ label, count }) => ({ reason: label, count, share: percent(count, items.length), topStoppedStep: null }));
  const months = [...new Set(items.map((row) => row.submittedAt.slice(0, 7)))].sort();
  const monthlyTrend = months.map((period) => {
    const group = items.filter((row) => row.submittedAt.startsWith(period));
    const c = statusCounts(group);
    return { period, completed: c.COMPLETED, rejected: c.REJECTED, referred: c.REFERRED, inProgress: c.IN_PROGRESS, failed: c.FAILED, total: group.length };
  });
  const journeySteps = STEPS.map((name, index) => {
    const group = items.filter((row) => row.stepsReached >= index);
    const stopped = items.filter((row) => row.stoppedAtStep === name);
    const c = statusCounts(group);
    return {
      step: index + 1, name, reached: group.length, stopped: stopped.length, completed: c.COMPLETED,
      rejected: c.REJECTED, referred: c.REFERRED, inProgress: c.IN_PROGRESS, failed: c.FAILED,
      topReason: stopped.find((row) => row.declineReasonCode)?.declineReasonCode ?? null,
    };
  });
  const productOutcomes = outcomeGroups(items, PRODUCTS, (row) => row.productCode);
  return {
    total: items.length, completionRate: percent(counts.COMPLETED, items.length),
    totalRequestedLimit: sum(items, 'requestedLimit'), totalGrantedLimit: sum(items, 'grantedLimit'),
    medianDecisionMinutes: 60,
    statusBreakdown: STATUSES.map((status) => ({ status, count: counts[status] })),
    monthlyTrend, topReasons, journeySteps, stoppedByStep: labels(items, (row) => row.stoppedAtStep),
    productOutcomes, channelOutcomes: outcomeGroups(items, CHANNELS, (row) => row.channel),
    productLimits: PRODUCTS.map((label) => {
      const group = items.filter((row) => row.productCode === label);
      return {
        label, averageRequested: group.length ? sum(group, 'requestedLimit') / group.length : 0,
        averageGranted: group.filter((row) => row.grantedLimit != null).length
          ? sum(group, 'grantedLimit') / group.filter((row) => row.grantedLimit != null).length : 0,
        averageApr: group.length ? sum(group, 'apr') / group.length : 0,
      };
    }),
    creditBandOutcomes: outcomeGroups(items, ['A', 'B', 'C', 'D', 'E'], (row) => row.creditBand),
    dtiBandOutcomes: outcomeGroups(items, ['≤ 0.25', '0.26–0.35', '0.36–0.45', '0.46–0.55', '> 0.55'], (row) => {
      if (row.dtiRatio <= 0.25) return '≤ 0.25';
      if (row.dtiRatio <= 0.35) return '0.26–0.35';
      if (row.dtiRatio <= 0.45) return '0.36–0.45';
      if (row.dtiRatio <= 0.55) return '0.46–0.55';
      return '> 0.55';
    }),
    incomeCompletionRates: ['< £15k', '£15–25k', '£25–40k', '£40–60k', '£60k+'].map((label) => ({ label, count: 1, rate: label === '< £15k' ? 0 : 50 })),
    screeningOutcomes: labels(items, (row) => row.screeningOutcome),
    kycOutcomes: labels(items, (row) => row.kycOutcome),
    agreementOutcomes: labels(items, (row) => row.agreementOutcome),
    ageOutcomes: outcomeGroups(items, ['18-24', '25-34', '35-44', '45-54', '55-64', '65+'], (row) => row.ageBand),
    employmentOutcomes: outcomeGroups(items, ['PERMANENT', 'SELF_EMPLOYED', 'CONTRACT', 'RETIRED', 'STUDENT', 'UNEMPLOYED'], (row) => row.employmentStatus),
  };
}

export const mockRawDataApi = {
  async scanFiles() {
    return wait({
      status: 'NO_NEW_FILES', filesFound: files.length, filesProcessed: 0, filesSkipped: files.length,
      filesFailed: 0, rowsInserted: 0,
      results: files.map((file) => ({ filename: file.filename, result: 'SKIPPED', rowsRead: 0, rowsInserted: 0, error: null })),
    });
  },
  async resetData() {
    const response = { status: 'RESET_COMPLETE', rawRowsDeleted: rows.length, processedFilesDeleted: files.length, demoRowsDeleted: 0 };
    rows = []; files = [];
    return wait(response);
  },
  async getRawData(filters = {}) {
    const result = filtered(filters);
    const page = Math.max(filters.page ?? 0, 0);
    const size = Math.max(filters.size ?? 50, 1);
    return wait({ total: result.length, items: result.slice(page * size, page * size + size) });
  },
  async getAnalytics(filters) { return wait(analytics(filtered(filters))); },
  async getProcessedFiles() { return wait({ items: files, total: files.length }); },
};
