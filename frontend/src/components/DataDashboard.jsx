import React, { useState } from 'react';
import { Alert, Badge, Card, DataTable, EmptyState, Grid, MetricTile, PageHeader, Section, StatusPill } from '../design-system';
import { formatApplicationStatus, formatCardType, formatChannel, formatDecisionReason, formatEmploymentStatus, formatEnumLabel, formatJourneyStep, processedTone, statusTone } from '../status.js';
import DashboardFilters from './DashboardFilters.jsx';
import DonutChart from './DonutChart.jsx';
import { CompactDistribution, HorizontalBars, JourneyChart, LimitComparison, money, MonthlyTrend, OutcomeBars, RateBars } from './AnalyticsCharts.jsx';

const copy = {
  overview: ['Portfolio overview', 'Application volume, outcomes, limits and leading decision reasons.'],
  journey: ['Journey funnel', 'Where applications reach, stop, reject or move to manual review.'],
  'product-channel': ['Product & channel', 'Compare product and acquisition-channel volume, outcome and limits.'],
  'credit-risk': ['Credit & risk', 'How applicant affordability, credit profile and operational checks relate to application outcomes.'],
  'raw-data': ['Raw data', 'Application snapshots behind every chart. Duplicate application IDs across files are retained.'],
  'scan-history': ['Scan history', 'Server-side folder scans, idempotent skips and file-level validation results.'],
};

export default function DataDashboard(props) {
  const { screen, filters, onApplyFilters, rows, total, analytics, processed, loading, processedLoading, error, processedError, actionResult } = props;
  const [expandedKey, setExpandedKey] = useState(null);
  const isDataScreen = screen === 'scan-history';
  const page = copy[screen] ?? copy.overview;

  const rawColumns = [
    { key: 'applicationId', header: 'Application', mono: true },
    { key: 'submittedAt', header: 'Submitted', render: (row) => dateTime(row.submittedAt) },
    { key: 'channel', header: 'Channel', render: (row) => formatChannel(row.channel) },
    { key: 'productCode', header: 'Product', render: (row) => formatCardType(row.productCode) },
    { key: 'status', header: 'Status', render: (row) => <Badge tone={statusTone(row.status)}>{formatApplicationStatus(row.status)}</Badge> },
    { key: 'stepsReached', header: 'Steps', numeric: true },
    { key: 'stoppedAtStep', header: 'Stopped at', render: (row) => formatJourneyStep(row.stoppedAtStep) },
    { key: 'declineReasonCode', header: 'Reason code', mono: true, render: (row) => row.declineReasonCode ?? '—' },
    { key: 'requestedLimit', header: 'Requested', numeric: true, render: (row) => money(row.requestedLimit) },
    { key: 'grantedLimit', header: 'Granted', numeric: true, render: (row) => row.grantedLimit == null ? '—' : money(row.grantedLimit) },
    { key: 'creditBand', header: 'Band' },
    { key: 'sourceFilename', header: 'Source file', mono: true },
  ];
  const fileColumns = [
    { key: 'filename', header: 'Filename', mono: true },
    { key: 'status', header: 'Status', render: (row) => <StatusPill tone={processedTone(row.status)}>{formatEnumLabel(row.status)}</StatusPill> },
    { key: 'rowsRead', header: 'Rows read', numeric: true }, { key: 'rowsInserted', header: 'Inserted', numeric: true },
    { key: 'checksum', header: 'Checksum', mono: true, render: (row) => row.checksum ? row.checksum.slice(0, 12) + '…' : '—' },
    { key: 'processedAt', header: 'Processed at', render: (row) => dateTime(row.processedAt) },
    { key: 'errorMessage', header: 'Error', render: (row) => row.errorMessage ?? '—' },
  ];

  return <>
    <PageHeader title={page[0]} lede={page[1]} meta={screen === 'scan-history' ? 'Scan and reset actions are in the left sidebar.' : 'All charts use the same From, To, Product and Channel filters.'} />
    {actionResult?.type === 'reset' && <Alert tone="positive" title="All dashboard data has been cleared">{actionResult.payload.rawRowsDeleted} raw rows, {actionResult.payload.processedFilesDeleted} scan-history records and {actionResult.payload.demoRowsDeleted ?? 0} demo records were deleted. Use Scan folder to load data again.</Alert>}
    {!isDataScreen && <DashboardFilters filters={filters} onApply={onApplyFilters} />}
    {screen === 'scan-history' ? <ScanHistory processed={processed} loading={processedLoading} error={processedError} columns={fileColumns} actionResult={actionResult} />
      : error ? <Alert tone="negative" title="Dashboard data is unavailable">{error}</Alert>
      : loading ? <EmptyState title="Loading dashboard data">Reading matching application records and chart totals.</EmptyState>
      : screen === 'raw-data' ? <Section title="Application records" aside="Click a row to see all imported fields."><Card flush><DataTable columns={rawColumns} rows={rows} total={total} maxRows={50} rowKey={(row) => row.id} expandedKey={expandedKey} onRowClick={(row, key) => setExpandedKey(expandedKey === key ? null : key)} renderExpanded={(row) => <RawDetail row={row} />} empty={<EmptyState title="No matching records">Scan the folder or change the filters.</EmptyState>} /></Card></Section>
      : <AnalyticsScreen screen={screen} analytics={analytics} />}
  </>;
}

