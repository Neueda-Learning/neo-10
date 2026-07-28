export function formatUtc(iso) {
  if (!iso) return '—';
  return iso.slice(0, 16).replace('T', ' ') + ' UTC';
}

export function formatRange(range) {
  if (!range) return '—';
  return range.from + ' → ' + range.to;
}

export function formatMoney(value) {
  if (value == null) return '—';
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatApr(value) {
  return value == null ? '—' : Number(value).toFixed(1) + '%';
}

export function formatHours(value) {
  return value == null ? '—' : Number(value).toFixed(1) + ' h';
}

export function formatPercent(value, total) {
  if (!total) return '0.0%';
  return ((value / total) * 100).toFixed(1) + '%';
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
