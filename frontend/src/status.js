import { TONES, toneMapper } from './design-system';

export const statusTone = toneMapper({
  COMPLETED: TONES.POSITIVE,
  REJECTED: TONES.NEGATIVE,
  IN_PROGRESS: TONES.INFO,
});

export const cardTypeTone = toneMapper({
  PREMIUM_CARD: TONES.INFO,
  PLATINUM_CARD: TONES.WARNING,
});

export function formatCardType(value) {
  return value === 'PREMIUM_CARD' ? 'Premium Card' : value === 'PLATINUM_CARD' ? 'Platinum Card' : value;
}
