import { z } from "zod";

/** The nine ranks, lowest to highest. A member holds exactly one at a time. */
export const RANK_KEYS = [
  "NEW",
  "BEGINNER",
  "RISING",
  "CHAMPION",
  "EXPERT",
  "LEGEND",
  "MASTER",
  "GRANDMASTER",
  "IMMORTAL",
] as const;

export type RankKey = (typeof RANK_KEYS)[number];

export const RankKeySchema = z.enum(RANK_KEYS);
