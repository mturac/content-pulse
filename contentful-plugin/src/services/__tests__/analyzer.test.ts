import { describe, it, expect } from "vitest";
import { analyzeContent, extractTextFromRichText, getScoreColor, getScoreLabel } from "../analyzer";
import { BLOCKS, INLINES } from "@contentful/rich-text-types";

describe("analyzeContent", () => {
  it("returns score 100 for fresh content", () => {
    const result = analyzeContent({ title: "Hello World" });
    expect(result.score).toBe(100);
    expect(result.warnings).toHaveLength(0);
  });

  it("detects old dates via chrono-node", () => {
    const result = analyzeContent({
      body: "This event happened on January 15, 2020 and was great.",
    });
    expect(result.score).toBeLessThan(100);
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings[0].type).toBe("date_decay");
  });

  it("detects version strings", () => {
    const result = analyzeContent({
      body: "Install v1.0.0 of the package for best results.",
    });
    const versionWarnings = result.warnings.filter(
      (w) => w.type === "version_decay"
    );
    expect(versionWarnings.length).toBeGreaterThan(0);
  });

  it("detects year edition references", () => {
    const result = analyzeContent({
      body: "Based on the 2020 edition of the guidelines.",
    });
    const editionWarnings = result.warnings.filter(
      (w) => w.type === "version_decay"
    );
    expect(editionWarnings.length).toBeGreaterThan(0);
  });

  it("detects deprecated references", () => {
    const result = analyzeContent({
      body: "This API is deprecated and obsolete.",
    });
    const staleWarnings = result.warnings.filter(
      (w) => w.type === "stale_reference"
    );
    expect(staleWarnings.length).toBeGreaterThan(0);
  });

  it("detects placeholder content", () => {
    const result = analyzeContent({
      body: "Coming soon - TBD feature.",
    });
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it("calculates correct penalty scoring", () => {
    const result = analyzeContent({
      body: "Deprecated since January 2018. Uses v1.0.0 legacy API. TBD.",
    });
    expect(result.score).toBeLessThan(100);
    expect(result.score).toBeGreaterThanOrEqual(0);
  });

  it("respects custom threshold days", () => {
    const recent = analyzeContent(
      { body: "Updated on May 2026." },
      365
    );
    expect(recent.warnings).toHaveLength(0);

    const old = analyzeContent(
      { body: "Updated on January 2020." },
      30
    );
    expect(old.warnings.length).toBeGreaterThan(0);
  });

  it("handles rich text content", () => {
    const richText = {
      nodeType: BLOCKS.DOCUMENT,
      data: {},
      content: [
        {
          nodeType: BLOCKS.PARAGRAPH,
          data: {},
          content: [
            {
              nodeType: "text",
              value: "This was published in January 2019",
              marks: [],
              data: {},
            },
          ],
        },
      ],
    };
    const result = analyzeContent({ body: richText });
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it("handles empty content gracefully", () => {
    const result = analyzeContent({});
    expect(result.score).toBe(100);
    expect(result.warnings).toHaveLength(0);
  });

  it("handles null/undefined values", () => {
    const result = analyzeContent({
      title: null,
      body: undefined,
      desc: "",
    });
    expect(result.score).toBe(100);
  });
});

describe("extractTextFromRichText", () => {
  it("extracts text from nested rich text", () => {
    const doc = {
      nodeType: BLOCKS.DOCUMENT,
      data: {},
      content: [
        {
          nodeType: BLOCKS.PARAGRAPH,
          data: {},
          content: [
            {
              nodeType: "text",
              value: "Hello World",
              marks: [],
              data: {},
            },
          ],
        },
        {
          nodeType: BLOCKS.PARAGRAPH,
          data: {},
          content: [
            {
              nodeType: "text",
              value: "Second paragraph",
              marks: [],
              data: {},
            },
          ],
        },
      ],
    };
    const text = extractTextFromRichText(doc);
    expect(text).toContain("Hello World");
    expect(text).toContain("Second paragraph");
  });

  it("returns empty string for null document", () => {
    expect(extractTextFromRichText(null)).toBe("");
    expect(extractTextFromRichText(undefined)).toBe("");
  });
});

describe("getScoreColor", () => {
  it("returns green for high scores", () => {
    expect(getScoreColor(90)).toBe("#4caf50");
  });

  it("returns yellow for medium scores", () => {
    expect(getScoreColor(70)).toBe("#ff9800");
  });

  it("returns orange for low scores", () => {
    expect(getScoreColor(50)).toBe("#ff5722");
  });

  it("returns red for critical scores", () => {
    expect(getScoreColor(20)).toBe("#f44336");
  });
});

describe("getScoreLabel", () => {
  it("returns correct labels", () => {
    expect(getScoreLabel(90)).toBe("Fresh");
    expect(getScoreLabel(70)).toBe("Aging");
    expect(getScoreLabel(50)).toBe("Stale");
    expect(getScoreLabel(20)).toBe("Critical");
  });
});
