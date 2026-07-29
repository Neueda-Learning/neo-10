import React from 'react';

export default function QuarterlyChart({ items }) {
  // One common scale makes each status comparable across all quarters.
  const maximum = Math.max(
    1,
    ...items.flatMap((item) => [item.completed, item.rejected, item.inProgress]),
  );

  return (
    <div className="csv-quarterly" role="img" aria-label="Quarterly completed, rejected and in-progress records">
      {items.map((item) => {
        const bars = [
          { key: 'completed', value: item.completed },
          { key: 'rejected', value: item.rejected },
          { key: 'in-progress', value: item.inProgress },
        ];
        return (
          <div className="csv-quarterly__column" key={item.quarter}>
            <div className="csv-quarterly__total">Total {item.total}</div>
            <div className="csv-quarterly__plot" aria-label={`${item.quarter}: ${item.completed} completed, ${item.rejected} rejected, ${item.inProgress} in progress`}>
              {bars.map((bar) => (
                <div className="csv-quarterly__bar" key={bar.key}>
                  <span className="csv-quarterly__value">{bar.value}</span>
                  <span className={`csv-quarterly__segment csv-quarterly__segment--${bar.key}`} style={{ height: `${(bar.value / maximum) * 100}%` }} />
                </div>
              ))}
            </div>
            <span className="csv-quarterly__label">{item.quarter}</span>
            <span className="csv-quarterly__detail">{item.completed} / {item.rejected} / {item.inProgress}</span>
          </div>
        );
      })}
      <div className="csv-quarterly__legend"><span><i className="csv-dot csv-dot--completed" />Completed</span><span><i className="csv-dot csv-dot--rejected" />Rejected</span><span><i className="csv-dot csv-dot--in-progress" />In progress</span></div>
    </div>
  );
}
