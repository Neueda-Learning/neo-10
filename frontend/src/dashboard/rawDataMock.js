const STATUS_VALUES = new Set(['COMPLETED', 'REJECTED', 'IN_PROGRESS']);
const CARD_TYPE_VALUES = new Set(['PREMIUM_CARD', 'PLATINUM_CARD']);

let rows = [
  ['COMPLETED', 'PREMIUM_CARD', '2026-01-08'], ['REJECTED', 'PLATINUM_CARD', '2026-01-14'],
  ['IN_PROGRESS', 'PLATINUM_CARD', '2026-02-03'], ['COMPLETED', 'PREMIUM_CARD', '2026-02-20'],
  ['REJECTED', 'PREMIUM_CARD', '2026-03-11'], ['IN_PROGRESS', 'PLATINUM_CARD', '2026-03-26'],
  ['COMPLETED', 'PREMIUM_CARD', '2026-04-05'], ['REJECTED', 'PLATINUM_CARD', '2026-04-19'],
  ['IN_PROGRESS', 'PREMIUM_CARD', '2026-05-08'], ['COMPLETED', 'PLATINUM_CARD', '2026-05-24'],
  ['COMPLETED', 'PREMIUM_CARD', '2026-06-02'], ['IN_PROGRESS', 'PLATINUM_CARD', '2026-06-17'],
  ['REJECTED', 'PREMIUM_CARD', '2026-07-06'], ['COMPLETED', 'PLATINUM_CARD', '2026-07-21'],
  ['IN_PROGRESS', 'PREMIUM_CARD', '2026-08-09'], ['REJECTED', 'PLATINUM_CARD', '2026-08-27'],
  ['COMPLETED', 'PLATINUM_CARD', '2026-09-13'], ['IN_PROGRESS', 'PREMIUM_CARD', '2026-09-30'],
  ['REJECTED', 'PREMIUM_CARD', '2026-10-07'], ['COMPLETED', 'PLATINUM_CARD', '2026-10-22'],
  ['IN_PROGRESS', 'PREMIUM_CARD', '2026-11-10'], ['REJECTED', 'PLATINUM_CARD', '2026-11-28'],
  ['COMPLETED', 'PLATINUM_CARD', '2026-12-06'], ['IN_PROGRESS', 'PREMIUM_CARD', '2026-12-18'],
].map(([status, cardType, appliedDate], index) => ({ id: index + 1, status, cardType, appliedDate }));

let nextId = rows.length + 1;
const processedUploads = new Set();
let processedFiles = [
  { id: 1, filename: 'customer_data_2026_01.csv', status: 'PROCESSED', rowCount: 2, processedAt: '2026-01-31T10:15:00Z' },
  { id: 2, filename: 'customer_data_2026_02.csv', status: 'PROCESSED', rowCount: 2, processedAt: '2026-02-28T10:15:00Z' },
  { id: 3, filename: 'customer_data_2026_03.csv', status: 'PROCESSED', rowCount: 2, processedAt: '2026-03-31T10:15:00Z' },
];
let nextProcessedId = processedFiles.length + 1;

function wait(value) {
  return new Promise((resolve) => window.setTimeout(() => resolve(value), 180));
}

function normaliseCardType(value) {
  return String(value ?? '').trim().toUpperCase().replace(/[\s-]+/g, '_');
}

function normaliseStatus(value) {
  return String(value ?? '').trim().toUpperCase();
}

function validDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(new Date(value + 'T12:00:00').valueOf());
}

function parseCsv(text, filename) {
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/).filter((line) => line.trim() !== '');
  if (lines.length < 2) throw new Error(filename + ': add a header and at least one data row.');
  const headers = lines[0].split(',').map((header) => header.trim().toLowerCase());
  const required = ['status', 'card_type', 'applied_date'];
  const absent = required.filter((header) => !headers.includes(header));
  if (absent.length) throw new Error(filename + ': missing column ' + absent.join(', ') + '.');
  const index = Object.fromEntries(headers.map((header, position) => [header, position]));

  return lines.slice(1).map((line, position) => {
    const values = line.split(',').map((value) => value.trim());
    const status = normaliseStatus(values[index.status]);
    const cardType = normaliseCardType(values[index.card_type]);
    const appliedDate = values[index.applied_date];
    const rowNumber = position + 2;
    if (!STATUS_VALUES.has(status)) throw new Error(filename + ': row ' + rowNumber + ' has an invalid status.');
    if (!CARD_TYPE_VALUES.has(cardType)) throw new Error(filename + ': row ' + rowNumber + ' has an invalid card type.');
    if (!validDate(appliedDate)) throw new Error(filename + ': row ' + rowNumber + ' needs applied_date in YYYY-MM-DD format.');
    return { status, cardType, appliedDate };
  });
}

