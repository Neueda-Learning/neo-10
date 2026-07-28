import React from 'react';
import {
  BarChart,
  Card,
  DataTable,
  EmptyState,
  PageHeader,
  Section,
  Tag,
} from '../design-system';
import { formatUtc } from '../dashboard/format.js';
import AnalyticsContextBar from './AnalyticsContextBar.jsx';
import FunnelChart from './FunnelChart.jsx';

export default function FunnelDeclineScreen({
  context,
  snapshots,
  analytics,
  onApplyRange,
  onSelectSnapshot,
  onTakeSnapshot,
  takingSnapshot,
}) {
  const funnelPayload = analytics?.funnel;
  const declinePayload = analytics?.declineReasons;
  const funnel = Array.isArray(funnelPayload) ? funnelPayload : funnelPayload?.steps ?? [];
  const reasons = Array.isArray(declinePayload) ? declinePayload : declinePayload?.reasons ?? [];
  const reasonColumns = [
    { key: 'rank', header: 'Rank', tight: true, numeric: true },
    { key: 'code', header: 'Reason code', render: (row) => <Tag>{row.code}</Tag> },
    { key: 'count', header: 'Count', numeric: true },
  ];
  const rankedReasons = reasons.map((row, index) => ({ ...row, rank: index + 1 }));
  const visibleReasons = rankedReasons.slice(0, 10);

  return (
    <>
      <PageHeader
        title="Funnel & decline reasons"
        lede="one snapshot context · 8 saga steps · one frozen reason per rejection"
        meta={context.snapshot ? context.snapshot.snapshotId + ' · taken ' + formatUtc(context.snapshot.takenAt) : 'No live feed fallback'}
      />

      <AnalyticsContextBar
        range={context.range}
        snapshots={snapshots}
        snapshot={context.snapshot}
        selectionMode={context.selectionMode}
        availability={context.availability}
        onApplyRange={onApplyRange}
        onSelectSnapshot={onSelectSnapshot}
        onTakeSnapshot={onTakeSnapshot}
        takingSnapshot={takingSnapshot}
        error={context.error}
        takeError={context.takeError}
      />

      {context.availability === 'no-snapshot' ? (
        <EmptyState title="Take a snapshot before analysing the funnel">
          The funnel and Pareto never inspect the live journey feed.
        </EmptyState>
      ) : context.error ? (
        <EmptyState title="Could not load frozen funnel analytics">
          {context.error} No live-feed fallback is available for this report.
        </EmptyState>
      ) : context.availability === 'loading' || !analytics ? (
        <EmptyState title="Loading frozen funnel">Reading the selected snapshot rows.</EmptyState>
      ) : (
        <div className="analytics-analysis-grid">
          <Section
            title="Step funnel"
            aside={'Reached and passed are counted from each frozen stepsJson entry · rule v' + (funnelPayload?.definitionVersion ?? '—')}
          >
            <Card>
              <FunnelChart rows={funnel} />
            </Card>
          </Section>
          <Section
            title="Decline reasons"
            aside={'Rejected journeys ranked by their deciding step first reason · rule v' + (declinePayload?.definitionVersion ?? '—')}
          >
            <Card>
              {rankedReasons.length > 0 ? (
                <>
                  <BarChart
                    data={visibleReasons.map((row) => ({
                      label: row.code,
                      value: row.count,
                    }))}
                    labelWidth="12rem"
                  />
                  <DataTable
                    columns={reasonColumns}
                    rows={visibleReasons}
                    total={rankedReasons.length}
                    rowKey={(row) => row.code}
                    footnote="count descending · code ascending on ties"
                  />
                </>
              ) : (
                <EmptyState title="No rejected journeys in this period">
                  An empty Pareto is a valid answer, not an error.
                </EmptyState>
              )}
            </Card>
          </Section>
        </div>
      )}
    </>
  );
}