function AnalyticsScreen({ screen, analytics }) {
  const count = (status) => analytics?.statusBreakdown?.find((item) => item.status === status)?.count ?? 0;
  if (screen === 'journey') return <>
    <Section title="Step outcome distribution" aside="Reached uses the sequential journey rule; all status bars share one scale."><Card><JourneyChart items={analytics?.journeySteps ?? []} formatLabel={formatJourneyStep} /></Card></Section>
    <div className="csv-chart-grid"><Section title="Stopped applications by step"><Card><HorizontalBars items={analytics?.stoppedByStep ?? []} formatLabel={formatJourneyStep} /></Card></Section><Section title="Top decline and referral reasons" aside="Plain-language labels ranked by occurrence; source codes remain in Raw data."><Card><HorizontalBars items={analytics?.topReasons ?? []} labelKey="reason" formatLabel={formatDecisionReason} /></Card></Section></div>
    <Section title="Step exception summary"><Card flush><DataTable maxRows={10} rows={analytics?.journeySteps ?? []} rowKey={(row) => row.step} columns={journeyColumns} /></Card></Section>
  </>;
  if (screen === 'product-channel') {
    const limits = Object.fromEntries((analytics?.productLimits ?? []).map((item) => [item.label, item]));
    const summary = (analytics?.productOutcomes ?? []).map((item) => ({ ...item, ...(limits[item.label] ?? {}) }));
    return <><div className="csv-chart-grid"><Section title="Outcome by card product"><Card><OutcomeBars items={analytics?.productOutcomes ?? []} formatLabel={formatCardType} /></Card></Section><Section title="Outcome by acquisition channel"><Card><OutcomeBars items={analytics?.channelOutcomes ?? []} formatLabel={formatChannel} /></Card></Section></div>
      <Section title="Average requested versus granted limit"><Card><LimitComparison items={analytics?.productLimits ?? []} /></Card></Section>
      <Section title="Product performance summary"><Card flush><DataTable rows={summary} rowKey={(row) => row.label} columns={productColumns} /></Card></Section></>;
  }
  if (screen === 'credit-risk') return <>
    <Card className="csv-risk-guide">
      <div><strong>Credit band</strong><span>Groups applications from stronger credit profile (A) to higher observed risk (E).</span></div>
      <div><strong>DTI ratio</strong><span>Debt-to-income: the share of income already committed to debt. A higher ratio means less repayment headroom.</span></div>
      <div><strong>Income completion rate</strong><span>The percentage completed inside each annual-income band. It is a portfolio comparison, not an approval rule.</span></div>
      <div><strong>Operational controls</strong><span>Screening checks fraud/AML signals, KYC checks identity, and Agreement tracks signature completion.</span></div>
    </Card>
    <div className="csv-chart-grid"><Section title="Application outcomes by credit band" aside="Compare Completed, Rejected, Referred and In progress within each A–E cohort."><Card><OutcomeBars items={analytics?.creditBandOutcomes ?? []} /></Card></Section><Section title="Application outcomes by DTI band" aside="Shows whether outcomes differ as existing debt commitments rise."><Card><OutcomeBars items={analytics?.dtiBandOutcomes ?? []} /></Card></Section></div>
    <Section title="Completion rate by annual-income band" aside="Completed applications divided by all applications in the same income band."><Card><RateBars items={analytics?.incomeCompletionRates ?? []} /></Card></Section>
    <Section title="Screening, identity and agreement checks" aside="Operational control outcomes help explain where an application needs review or stops."><Card><div className="csv-control-grid"><CompactDistribution title="Fraud / AML screening" items={analytics?.screeningOutcomes ?? []} /><CompactDistribution title="KYC identity check" items={analytics?.kycOutcomes ?? []} /><CompactDistribution title="Agreement status" items={analytics?.agreementOutcomes ?? []} /></div></Card></Section>
    <Section title="Application outcomes by age band" aside="Fairness and portfolio monitoring only; age is not presented as an automated approval rule."><Card><OutcomeBars items={analytics?.ageOutcomes ?? []} /></Card></Section>
    <Section title="Application outcomes by employment status" aside="Portfolio monitoring only; compare outcomes without treating employment status as a standalone decision."><Card><OutcomeBars items={analytics?.employmentOutcomes ?? []} formatLabel={formatEmploymentStatus} /></Card></Section>
    <Section title="Credit-band summary table" aside="The same A–E cohorts shown above, with exact counts and completion rates."><Card flush><DataTable rows={analytics?.creditBandOutcomes ?? []} rowKey={(row) => row.label} columns={riskColumns} /></Card></Section>
  </>;
  const completed = count('COMPLETED');
  const averageGranted = completed ? Number(analytics?.totalGrantedLimit ?? 0) / completed : 0;
  return <>
    <Grid cols={3} className="csv-metrics">
      <MetricTile label="Applications" value={analytics?.total ?? 0} hint="in the selected window" />
      <MetricTile label="Completed" value={completed} hint="reached a completed outcome" tone="positive" />
      <MetricTile label="Completion rate" value={`${analytics?.completionRate ?? 0}%`} hint="of all application records" tone="positive" />
      <MetricTile label="Total granted" value={money(analytics?.totalGrantedLimit)} hint="across completed applications" tone="positive" />
      <MetricTile label="Average granted" value={money(averageGranted)} hint="per completed application" />
      <MetricTile label="Median decision time" value={analytics?.medianDecisionMinutes == null ? '—' : `${analytics.medianDecisionMinutes} min`} hint="from submission to decision" tone="info" />
    </Grid>
    <Section title="Monthly outcome trend" aside="Four separate status bars per month, all using one scale."><Card><MonthlyTrend items={analytics?.monthlyTrend ?? []} /></Card></Section>
    <div className="csv-chart-grid"><Section title="Outcome distribution"><Card><DonutChart items={(analytics?.statusBreakdown ?? []).filter((item) => item.status !== 'FAILED')} valueKey="status" total={(analytics?.statusBreakdown ?? []).filter((item) => item.status !== 'FAILED').reduce((sum, item) => sum + item.count, 0)} /></Card></Section><Section title="Leading decision reasons" aside="Business-friendly labels; exact source codes remain in Raw data."><Card><HorizontalBars items={(analytics?.topReasons ?? []).slice(0, 5)} labelKey="reason" formatLabel={formatDecisionReason} /></Card></Section></div>
  </>;
}

