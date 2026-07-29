import React from 'react';
import { Badge } from '../design-system';
import { formatCardType, formatEnumLabel } from '../status.js';

export const OUTCOMES = [
  { key: 'completed', label: 'Completed' }, { key: 'rejected', label: 'Rejected' },
  { key: 'referred', label: 'Referred' }, { key: 'inProgress', label: 'In progress' },
];

export function OutcomeBars({ items, formatLabel = (value) => value }) {
  if (!items?.some((item) => item.total > 0)) return <EmptyChart />;
  return <div className="csv-outcome-bars">
    {items.filter((item) => item.total > 0).map((item) => {
      const visibleTotal = OUTCOMES.reduce((sum, outcome) => sum + item[outcome.key], 0);
      return <div className="csv-outcome-row" key={item.label}>
        <div className="csv-outcome-head"><strong>{formatLabel(item.label)}</strong><span>{item.completionRate}% completed · {item.total} records</span></div>
        <div className="csv-mix-track" aria-label={`${formatLabel(item.label)} outcome distribution`}>
          {OUTCOMES.map((outcome) => <span key={outcome.key} className={`csv-mix-segment csv-mix-segment--${outcome.key}`} style={{ width: `${visibleTotal ? item[outcome.key] * 100 / visibleTotal : 0}%` }} />)}
        </div>
      </div>;
    })}
    <Legend />
  </div>;
}

export function JourneyChart({ items, formatLabel = (value) => value }) {
  if (!items?.length) return <EmptyChart />;
  const max = Math.max(1, ...items.flatMap((item) => OUTCOMES.map((outcome) => item[outcome.key])));
  return <div className="csv-journey">
    {items.map((item) => <div className="csv-journey-row" key={item.step}>
      <div className="csv-journey-label"><strong>{formatLabel(item.name)}</strong><span>Step {item.step} · {item.reached} reached</span></div>
      <div className="csv-journey-bars">{OUTCOMES.map((outcome) => <div className="csv-journey-line" key={outcome.key}>
        <span>{outcome.label}</span><div className="csv-bar-track"><i className={`csv-bar-fill csv-bar-fill--${outcome.key}`} style={{ width: `${item[outcome.key] * 100 / max}%` }} /></div><b>{item[outcome.key]}</b>
      </div>)}</div>
    </div>)}
  </div>;
}

export function HorizontalBars({ items, labelKey = 'label', valueKey = 'count', formatLabel = (value) => value, formatValue = (value) => value }) {
  if (!items?.some((item) => Number(item[valueKey]) > 0)) return <EmptyChart />;
  const max = Math.max(1, ...items.map((item) => Number(item[valueKey]) || 0));
  return <div className="csv-ranked-bars">{items.filter((item) => Number(item[valueKey]) > 0).map((item) => {
    const sourceLabel = item[labelKey];
    const displayLabel = formatLabel(sourceLabel);
    return <div className="csv-ranked-row" key={sourceLabel}>
      <span title={displayLabel === sourceLabel ? displayLabel : `${displayLabel} · Source code: ${sourceLabel}`}>{displayLabel}</span>
      <div className="csv-bar-track"><i className="csv-bar-fill csv-bar-fill--accent" style={{ width: `${Number(item[valueKey]) * 100 / max}%` }} /></div>
      <b>{formatValue(item[valueKey])}</b>
    </div>;
  })}</div>;
}

export function MonthlyTrend({ items }) {
  if (!items?.some((item) => item.total > 0)) return <EmptyChart />;
  const max = Math.max(1, ...items.flatMap((item) => OUTCOMES.map((outcome) => item[outcome.key])));
  return <div className="csv-trend">
    <div className="csv-month-groups">{items.map((item) => <div className="csv-month-group" key={item.period}>
      <div className="csv-month-bars">{OUTCOMES.map((outcome) => <div className="csv-month-bar" key={outcome.key} title={`${item.period} ${outcome.label}: ${item[outcome.key]}`}>
        <span>{item[outcome.key]}</span>
        <i className={`csv-bar-fill csv-bar-fill--${outcome.key}`} style={{ height: `${item[outcome.key] * 100 / max}%` }} />
      </div>)}</div>
      <strong>{item.period}</strong>
    </div>)}</div>
    <Legend />
  </div>;
}

export function LimitComparison({ items }) {
  if (!items?.length) return <EmptyChart />;
  const max = Math.max(1, ...items.flatMap((item) => [Number(item.averageRequested), Number(item.averageGranted)]));
  return <div className="csv-limit-chart">{items.map((item) => <div className="csv-limit-row" key={item.label}>
    <strong>{formatCardType(item.label)}</strong>
    {[['Average requested', item.averageRequested, 'requested'], ['Average granted', item.averageGranted, 'granted']].map(([label, value, tone]) => <div className="csv-limit-line" key={label}><span>{label}</span><div className="csv-bar-track"><i className={`csv-bar-fill csv-bar-fill--${tone}`} style={{ width: `${Number(value) * 100 / max}%` }} /></div><b>{money(value)}</b></div>)}
  </div>)}</div>;
}

export function CompactDistribution({ title, items }) {
  const total = items?.reduce((sum, item) => sum + item.count, 0) ?? 0;
  return <div className="csv-compact"><strong>{title}</strong>{total === 0 ? <span className="csv-muted">No data</span> : items.map((item) => <div key={item.label}><Badge tone={controlTone(item.label)}>{formatEnumLabel(item.label)}</Badge><span>{item.count}</span></div>)}</div>;
}

export function RateBars({ items }) { return <HorizontalBars items={items} valueKey="rate" formatValue={(value) => `${value}%`} />; }

export function Legend() { return <div className="csv-chart-legend">{OUTCOMES.map((outcome) => <span key={outcome.key}><i className={`csv-dot csv-dot--${outcome.key}`} />{outcome.label}</span>)}</div>; }
export function EmptyChart() { return <div className="csv-chart-empty">No matching records</div>; }
export function money(value) { return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 }).format(Number(value) || 0); }
function controlTone(value) { return /CLEAR|VERIFIED|SIGNED/.test(value) ? 'positive' : /REVIEW|PENDING/.test(value) ? 'warning' : 'negative'; }
