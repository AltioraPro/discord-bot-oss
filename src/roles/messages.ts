import { EmbedBuilder } from "discord.js";
import type { RankKey } from "../contracts/ranks";
import { ACCENT } from "../lib/branding";

/**
 * Renders a rank key as a name a member can read.
 *
 * Every key is a single word, so title casing is enough and a lookup table
 * would only be one more place to forget a rank.
 */
export function formatRank(rank: RankKey): string {
  return rank.charAt(0) + rank.slice(1).toLowerCase();
}

/**
 * Tells a member which rank they now hold.
 *
 * It describes the resulting state rather than the change that produced it,
 * which stays accurate whether the rank moved, premium moved, or both.
 * Premium is stated either way: saying nothing would read identically to a
 * member who just lost it and one who never had it.
 */
export function rankChangeNotice(
  rank: RankKey,
  isPro: boolean
): {
  embeds: [EmbedBuilder];
} {
  return {
    embeds: [
      new EmbedBuilder()
        .setColor(ACCENT)
        .setTitle("Rank updated")
        .setDescription(`You are now **${formatRank(rank)}**.`)
        .addFields({
          inline: true,
          name: "Premium",
          value: isPro ? "Active" : "Inactive",
        }),
    ],
  };
}
