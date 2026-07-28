export const DEFAULT_RANGE = {
  from: '2026-07-01',
  to: '2026-07-14',
};

export const JOURNEY_STATUSES = ['COMPLETED', 'REJECTED', 'REFERRED', 'IN_PROGRESS'];

export const STATUS_FILTERS = ['All', ...JOURNEY_STATUSES];

export const EXTRACT_COLUMNS = [
  'application_id',
  'submitted_at',
  'decided_at',
  'outcome',
  'product_code',
  'channel',
  'requested_credit_limit',
  'granted_credit_limit',
  'apr',
  'decline_reason_code',
  'journey_duration_hours',
  'period_start',
  'period_end',
  'generated_at',
];
