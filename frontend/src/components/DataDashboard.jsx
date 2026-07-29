import React from 'react';
import { Alert, Badge, Card, DataTable, EmptyState, Grid, MetricTile, PageHeader, Section, StatusPill } from '../design-system';
import { cardTypeTone, formatCardType, processedTone, statusTone } from '../status.js';
import CardOutcomeChart from './CardOutcomeChart.jsx';
import CsvUploadPanel from './CsvUploadPanel.jsx';
import DashboardFilters from './DashboardFilters.jsx';
import DonutChart from './DonutChart.jsx';
import QuarterlyChart from './QuarterlyChart.jsx';

function formatDate(value) {
  return value ? new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value + 'T12:00:00')) : '—';
}

const pageCopy = {
  overview: { title: 'Portfolio overview', lede: 'Status distribution in the selected reporting range.', meta: 'Use the navigation to explore trends, card outcomes, records and import history.' },
  quarterly: { title: 'Quarterly trend', lede: 'Q1 to Q4 status counts, calculated from applied_date.', meta: 'Completed, Rejected and In progress are shown together for comparison.' },
  cards: { title: 'Card analysis', lede: 'Compare Premium Card and Platinum Card volume and outcomes.', meta: 'Card type is both a global filter and an analysis dimension.' },
  'raw-data': { title: 'Raw data', lede: 'The first 50 records matching the reporting filters.', meta: 'Use this table to trace the records behind the charts.' },
  files: { title: 'Processed files', lede: 'Upload CSV files and review the processing history.', meta: 'Processed files prevent the same import from being handled twice.' },
};

export default function DataDashboard({
  screen,
  filters,
  onApplyFilters,
  onUpload,
  rows,
  total,
  analytics,
  processed,
  loading,
  processedLoading,
  error,
  processedError,
}) {
  const copy = pageCopy[screen] ?? pageCopy.overview;
  const completed = analytics?.statusBreakdown?.find((item) => item.status === 'COMPLETED')?.count ?? 0;
  const rejected = analytics?.statusBreakdown?.find((item) => item.status === 'REJECTED')?.count ?? 0;
  const inProgress = analytics?.statusBreakdown?.find((item) => item.status === 'IN_PROGRESS')?.count ?? 0;
  const rawColumns = [
    { key: 'id', header: 'Record ID', numeric: true, tight: true },
    { key: 'status', header: 'Status', render: (row) => <Badge tone={statusTone(row.status)}>{row.status}</Badge> },
    { key: 'cardType', header: 'Card type', render: (row) => <Badge tone={cardTypeTone(row.cardType)}>{formatCardType(row.cardType)}</Badge> },
    { key: 'appliedDate', header: 'Applied date', render: (row) => formatDate(row.appliedDate) },
  ];
  const fileColumns = [
    { key: 'filename', header: 'Filename', mono: true },
    { key: 'status', header: 'Status', render: (row) => <StatusPill tone={processedTone(row.status)}>{row.status}</StatusPill> },
    { key: 'rowCount', header: 'Rows imported', numeric: true, render: (row) => row.rowCount ?? '—' },
    { key: 'processedAt', header: 'Processed at', render: (row) => row.processedAt ? new Date(row.processedAt).toLocaleString('en-GB') : '—' },
  ];
  const isFileScreen = screen === 'files';

  return (
    <>
      <PageHeader title={copy.title} lede={copy.lede} meta={copy.meta} />
      {!isFileScreen && <DashboardFilters filters={filters} onApply={onApplyFilters} />}

      {isFileScreen ? (
        <>
          <CsvUploadPanel onUpload={onUpload} />
          {processedError ? (
            <Alert tone="negative" title="Processed-file history is unavailable">{processedError}</Alert>
          ) : processedLoading ? (
            <EmptyState title="Loading processed files">Reading the import history.</EmptyState>
          ) : (
            <Section title="Import history" aside="One row represents one CSV processing attempt.">
              <Card flush>
                <DataTable
                  columns={fileColumns}
                  rows={processed.items}
                  total={processed.total}
                  maxRows={50}
                  rowKey={(row, index) => row.id ?? row.filename + index}
                  empty={<EmptyState title="No files processed yet">Upload one or more CSV files to start building raw_data.</EmptyState>}
                />
              </Card>
            </Section>
          )}
        </>
      ) : error ? (
        <Alert tone="negative" title="Dashboard data is unavailable">{error}</Alert>
      ) : loading ? (
        <EmptyState title="Loading dashboard data">Reading matching raw_data records and chart totals.</EmptyState>
      ) : (
        <ScreenContent
          screen={screen}
          analytics={analytics}
          rows={rows}
          total={total}
          completed={completed}
          rejected={rejected}
          inProgress={inProgress}
          rawColumns={rawColumns}
        />
      )}
    </>
  );
}

function ScreenContent({ screen, analytics, rows, total, completed, rejected, inProgress, rawColumns }) {
  if (screen === 'quarterly') {
    return <Section title="Quarterly outcome trend" aside="Each calendar quarter contains three bars: Completed, Rejected and In progress. Quarters are calculated from applied_date."><Card><QuarterlyChart items={analytics?.quarterlyBreakdown ?? []} /></Card></Section>;
  }

  if (screen === 'cards') {
    return (
      <div className="csv-chart-grid">
        <Section title="Card type distribution" aside="Business volume split between the two available card products."><Card><DonutChart items={analytics?.cardTypeBreakdown ?? []} valueKey="cardType" total={analytics?.total ?? 0} /></Card></Section>
        <Section title="Card outcome mix" aside="Each product is shown as a 100% mix of the three outcome states."><Card><CardOutcomeChart items={analytics?.cardTypeStatusBreakdown ?? []} /></Card></Section>
      </div>
    );
  }

  if (screen === 'raw-data') {
    return <Section title="Imported raw data" aside="The first 50 matching raw_data rows are shown; database IDs are generated on import."><Card flush><DataTable columns={rawColumns} rows={rows} total={total} maxRows={50} rowKey={(row) => row.id} footnote="Filtered by start date, end date and card type." empty={<EmptyState title="No matching raw_data records">Change the date range or card type, or upload a CSV file.</EmptyState>} /></Card></Section>;
  }

  return (
    <>
      <Grid cols={4} className="csv-metrics">
        <MetricTile label="Matching records" value={analytics?.total ?? 0} hint="Applied date and card type filter" />
        <MetricTile label="Completed" value={completed} hint="Successful outcomes" tone="positive" />
        <MetricTile label="Rejected" value={rejected} hint="Unsuccessful outcomes" tone="negative" />
        <MetricTile label="In progress" value={inProgress} hint="Pending outcomes" tone="info" />
      </Grid>
      <Section title="Status breakdown" aside="Completed, Rejected and In progress in the selected data range."><Card className="csv-overview-chart"><DonutChart items={analytics?.statusBreakdown ?? []} valueKey="status" total={analytics?.total ?? 0} /></Card></Section>
    </>
  );
}
