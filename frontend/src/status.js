import { TONES, toneMapper } from './design-system';

export const statusTone = toneMapper({
  COMPLETED: TONES.POSITIVE,
  REJECTED: TONES.NEGATIVE,
  REFERRED: TONES.WARNING,
  IN_PROGRESS: TONES.INFO,
  FAILED: TONES.NEUTRAL,
});

export const cardTypeTone = toneMapper({
  CREDIT_CARD_STANDARD: TONES.INFO,
  CREDIT_CARD_REWARDS: TONES.WARNING,
  CREDIT_CARD_STUDENT: TONES.NEUTRAL,
});

export const processedTone = toneMapper({
  PROCESSED: TONES.POSITIVE,
  FAILED: TONES.NEGATIVE,
  SKIPPED: TONES.WARNING,
});

export function formatCardType(value) {
  const label = formatEnumLabel(String(value ?? '').replace('CREDIT_CARD_', ''));
  return label && label !== '—' ? `${label} Card` : label;
}

export function formatChannel(value) {
  return formatEnumLabel(value);
}

export function formatApplicationStatus(value) {
  return formatEnumLabel(value);
}

const EMPLOYMENT_STATUS_LABELS = {
  PERMANENT: 'Permanent',
  SELF_EMPLOYED: 'Self-employed',
  CONTRACT: 'Contract',
  RETIRED: 'Retired',
  STUDENT: 'Student',
  UNEMPLOYED: 'Unemployed',
};

export function formatEmploymentStatus(value) {
  if (!value) return '—';
  return EMPLOYMENT_STATUS_LABELS[String(value).trim().toUpperCase()] ?? formatEnumLabel(value);
}

const JOURNEY_STEP_LABELS = {
  verification: 'Application verification',
  policy: 'Customer policy',
  kyc: 'Identity verification (KYC)',
  screening: 'Fraud / AML screening',
  credit: 'Credit decision',
  agreement: 'Agreement',
  account: 'Account setup',
  card: 'Card issuing',
};

export function formatJourneyStep(value) {
  if (!value) return '—';
  return JOURNEY_STEP_LABELS[String(value).trim().toLowerCase()] ?? formatEnumLabel(value);
}

export function formatEnumLabel(value) {
  if (!value) return '—';
  const words = String(value).trim().replaceAll('_', ' ').toLowerCase();
  return words.replace(/^\w/, (letter) => letter.toUpperCase());
}

const DECISION_REASON_LABELS = {
  CRE_AFFORDABILITY_EXCEEDED: 'Affordability limit exceeded',
  CRE_INCOME_BELOW_MINIMUM: 'Income below minimum',
  KYC_LOW_CONFIDENCE: 'Low identity confidence',
  SCR_PARTIAL_MATCH: 'Partial screening match',
  POL_TAX_RESIDENCY_UNSUPPORTED: 'Unsupported tax residency',
  SCR_HIGH_RISK_COUNTRY: 'High-risk country screening',
  VER_INVALID_FIELD: 'Invalid application field',
  KYC_PROVIDER_UNAVAILABLE: 'Identity provider unavailable',
  VER_TERMS_NOT_ACCEPTED: 'Terms not accepted',
  POL_CUSTOMER_BLOCKED: 'Customer blocked by policy',
  VER_MISSING_FIELD: 'Required field missing',
  POL_TAX_RESIDENCY_EXCLUDED: 'Excluded tax residency',
  POL_EXISTING_PRODUCT_HELD: 'Existing product already held',
  ACC_CORE_UNAVAILABLE: 'Core account service unavailable',
  SCR_EXACT_MATCH: 'Exact screening match',
  KYC_DOCUMENT_INVALID: 'Identity document invalid',
  VER_LIMIT_OUTSIDE_PRODUCT_RANGE: 'Requested limit outside product range',
  VER_AGE_BELOW_MINIMUM: 'Applicant below minimum age',
  KYC_DOCUMENT_EXPIRED: 'Identity document expired',
  AGR_EXPIRED_UNSIGNED: 'Agreement expired before signing',
  CRD_BUREAU_UNAVAILABLE: 'Credit bureau unavailable',
  AGR_DECLINED_BY_CUSTOMER: 'Agreement declined by customer',
  AGR_PENDING_SIGNATURE: 'Agreement awaiting signature',
  AGR_PROVIDER_UNAVAILABLE: 'Agreement provider unavailable',
  ACC_DUPLICATE_PREVENTED: 'Duplicate account prevented',
  CRD_DELIVERY_ADDRESS_INVALID: 'Card delivery address invalid',
};

const REASON_PREFIXES = /^(?:ACC|AGR|CRD|CRE|KYC|POL|SCR|VER)_/;

/**
 * Converts machine-readable decision reason codes into presentation labels.
 * Unknown future codes still receive a readable fallback instead of exposing
 * underscore-separated database values in charts.
 */
export function formatDecisionReason(value) {
  if (!value) return '—';
  const code = String(value).trim().toUpperCase();
  if (DECISION_REASON_LABELS[code]) return DECISION_REASON_LABELS[code];
  const words = code.replace(REASON_PREFIXES, '').replaceAll('_', ' ').toLowerCase();
  return words ? words.replace(/^\w/, (letter) => letter.toUpperCase()) : code;
}
