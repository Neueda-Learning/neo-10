import React, { useState } from 'react';
import {
  Button,
  Caption,
  Card,
  EmptyState,
  KeyValue,
  PageHeader,
  Section,
  Tag,
} from '../design-system';
import { downloadBlob, formatRange, formatUtc } from '../dashboard/format.js';
import AnalyticsContextBar from './AnalyticsContextBar.jsx';

export default function RegulatoryExtractScreen({
  context,
  snapshots,
  extractMeta,
  onApplyRange,
  onSelectSnapshot,
  onTakeSnapshot,
  takingSnapshot,
  onDownload,
}) {
  const [downloading, setDownloading] = useState(false);
  const [showColumns, setShowColumns] = useState(false);
  const [downloadError, setDownloadError] = useState(null);

  async function download() {
    setDownloading(true);
    setDownloadError(null);
    try {
      const file = await onDownload();
      downloadBlob(file.blob, file.filename);
    } catch (error) {
      setDownloadError(error.message);
    } finally {
      setDownloading(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Regulatory extract"
        lede="14 published columns · decided journeys only · byte-stable CSV"
        meta={context.snapshot ? context.snapshot.snapshotId + ' · generated from ' + formatUtc(context.snapshot.takenAt) : 'No live feed fallback'}
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
        <EmptyState title="No regulatory extract without a snapshot">
          The CSV is a reproducible rendering of frozen rows, not a live export.
        </EmptyState>
      ) : context.error ? (
        <EmptyState title="Could not prepare the regulatory extract">
          {context.error} The dashboard will not substitute a browser-generated or live-feed export.
        </EmptyState>
      ) : context.availability === 'loading' || !extractMeta ? (
        <EmptyState title="Preparing extract context">Checking the answering snapshot and published contract.</EmptyState>
      ) : (
        <Section title="Published CSV contract" aside="One row per decided journey: COMPLETED or REJECTED.">
          <Card
            title="Ready to export"
            subtitle="The frontend downloads the server CSV unchanged when the live API is connected."
            foot={
              <Caption>
                Same snapshot + same period = the same file bytes. generated_at is the snapshot takenAt, never the wall clock.
              </Caption>
            }
          >
            <div className="analytics-extract-grid">
              <KeyValue
                stacked
                items={[
                  ['Snapshot ID', extractMeta.snapshotId],
                  ['Period', formatRange(context.range)],
                  ['Decided rows', extractMeta.rowCount],
                  ['Generated at', formatUtc(extractMeta.generatedAt)],
                  ['Extract rule', 'v' + (extractMeta.definitionVersion ?? '—')],
                  ['Content type', 'text/csv'],
                ]}
              />
              <div className="analytics-extract__actions">
                <Button variant="primary" onClick={download} disabled={downloading}>
                  {downloading ? 'Preparing CSV…' : 'Download CSV'}
                </Button>
                <Button variant="secondary" onClick={() => setShowColumns((value) => !value)}>
                  {showColumns ? 'Hide columns' : 'View 14 columns'}
                </Button>
                {downloadError && <p className="analytics-inline-error">{downloadError}</p>}
              </div>
            </div>
            {showColumns && (
              <ol className="analytics-column-list">
                {extractMeta.columns.map((column) => (
                  <li key={column}>
                    <Tag>{column}</Tag>
                  </li>
                ))}
              </ol>
            )}
          </Card>
        </Section>
      )}
    </>
  );
}