function filterRows({ from, to, cardType }) {
  return rows.filter((row) => row.appliedDate >= from && row.appliedDate <= to && (cardType === 'ALL' || row.cardType === cardType));
}

function countBy(items, key, values) {
  return values.map((value) => ({ [key]: value, count: items.filter((item) => item[key] === value).length }));
}

function toQuarter(date) {
  return Math.floor((Number(date.slice(5, 7)) - 1) / 3) + 1;
}

export const mockRawDataApi = {
  async uploadFiles(files) {
    const results = [];
    let rowsInserted = 0;
    for (const file of files) {
      const key = [file.name, file.size, file.lastModified].join(':');
      if (processedUploads.has(key)) {
        results.push({ filename: file.name, result: 'ALREADY_IMPORTED', rowsInserted: 0 });
        continue;
      }
      try {
        const importedRows = parseCsv(await file.text(), file.name);
        rows = rows.concat(importedRows.map((row) => ({ ...row, id: nextId++ })));
        processedUploads.add(key);
        processedFiles = [{ id: nextProcessedId++, filename: file.name, status: 'PROCESSED', rowCount: importedRows.length, processedAt: new Date().toISOString() }, ...processedFiles];
        rowsInserted += importedRows.length;
        results.push({ filename: file.name, result: 'PROCESSED', rowsInserted: importedRows.length });
      } catch (error) {
        processedFiles = [{ id: nextProcessedId++, filename: file.name, status: 'FAILED', rowCount: 0, processedAt: null, errorMessage: error.message }, ...processedFiles];
        results.push({ filename: file.name, result: 'FAILED', rowsInserted: 0, error: error.message });
      }
    }
    const hasProcessed = results.some((item) => item.result === 'PROCESSED');
    const hasFailed = results.some((item) => item.result === 'FAILED');
    return wait({
      status: hasFailed && hasProcessed ? 'PARTIAL_SUCCESS' : hasFailed ? 'FAILED' : hasProcessed ? 'SUCCESS' : 'NO_NEW_FILES',
      rowsInserted,
      results,
    });
  },

  async getRawData({ from, to, cardType, page = 0, size = 50 }) {
    const filtered = filterRows({ from, to, cardType }).sort((a, b) => b.appliedDate.localeCompare(a.appliedDate) || b.id - a.id);
    return wait({ total: filtered.length, items: filtered.slice(page * size, page * size + size) });
  },

  async getAnalytics(filters) {
    const filtered = filterRows(filters);
    const quarterlyBreakdown = [1, 2, 3, 4].map((quarter) => {
      const quarterRows = filtered.filter((row) => toQuarter(row.appliedDate) === quarter);
      const completed = quarterRows.filter((row) => row.status === 'COMPLETED').length;
      const rejected = quarterRows.filter((row) => row.status === 'REJECTED').length;
      const inProgress = quarterRows.filter((row) => row.status === 'IN_PROGRESS').length;
      return { quarter: 'Q' + quarter, completed, rejected, inProgress, total: completed + rejected + inProgress };
    });
    return wait({
      total: filtered.length,
      statusBreakdown: countBy(filtered, 'status', ['COMPLETED', 'REJECTED', 'IN_PROGRESS']),
      cardTypeBreakdown: countBy(filtered, 'cardType', ['PREMIUM_CARD', 'PLATINUM_CARD']),
      cardTypeStatusBreakdown: ['PREMIUM_CARD', 'PLATINUM_CARD'].map((cardType) => {
        const cardRows = filtered.filter((row) => row.cardType === cardType);
        const completed = cardRows.filter((row) => row.status === 'COMPLETED').length;
        const rejected = cardRows.filter((row) => row.status === 'REJECTED').length;
        const inProgress = cardRows.filter((row) => row.status === 'IN_PROGRESS').length;
        return { cardType, completed, rejected, inProgress, total: completed + rejected + inProgress };
      }),
      quarterlyBreakdown,
    });
  },

  async getProcessedFiles() {
    return wait({ items: processedFiles, total: processedFiles.length });
  },
};
