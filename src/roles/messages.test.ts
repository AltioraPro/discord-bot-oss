import { describe, expect, test } from "bun:test";
import { RANK_KEYS } from "../contracts/ranks";
import { ACCENT } from "../lib/branding";
import { formatRank, rankChangeNotice } from "./messages";

const TITLE_CASED = /^[A-Z][a-z]+$/;

describe("formatRank", () => {
  test("renders a rank key as a readable name", () => {
    expect(formatRank("CHAMPION")).toBe("Champion");
    expect(formatRank("GRANDMASTER")).toBe("Grandmaster");
    expect(formatRank("NEW")).toBe("New");
  });

  test("leaves no rank shouting in upper case", () => {
    for (const rank of RANK_KEYS) {
      expect(formatRank(rank)).toMatch(TITLE_CASED);
    }
  });
});

describe("rankChangeNotice", () => {
  test("names the rank the member now holds", () => {
    const [embed] = rankChangeNotice("CHAMPION", false).embeds;

    expect(embed.data.description).toContain("Champion");
  });

  test("reports premium as active when the member is pro", () => {
    const [embed] = rankChangeNotice("EXPERT", true).embeds;

    expect(embed.data.fields?.[0]?.value).toBe("Active");
  });

  test("reports premium as inactive rather than staying silent", () => {
    // Silence would be ambiguous: a member who just lost premium would read
    // the same message as one who never had it.
    const [embed] = rankChangeNotice("EXPERT", false).embeds;

    expect(embed.data.fields?.[0]?.value).toBe("Inactive");
  });

  test("carries the shared accent, like every other message the bot sends", () => {
    const [embed] = rankChangeNotice("NEW", false).embeds;

    expect(embed.data.color).toBe(ACCENT);
  });
});
