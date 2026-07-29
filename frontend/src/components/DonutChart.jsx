import React from 'react';
import { Badge } from '../design-system';

const toneFor = {
  COMPLETED: 'positive',
  REJECTED: 'negative',
  IN_PROGRESS: 'info',
  PREMIUM_CARD: 'info',
  PLATINUM_CARD: 'warning',
};

const labelFor = {
  COMPLETED: 'Completed',
  REJECTED: 'Rejected',
  IN_PROGRESS: 'In progress',
  PREMIUM_CARD: 'Premium Card',
  PLATINUM_CARD: 'Platinum Card',
};

export default function DonutChart({ items, valueKey, total, emptyLabel = 'No matching records' }) {
  const nonZero = items.filter((item) => item.count > 0);
  if (total === 0) return <div className="csv-chart-empty">{emptyLabel}</div>;

  let cursor = 0;
  const segments = nonZero.map((item) => {
    const start = cursor;
    cursor += (item.count / total) * 100;
    return `var(--ds-tone-${toneFor[item[valueKey]]}-accent) ${start}% ${cursor}%`;
  });

  return (
    <div className="csv-donut-layout">
      <div className="csv-donut" style={{ background: 'conic-gradient(' + segments.join(', ') + ')' }} aria-label={items.map((item) => labelFor[item[valueKey]] + ': ' + item.count).join(', ')}>
        <div className="csv-donut__center"><strong>{total}</strong><span>records</span></div>
      </div>
      <ul className="csv-donut-legend">
        {items.map((item) => {
          const value = item[valueKey];
          return (
            <li key={value}>
              <Badge tone={toneFor[value]} dot>{labelFor[value]}</Badge>
              <span>{item.count}</span>
              <span>{total ? Math.round((item.count / total) * 100) : 0}%</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
