import { TONES, toneMapper } from './design-system';

// The application maps its business vocabulary onto the five shared tones once.
// Colour never replaces the contract word shown beside it.
export const statusTone = toneMapper({
  COMPLETED: TONES.POSITIVE,
  REJECTED: TONES.NEGATIVE,
  REFERRED: TONES.WARNING,
  IN_PROGRESS: TONES.INFO,
});

export const snapshotTone = toneMapper({
  TAKEN: TONES.NEUTRAL,
  SERVED: TONES.POSITIVE,
  'fixture-v1': TONES.INFO,
  'live-api': TONES.POSITIVE,
  SCHEDULED: TONES.WARNING,
});
