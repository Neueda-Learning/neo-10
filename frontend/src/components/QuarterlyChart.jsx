import React from 'react';

export default function QuarterlyChart({ items }) {
  const maximum = Math.max(1, ...items.map((item) => item.total));

  return (
    <div className="csv-quarterly" role="img" aria-label="Quarterly completed, rejected and in-progress records">
      {items.map((item) => {
        const completedHeight = (item.completed / maximum) * 100;
        const rejectedHeight = (item.rejected / maximum) * 100;
        const inProgressHeight = (item.inProgress / maximum) * 100;
        return (
          <div className="csv-quarterly__column" key={item.quarter}>
            <div className="csv-quarterly__value">{item.total}</div>
            <div className="csv-quarterly__plot" aria-hidden="true">
              <span className="csv-quarterly__segment csv-quarterly__segment--in-progress" style={{ height: inProgressHeight + '%' }} />
              <span className="csv-quarterly__segment csv-quarterly__segment--rejected" style={{ height: rejectedHeight + '%' }} />
              <span className="csv-quarterly__segment csv-quarterly__segment--completed" style={{ height: completedHeight + '%' }} />
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
