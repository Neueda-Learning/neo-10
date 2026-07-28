import React from 'react';
import {
  Alert,
  Button,
  Caption,
  EmptyState,
  Grid,
  MetricTile,
  PageHeader,
  Section,
} from '../design-system';
import { formatPercent, formatUtc } from '../dashboard/format.js';
import { statusTone } from '../status.js';
import AnalyticsContextBar from './AnalyticsContextBar.jsx';

export default function OutcomeSummaryScreen({
  context,
  snapshots,
  analytics,
  onApplyRange,
  onSelectSnapshot,
  onTakeSnapshot,
  takingSnapshot,
  onOpenSnapshots,
}) {
  const summary = analytics?.summary;

  return (
    <>
      <PageHeader
        title="Outcome summary"
        lede="counts by journey status · snapshot-served · counted by submittedAt"
        meta={
          context.snapshot
            ? context.snapshot.snapshotId + ' · generated from frozen rows at ' + formatUtc(context.snapshot.takenAt)
            : 'No live feed fallback'
        }
        actions={
          <Button variant="secondary" onClick={onOpenSnapshots}>
            View snapshots
          </Button>
        }
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
        <EmptyState
          title="No snapshot covers this period"
          action={
            <Button variant="primary" onClick={onTakeSnapshot} disabled={takingSnapshot}>
              Take snapshot
            </Button>
          }
        >
          Summary numbers are withheld rather than calculated from the live journey feed.
        </EmptyState>
      ) : context.error ? (
        <EmptyState title="Could not load the frozen outcome summary">
          {context.error} Change the reporting context or try again after the service is available.
        </EmptyState>
      ) : context.availability === 'loading' || !summary ? (
        <EmptyState title="Loading frozen analytics">Resolving the answering snapshot and its rows.</EmptyState>
      ) : (
        <>
          {summary.partialDay && (
            <Alert tone="warning" title="Partial day">
              The selected period includes today. Today is not complete for reporting purposes.
            </Alert>
          )}

          <Section title="Portfolio outcomes" aside="The one answer to “How did we do?”">
            <Grid cols="auto" min={150} gap={3}>
              <MetricTile label="Total journeys" value={summary.total} hint="In selected period" />
              <MetricTile
                label="Completed"
                value={summary.counts.COMPLETED}
                hint={formatPercent(summary.counts.COMPLETED, summary.total)}
                tone={statusTone('COMPLETED')}
              />
              <MetricTile
                label="Rejected"
                value={summary.counts.REJECTED}
                hint={formatPercent(summary.counts.REJECTED, summary.total)}
                tone={statusTone('REJECTED')}
              />
              <MetricTile
                label="Referred"
                value={summary.counts.REFERRED}
                hint={formatPercent(summary.counts.REFERRED, summary.total)}
                tone={statusTone('REFERRED')}
              />
              <MetricTile
                label="In progress"
                value={summary.counts.IN_PROGRESS}
                hint={formatPercent(summary.counts.IN_PROGRESS, summary.total)}
                tone={statusTone('IN_PROGRESS')}
              />
            </Grid>
          </Section>
          <Caption>
            Answered by {summary.snapshotId} · period {summary.period.from} → {summary.period.to} · generated at{' '}
            {formatUtc(summary.generatedAt)} · Outcome Summary rule v{summary.definitionVersion ?? '—'}
          </Caption>
        </>
      )}
    </>
  );
}
