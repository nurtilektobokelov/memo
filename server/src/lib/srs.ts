export type CardState = 'new' | 'learning' | 'review';

export interface CardSRSData {
  state: CardState;
  interval: number;
  ease: number;
  lapses: number;
}

export interface SRSResult {
  state: CardState;
  interval: number;
  ease: number;
  lapses: number;
  nextReview: Date;
  nextReviewLabel: string;
}

const MIN_EASE = 1.3;
const MAX_EASE = 3.0;

export function formatInterval(days: number): string {
  if (days < 1 / 60) return '< 1 min';
  if (days < 1) return `${Math.round(days * 1440)} min`;
  if (days < 2) return '1 day';
  if (days < 7) return `${Math.round(days)} days`;
  if (days < 30) return `${Math.round(days / 7)} weeks`;
  return `${Math.round(days / 30)} months`;
}

export function calculateNextReview(
  card: CardSRSData,
  rating: 1 | 2 | 3 | 4,
): SRSResult {
  const now = new Date();
  let { state, interval, ease, lapses } = card;

  if (state === 'new' || state === 'learning') {
    switch (rating) {
      case 1:
        state = 'learning';
        interval = 1 / 1440;
        break;
      case 2:
        state = 'learning';
        interval = 8 / 1440;
        break;
      case 3:
        state = 'review';
        interval = 15 / 1440;
        break;
      case 4:
        state = 'review';
        interval = 4;
        ease = Math.min(ease + 0.15, MAX_EASE);
        break;
    }
  } else {
    switch (rating) {
      case 1:
        state = 'learning';
        lapses += 1;
        ease = Math.max(ease - 0.20, MIN_EASE);
        interval = 1 / 1440;
        break;
      case 2:
        state = 'review';
        interval = Math.max(interval * 1.2, 1);
        break;
      case 3:
        state = 'review';
        interval = interval * ease;
        break;
      case 4:
        state = 'review';
        ease = Math.min(ease + 0.15, MAX_EASE);
        interval = interval * ease * 1.3;
        break;
    }
  }

  const nextReview = new Date(now.getTime() + interval * 24 * 60 * 60 * 1000);
  const nextReviewLabel = formatInterval(interval);

  return { state, interval, ease, lapses, nextReview, nextReviewLabel };
}
