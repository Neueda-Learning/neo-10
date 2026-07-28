import React from 'react';
import { Badge } from '../design-system';
import { formatCardType, cardTypeTone } from '../status.js';

const STATES = [
  { key: 'completed', label: 'Completed', tone: 'positive' },
  { key: 'rejected', label: 'Rejected', tone: 'negative' },
  { key: 'inProgress', label: 'In progress', tone: 'info' },
];

export default function CardOutcomeChart({ items }) {
  if (!items.length) return <div className="csv-chart-empty">No matching records</div>;
  return <div className="csv-card-outcomes">
    {items.map((item) => <div className="csv-card-outcomes__row" key={item.cardType}>
      <Badge tone={cardTypeTone(item.cardType)}>{formatCardType(item.cardType)}</Badge>
      <div className="csv-card-outcomes__track" aria-label={formatCardType(item.cardType) + ' outcome mix'}>{STATES.map((state) => <span key={state.key} className={'csv-card-outcomes__segment csv-card-outcomes__segment--' + state.key} style={{ width: (item.total ? (item[state.key] / item.total) * 100 : 0) + '%' }} />)}</div>
      <span className="csv-card-outcomes__total">{item.total}</span>
      <div className="csv-card-outcomes__counts">{STATES.map((state) => <span key={state.key}><i className={'csv-dot csv-dot--' + state.key} />{item[state.key]}</span>)}</div>
    </div>)}
    <div className="csv-card-outcomes__legend">{STATES.map((state) => <span key={state.key}><i className={'csv-dot csv-dot--' + state.key} />{state.label}</span>)}</div>
  </div>;
}
