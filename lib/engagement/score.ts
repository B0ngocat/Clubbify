import type { EngagementBand } from "@prisma/client";

export type ActivityRow = { at: Date; weight: number };

export type ScoreInput = {
  now: Date;
  attendances: { at: Date }[];
  rsvps: { at: Date }[];
  announcementReads: { at: Date }[];
  distinctActiveClubIds: string[];
  isOfficer: boolean;
};

export type ScoreComponents = {
  attendance: number;
  rsvp: number;
  announcements: number;
  clubs: number;
  officerBonus: number;
  recencyPenaltyApplied: boolean;
  raw: number;
  lastActivityDaysAgo: number | null;
};

export type ScoreResult = {
  score: number;
  band: EngagementBand;
  components: ScoreComponents;
};

// Rolling window and decay
const WINDOW_DAYS = 60;
const HALF_LIFE_DAYS = 21;

// Weights per signal
const W_ATTENDANCE = 3;
const W_RSVP = 1;
const W_ANNOUNCEMENT = 0.25;
const W_CLUB = 2;
const CLUB_CAP = 3;
const ANNOUNCEMENT_CAP = 10;
const OFFICER_BONUS = 5;

// Recency penalty
const RECENCY_PENALTY_DAYS = 14;
const RECENCY_PENALTY_FACTOR = 0.7;

// Band thresholds
export const BAND_HEALTHY_MIN = 60;
export const BAND_WATCH_MIN = 30;
export const AT_RISK_TREND_THRESHOLD = -15;

function daysBetween(a: Date, b: Date): number {
  return (b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24);
}

function decay(at: Date, now: Date): number {
  const d = daysBetween(at, now);
  if (d < 0) return 0;
  if (d > WINDOW_DAYS) return 0;
  return Math.pow(0.5, d / HALF_LIFE_DAYS);
}

function sigmoid100(x: number): number {
  // Map raw signal to 0..100 with a soft curve; 0 -> 0, ~15 -> 50, infinity -> 100.
  const s = 1 / (1 + Math.exp(-(x - 15) / 6));
  return Math.max(0, Math.min(100, s * 100));
}

function deriveBand(score: number, trend: number | undefined): EngagementBand {
  if (trend !== undefined && trend < AT_RISK_TREND_THRESHOLD) return "AT_RISK";
  if (score >= BAND_HEALTHY_MIN) return "HEALTHY";
  if (score >= BAND_WATCH_MIN) return "WATCH";
  return "AT_RISK";
}

export function computeScore(input: ScoreInput, trend7d?: number): ScoreResult {
  const { now } = input;

  const attendance = input.attendances.reduce((sum, r) => sum + W_ATTENDANCE * decay(r.at, now), 0);
  const rsvp = input.rsvps.reduce((sum, r) => sum + W_RSVP * decay(r.at, now), 0);

  const annRaw = input.announcementReads.reduce((sum, r) => sum + W_ANNOUNCEMENT * decay(r.at, now), 0);
  const announcements = Math.min(annRaw, W_ANNOUNCEMENT * ANNOUNCEMENT_CAP);

  const clubs = Math.min(input.distinctActiveClubIds.length, CLUB_CAP) * W_CLUB;
  const officerBonus = input.isOfficer ? OFFICER_BONUS : 0;

  const allActivity: Date[] = [
    ...input.attendances.map((a) => a.at),
    ...input.rsvps.map((a) => a.at),
    ...input.announcementReads.map((a) => a.at),
  ];
  const mostRecent = allActivity.length
    ? new Date(Math.max(...allActivity.map((d) => d.getTime())))
    : null;

  const lastActivityDaysAgo = mostRecent ? daysBetween(mostRecent, now) : null;
  const recencyPenaltyApplied =
    lastActivityDaysAgo !== null && lastActivityDaysAgo > RECENCY_PENALTY_DAYS;

  let raw = attendance + rsvp + announcements + clubs + officerBonus;
  if (recencyPenaltyApplied || lastActivityDaysAgo === null) {
    raw *= RECENCY_PENALTY_FACTOR;
  }

  const score = Math.round(sigmoid100(raw) * 10) / 10;
  const band = deriveBand(score, trend7d);

  return {
    score,
    band,
    components: {
      attendance: round1(attendance),
      rsvp: round1(rsvp),
      announcements: round1(announcements),
      clubs: round1(clubs),
      officerBonus,
      recencyPenaltyApplied,
      raw: round1(raw),
      lastActivityDaysAgo: lastActivityDaysAgo === null ? null : round1(lastActivityDaysAgo),
    },
  };
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
