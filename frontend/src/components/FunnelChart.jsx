import React from 'react';
import { Tag } from '../design-system';

export default function FunnelChart({ rows }) {
  const maximum = Math.max(1, ...rows.map((row) => row.reached));

  return (
    <div className="analytics-funnel" role="list" aria-label="Step funnel">
      {rows.map((row) => {
        const reachedWidth = Math.round((row.reached / maximum) * 100);
        const passedWidth = Math.round((row.passed / maximum) * 100);
        const dropOff = row.reached - row.passed;
        return (
          <div className="analytics-funnel__row" role="listitem" key={row.step}>
            <Tag>{row.step}</Tag>
            <div className="analytics-funnel__measure">
              <span className="analytics-funnel__measure-label">Reached {row.reached}</span>
              <span className="analytics-funnel__track" aria-hidden="true">
                <span className="analytics-funnel__fill analytics-funnel__fill--reached" style={{ width: reachedWidth + '%' }} />
              </span>
            </div>
            <div className="analytics-funnel__measure">
              <span className="analytics-funnel__measure-label">Passed {row.passed}</span>
              <span className="analytics-funnel__track" aria-hidden="true">
                <span className="analytics-funnel__fill analytics-funnel__fill--passed" style={{ width: passedWidth + '%' }} />
              </span>
            </div>
            <span className="analytics-funnel__drop">Drop {dropOff}</span>
          </div>
        );
      })}
    </div>
  );
}