function ScanHistory({ processed, loading, error, columns, actionResult }) {
  const payload = actionResult?.payload;
  const processedCount = processed.items.filter((item) => item.status === 'PROCESSED').length;
  const failedCount = processed.items.filter((item) => item.status === 'FAILED').length;
  return <>
    {actionResult?.type === 'error' && <Alert tone="negative" title="Action failed">{actionResult.message}</Alert>}
    {actionResult?.type === 'scan' && <Alert tone={payload.status === 'FAILED' ? 'negative' : payload.status === 'NO_NEW_FILES' ? 'warning' : 'positive'} title={payload.status === 'NO_NEW_FILES' ? 'No new files' : 'Folder scan complete'}>{payload.filesProcessed} processed · {payload.filesSkipped} skipped · {payload.filesFailed} failed · {payload.rowsInserted} rows inserted.</Alert>}
    <Grid cols={4} className="csv-metrics"><MetricTile label="History records" value={processed.total} /><MetricTile label="Processed" value={processedCount} tone="positive" /><MetricTile label="Failed" value={failedCount} tone="negative" /><MetricTile label="Rows inserted" value={processed.items.reduce((sum, item) => sum + (item.rowsInserted ?? 0), 0)} /></Grid>
    {error ? <Alert tone="negative" title="Scan history unavailable">{error}</Alert> : loading ? <EmptyState title="Loading scan history">Reading file processing history.</EmptyState> : <Section title="File processing audit" aside="A successfully processed filename is skipped by later scans."><Card flush><DataTable columns={columns} rows={processed.items} total={processed.total} maxRows={50} rowKey={(row) => row.id} empty={<EmptyState title="No files scanned yet">Use Scan folder in the left sidebar.</EmptyState>} /></Card></Section>}
  </>;
}

