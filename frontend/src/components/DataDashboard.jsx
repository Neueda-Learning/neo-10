import React from 'react';
import {
  Alert,
  Badge,
  Card,
  DataTable,
  EmptyState,
  Grid,
  MetricTile,
  Section,
} from '../design-system';
import { cardTypeTone, formatCardType, statusTone } from '../status.js';
import DashboardFilters from './DashboardFilters.jsx';
import DonutChart from './DonutChart.jsx';
import QuarterlyChart from './QuarterlyChart.jsx';

function formatDate(value) {
  return value ? new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value + 'T12:00:00')) : '—';
}

export default function DataDashboard({ filters, onApplyFilters, rows, total, analytics, loading, error }) {
  const completed = analytics?.statusBreakdown?.find((item) => item.status === 'COMPLETED')?.count ?? 0;
  const rejected = analytics?.statusBreakdown?.find((item) => item.status === 'REJECTED')?.count ?? 0;
  const inProgress = analytics?.statusBreakdown?.find((item) => item.status === 'IN_PROGRESS')?.count ?? 0;
  const columns = [
    { key: 'id', header: 'Record ID', numeric: true, tight: true },
    { key: 'status', header: 'Status', render: (row) => <Badge tone={statusTone(row.status)}>{row.status}</Badge> },
    { key: 'cardType', header: 'Card type', render: (row) => <Badge tone={cardTypeTone(row.cardType)}>{formatCardType(row.cardType)}</Badge> },
    { key: 'appliedDate', header: 'Applied date', render: (row) => formatDate(row.appliedDate) },
  ];

  return (
    <>
      <DashboardFilters filters={filters} onApply={onApplyFilters} />
      {error ? (
        <Alert tone="negative" title="Dashboard data is unavailable">{error}</Alert>
      ) : loading ? (
        <EmptyState title="Loading dashboard data">Reading matching raw_data records and chart totals.</EmptyState>
      ) : (
        <>
          <Grid cols={4} className="csv-metrics">
            <MetricTile label="Matching records" value={analytics?.total ?? 0} hint="Applied date and card type filter" />
            <MetricTile label="Completed" value={completed} hint="Successful outcomes" tone="positive" />
            <MetricTile label="Rejected" value={rejected} hint="Unsuccessful outcomes" tone="negative" />
            <MetricTile label="In progress" value={inProgress} hint="Pending outcomes" tone="info" />
          </Grid>

          <div className="csv-chart-grid">
            <Section title="Status breakdown" aside="Completed, Rejected and In progress in the selected data range.">
              <Card>
                <DonutChart items={analytics?.statusBreakdown ?? []} valueKey="status" total={analytics?.total ?? 0} />
              </Card>
            </Section>
            <Section title="Card type breakdown" aside="Card types remain visible even when a single type is selected.">
              <Card>
                <DonutChart items={analytics?.cardTypeBreakdown ?? []} valueKey="cardType" total={analytics?.total ?? 0} />
              </Card>
            </Section>
          </div>

          <Section title="Quarterly outcome trend" aside="Each bar is a calendar quarter calculated from applied_date. Completed / Rejected / In progress.">
            <Card>
              <QuarterlyChart items={analytics?.quarterlyBreakdown ?? []} />
            </Card>
          </Section>

          <Section title="Imported raw data" aside="The first 50 matching raw_data rows are shown; database IDs are generated on import.">
            <Card flush>
              <DataTable
                columns={columns}
                rows={rows}
                total={total}
                maxRows={50}
                rowKey={(row) => row.id}
                footnote="Filtered by start date, end date and card type."
                empty={<EmptyState title="No matching raw_data records">Change the date range or card type, or upload a CSV file.</EmptyState>}
              />
            </Card>
          </Section>
        </>
      )}
    </>
  );
}
