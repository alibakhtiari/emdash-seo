import { describe, it, expect } from "vitest";
import {
  levenshtein,
  scoreSlugMatch,
  rankCandidates,
  lastSegmentKey,
  normalizePath,
  tokenizePath,
} from "../packages/emdash-seo/src/engine/fuzzy-matcher.js";

describe("Fuzzy Matcher Engine", () => {
  it("computes accurate Levenshtein edit distance", () => {
    expect(levenshtein("", "")).toBe(0);
    expect(levenshtein("kitten", "sitting")).toBe(3);
    expect(levenshtein("/blog/first", "/blog/first")).toBe(0);
    expect(levenshtein("/blgo/post", "/blog/post")).toBe(2);
  });

  it("normalizes paths and tokenizes accurately", () => {
    expect(normalizePath("///blog//post///")).toBe("/blog/post");
    expect(tokenizePath("/blog/deep-cleaning-guide/")).toEqual(["blog", "deep", "cleaning", "guide"]);
  });

  it("produces invariant last-segment keys despite punctuation and word order", () => {
    const key1 = lastSegmentKey("/blog/end-of-tenancy");
    const key2 = lastSegmentKey("/services/tenancy_end_of");
    expect(key1).toBe("end|of|tenancy");
    expect(key2).toBe("end|of|tenancy");
    expect(key1).toBe(key2);
  });

  it("scores URL path similarities appropriately", () => {
    // 1. Exact match
    expect(scoreSlugMatch("/services/carpet-cleaning/", "/services/carpet-cleaning/")).toBe(1);

    // 2. Small typo in path
    const typoScore = scoreSlugMatch("/blgo/carpet-cleaning", "/blog/carpet-cleaning");
    expect(typoScore).toBeGreaterThan(0.8);

    // 3. Moved directory with identical slug
    const movedScore = scoreSlugMatch("/old-category/deep-clean", "/services/deep-clean");
    expect(movedScore).toBeGreaterThan(0.65);

    // 4. Completely unrelated paths
    const unrelatedScore = scoreSlugMatch("/privacy-policy", "/services/end-of-tenancy-cleaning");
    expect(unrelatedScore).toBeLessThan(0.3);
  });

  it("ranks candidate suggestions by similarity score", () => {
    const target = "/blgo/end-of-tenancy";
    const candidates = [
      "/about/",
      "/contact/",
      "/blog/end-of-tenancy/",
      "/services/end-of-tenancy/",
      "/blog/carpet-cleaning/",
    ];

    const results = rankCandidates(target, candidates, { limit: 3, minScore: 0.5 });
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results[0].candidate).toBe("/blog/end-of-tenancy/");
    expect(results[0].score).toBeGreaterThan(0.85);
  });
});