function RawDetail({ row }) { return <div className="csv-raw-detail">{rawDetailFields.map(({ key, label, render }) => <div key={key}><span>{label}</span><strong>{render ? render(row[key]) : row[key] ?? '—'}</strong></div>)}</div>; }
const rawDetailFields = [
  { key:'decidedAt',label:'Decision time',render:dateTime }, { key:'lastUpdatedAt',label:'Last updated',render:dateTime },
  { key:'ageBand',label:'Age band' }, { key:'residenceCountry',label:'Country of residence' },
  { key:'employmentStatus',label:'Employment status',render:formatEmploymentStatus },
  { key:'annualIncome',label:'Annual income',render:(value)=>money(value) },
  { key:'dtiRatio',label:'Debt-to-income ratio',render:(value)=>value == null ? '—' : `${Math.round(Number(value) * 100)}%` },
  { key:'apr',label:'Annual percentage rate',render:(value)=>value == null ? '—' : `${value}%` },
  { key:'screeningOutcome',label:'Fraud / AML screening',render:formatEnumLabel },
  { key:'kycOutcome',label:'KYC identity check',render:formatEnumLabel },
  { key:'agreementOutcome',label:'Agreement status',render:formatEnumLabel },
  { key:'sourceFileDate',label:'Source file date' }, { key:'importedAt',label:'Imported at',render:dateTime },
];
const journeyColumns = [{ key:'step',header:'#',numeric:true },{ key:'name',header:'Step',render:(row)=>formatJourneyStep(row.name) },{ key:'reached',header:'Reached',numeric:true },{ key:'stopped',header:'Stopped',numeric:true },{ key:'completed',header:'Completed',numeric:true },{ key:'rejected',header:'Rejected',numeric:true },{ key:'referred',header:'Referred',numeric:true },{ key:'inProgress',header:'In progress',numeric:true },{ key:'topReason',header:'Top reason',render:(row)=>formatDecisionReason(row.topReason) }];
const productColumns = [{key:'label',header:'Product',render:(row)=>formatCardType(row.label)},{key:'total',header:'Applications',numeric:true},{key:'completionRate',header:'Completed',numeric:true,render:(row)=>`${row.completionRate}%`},{key:'averageRequested',header:'Avg requested',numeric:true,render:(row)=>money(row.averageRequested)},{key:'averageGranted',header:'Avg granted',numeric:true,render:(row)=>money(row.averageGranted)},{key:'averageApr',header:'Avg APR',numeric:true,render:(row)=>`${row.averageApr}%`}];
const riskColumns = [{key:'label',header:'Credit band'},{key:'total',header:'Applications',numeric:true},{key:'completionRate',header:'Completed',numeric:true,render:(row)=>`${row.completionRate}%`},{key:'rejected',header:'Rejected',numeric:true},{key:'referred',header:'Referred',numeric:true},{key:'inProgress',header:'In progress',numeric:true}];
function dateTime(value) { return value ? new Date(value).toLocaleString('en-GB') : '—'; }
