import React, { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Caption,
  Card,
  Field,
  FormActions,
  FormGrid,
  KeyValue,
  Select,
  StatusPill,
  TextInput,
} from '../design-system';
import { formatRange, formatUtc } from '../dashboard/format.js';

export default function AnalyticsContextBar({
  range,
  snapshots,
  snapshot,
  selectionMode,
  availability,
  onApplyRange,
  onSelectSnapshot,
  onTakeSnapshot,
  takingSnapshot,
  error,
  takeError,
}) {
  const [draft, setDraft] = useState(range);
  const [rangeError, setRangeError] = useState(null);

  useEffect(() => {
    setDraft(range);
  }, [range.from, range.to]);

  function submit(event) {
    event.preventDefault();
    if (!draft.from || !draft.to || draft.from > draft.to) {
      setRangeError('Choose a valid reporting range where From is on or before To.');
      return;
    }
    setRangeError(null);
    onApplyRange(draft);
  }

  const rangeDirty = draft.from !== range.from || draft.to !== range.to;

  return (
    <Card
      className="analytics-context"
      title="Snapshot context"
      subtitle="Every answer below is served from frozen rows, never the live journey feed."
      headEnd={
        availability === 'available' ? (
          <StatusPill tone="positive">Snapshot available</StatusPill>
        ) : availability === 'loading' ? (
          <StatusPill tone="info">Checking coverage</StatusPill>
        ) : availability === 'error' ? (
          <StatusPill tone="negative">Context unavailable</StatusPill>
        ) : (
          <StatusPill tone="warning">No covering snapshot</StatusPill>
        )
      }
    >
      <form onSubmit={submit}>
        <FormGrid cols={3}>
          <Field label="From">
            {({ id, describedBy }) => (
              <TextInput
                id={id}
                type="date"
                value={draft.from}
                aria-describedby={describedBy}
                disabled={takingSnapshot}
                onChange={(event) => setDraft((value) => ({ ...value, from: event.target.value }))}
              />
            )}
          </Field>
          <Field label="To">
            {({ id, describedBy }) => (
              <TextInput
                id={id}
                type="date"
                value={draft.to}
                aria-describedby={describedBy}
                disabled={takingSnapshot}
                onChange={(event) => setDraft((value) => ({ ...value, to: event.target.value }))}
              />
            )}
          </Field>
          <Field label="Pinned snapshot" hint="Optional: choose a historical snapshot explicitly.">
            {({ id, describedBy }) => (
              <Select
                id={id}
                value={selectionMode === 'pinned' ? snapshot?.snapshotId ?? '' : ''}
                placeholder="Latest covering snapshot"
                aria-describedby={describedBy}
                disabled={takingSnapshot}
                options={snapshots.map((item) => ({
                  value: item.snapshotId,
                  label: item.snapshotId + ' · ' + item.range.from + ' → ' + item.range.to,
                }))}
                onChange={(event) => onSelectSnapshot(event.target.value || null)}
              />
            )}
          </Field>
        </FormGrid>
        <FormActions>
          <Button type="submit" variant="secondary" disabled={takingSnapshot}>
            Apply range
          </Button>
          <Button type="button" variant="primary" onClick={onTakeSnapshot} disabled={takingSnapshot || rangeDirty}>
            {takingSnapshot ? 'Taking snapshot…' : 'Take snapshot'}
          </Button>
        </FormActions>
      </form>

      {rangeDirty && (
        <Caption>Apply the edited range before taking its snapshot.</Caption>
      )}

      {rangeError && (
        <Alert tone="warning" title="Reporting range needs attention">
          {rangeError}
        </Alert>
      )}

      {error && (
        <Alert tone="negative" title="Could not load frozen analytics">
          {error}
        </Alert>
      )}

      {takeError && (
        <Alert tone="negative" title="Snapshot was not created">
          {takeError} No partial data was persisted.
        </Alert>
      )}

      {snapshot ? (
        <div className="analytics-context__facts">
          <KeyValue
            stacked
            items={[
              { label: 'Snapshot ID', value: snapshot.snapshotId, mono: true },
              ['Report range', formatRange(range)],
              ['Snapshot coverage', formatRange(snapshot.range)],
              ['Taken at', formatUtc(snapshot.takenAt)],
              ['Source', snapshot.source],
              ['Frozen rows', snapshot.rowCount],
              ['Selection', selectionMode === 'pinned' ? 'Pinned historical snapshot' : 'Latest covering snapshot'],
            ]}
          />
          <Caption>
            A correction is a new snapshot. This selected record cannot be edited, refreshed or deleted.
          </Caption>
        </div>
      ) : availability === 'no-snapshot' ? (
        <Alert tone="warning" title="Take a snapshot first">
          No frozen record covers this period. Analytics deliberately does not read the live journey feed.
        </Alert>
      ) : availability === 'loading' ? (
        <Caption>Resolving frozen snapshot coverage for this reporting range.</Caption>
      ) : null}
    </Card>
  );
}
