import assert from "node:assert/strict";
import test from "node:test";

import {
  type Issue,
  splitFrontmatter,
  validateFrontmatter,
  validateProse,
} from "../scripts/schema.ts";
import { TAGS } from "../packages/core/vocabulary.ts";

// --- frontmatter fence ------------------------------------------------------

test("splitFrontmatter separates the fence from the body", () => {
  const source = "---\nruleId: a/b\n---\nIntro.\n";
  const split = splitFrontmatter(source);
  assert.ok(split.ok);
  assert.equal(split.frontmatter, "ruleId: a/b\n");
  assert.equal(split.frontmatterStart, 4);
  assert.equal(split.body, "Intro.\n");
  assert.equal(source.slice(split.bodyStart), "Intro.\n");
});

test("splitFrontmatter tolerates a `---` inside the body", () => {
  const split = splitFrontmatter("---\nruleId: a/b\n---\nIntro.\n\n---\n\nMore.\n");
  assert.ok(split.ok);
  assert.equal(split.frontmatter, "ruleId: a/b\n");
  assert.match(split.body, /^Intro\./);
});

test("splitFrontmatter rejects a missing fence", () => {
  const split = splitFrontmatter("# Not a rule\n");
  assert.ok(!split.ok);
  assert.match(split.message, /must start with a `---`/);
});

test("splitFrontmatter rejects an unterminated fence", () => {
  const split = splitFrontmatter("---\nruleId: a/b\nstill frontmatter\n");
  assert.ok(!split.ok);
  assert.match(split.message, /never closed/);
});

// --- frontmatter ------------------------------------------------------------

const base = (): Record<string, unknown> => ({
  ruleId: "meta/example",
  title: '<meta name="example">',
  description: "One-line summary.",
  pubDate: "2026-01-02",
  status: "avoid",
  severity: "unnecessary",
  standardsBasis: "spec",
  detectability: "yes",
  kind: "element",
  scope: "head",
  selector: "meta[name=example]",
  fix: { op: "remove-element" },
  replacement: "Delete it.",
});

const messages = (patch: Record<string, unknown>): string[] => {
  const result = validateFrontmatter({ ...base(), ...patch });
  return result.ok ? [] : result.issues.map((i) => i.message);
};

const paths = (patch: Record<string, unknown>): string[] => {
  const result = validateFrontmatter({ ...base(), ...patch });
  return result.ok ? [] : result.issues.map((i) => (i.kind === "field" ? i.path.join(".") : "prose"));
};

test("a minimal rule validates and optional fields widen to null/[]", () => {
  const result = validateFrontmatter(base());
  assert.ok(result.ok, JSON.stringify(messages({})));
  assert.equal(result.meta.match, null);
  assert.deepEqual(result.meta.tags, []);
  assert.deepEqual(result.meta.impacts, []);
  assert.deepEqual(result.meta.related, []);
  assert.deepEqual(result.meta.fix, { op: "remove-element", attr: null, token: null });
});

test("unknown frontmatter fields are rejected", () => {
  assert.match(messages({ sevrity: "harmful" }).join("\n"), /unknown frontmatter field `sevrity`/);
});

const ENUM_CASES: [string, Record<string, unknown>, string][] = [
  ["status", { status: "bad" }, "status"],
  ["severity", { severity: "warning" }, "severity"],
  ["standardsBasis", { standardsBasis: "blog" }, "standardsBasis"],
  ["detectability", { detectability: "maybe" }, "detectability"],
  ["kind", { kind: "attribute" }, "kind"],
  ["scope", { scope: "footer" }, "scope"],
  ["fix.op", { fix: { op: "rewrite" } }, "fix.op"],
  ["tags", { tags: ["forms", "nonsense"] }, "tags.1"],
  ["impacts", { impacts: ["vibes"] }, "impacts.0"],
];

for (const [name, patch, path] of ENUM_CASES) {
  test(`unknown ${name} value is rejected and located`, () => {
    assert.match(messages(patch).join("\n"), /unknown value/);
    assert.ok(paths(patch).includes(path), `expected an issue at ${path}`);
  });
}

test("TAGS is alphabetical and free of duplicates", () => {
  assert.deepEqual([...TAGS], [...new Set(TAGS)].sort());
});

test("tags are topics: namespace, scope and impact names are not tags", () => {
  for (const repeat of ["meta", "link", "attr", "script", "head", "body", "seo", "security", "a11y", "performance", "legacy"]) {
    assert.match(messages({ tags: [repeat] }).join("\n"), /unknown value/, repeat);
  }
});

test("a repeated tag is rejected at its second occurrence", () => {
  assert.ok(paths({ tags: ["forms", "forms"] }).includes("tags.1"));
  assert.match(messages({ tags: ["forms", "forms"] }).join("\n"), /duplicate tag `forms`/);
});

test("tags must be in alphabetical order", () => {
  assert.match(messages({ tags: ["tables", "forms"] }).join("\n"), /alphabetical/);
  assert.deepEqual(messages({ tags: ["forms", "tables"] }), []);
});

test("every required field is reported exactly once when absent", () => {
  const result = validateFrontmatter({});
  assert.ok(!result.ok);
  const required = result.issues.filter((i) => i.message === "is required");
  assert.equal(required.length, 12);
  // Absent fields must not also produce a "must be a string" from the same check.
  assert.equal(result.issues.filter((i) => i.message === "must be a string").length, 0);
});

test("ruleId must be lowercase namespace/name", () => {
  for (const ruleId of ["Meta/Example", "example", "meta/", "meta/a/b", "meta/-x"]) {
    assert.match(messages({ ruleId }).join("\n"), /not a valid ruleId/, ruleId);
  }
  assert.deepEqual(messages({ ruleId: "meta/http-equiv-x-ua-compatible" }), []);
});

test("a ruleId with a verdict word is rejected", () => {
  assert.match(messages({ ruleId: "attr/foo-obsolete" }).join("\n"), /verdict word `obsolete`/);
});

test("no rule id is exempt from the naming checks", async () => {
  const schema = await import("../scripts/schema.ts");
  assert.equal("LEGACY_IDS" in schema, false);
  assert.equal("LONG_DESCRIPTION_IDS" in schema, false);
});

test("an element title that does not start with < is rejected", () => {
  assert.match(messages({ title: "meta name example" }).join("\n"), /must start with `<`/);
});

test("an element title in code shape passes", () => {
  assert.deepEqual(messages({ title: '<meta name="example">' }), []);
});

test("a head-namespace title without < passes", () => {
  assert.deepEqual(messages({ ruleId: "head/title", kind: "document", title: "Head with no title", selector: undefined, match: "logic" }), []);
});

test("updatedDate is optional, later than pubDate and not in the future", () => {
  const dated = (updatedDate: unknown) => {
    const result = validateFrontmatter({ ...base(), updatedDate }, "2026-03-01");
    return result.ok ? result.meta.updatedDate : result.issues.map((i) => i.message).join("\n");
  };
  const plain = validateFrontmatter(base());
  assert.ok(plain.ok);
  assert.equal(plain.meta.updatedDate, null);
  assert.equal(dated("2026-02-01"), "2026-02-01");
  assert.equal(dated("2026-03-01"), "2026-03-01");
  assert.match(String(dated("2026-01-02")), /must be later than pubDate/);
  assert.match(String(dated("2026-01-01")), /must be later than pubDate/);
  assert.match(String(dated("2026-03-02")), /in the future/);
  assert.match(String(dated("2026-02-30")), /not a real calendar date/);
  assert.match(String(dated(20260201)), /quoted ISO date/);
});

test("pubDate must be a real ISO calendar date", () => {
  assert.match(messages({ pubDate: "12/07/2026" }).join("\n"), /not an ISO date/);
  assert.match(messages({ pubDate: "2026-02-30" }).join("\n"), /not a real calendar date/);
  assert.match(messages({ pubDate: "2026-13-01" }).join("\n"), /not a real calendar date/);
  assert.match(messages({ pubDate: 20260102 }).join("\n"), /quoted ISO date/);
});

test("description must be at most 140 characters", () => {
  assert.deepEqual(messages({ description: "x".repeat(140) }), []);
  assert.match(messages({ description: "x".repeat(141) }).join("\n"), /at most 140 characters/);
  assert.ok(paths({ description: "x".repeat(141) }).includes("description"));
});

test("an unsupported selector fails the rule, with the offset of the offending token", () => {
  const result = validateFrontmatter({ ...base(), selector: "head > meta" });
  assert.ok(!result.ok);
  const issue = result.issues.find((i) => i.kind === "field" && i.path[0] === "selector");
  assert.ok(issue);
  assert.match(issue.message, /unsupported selector at offset 5: combinators/);
});

test("kind: element needs a selector; kind: document needs logic", () => {
  const withoutSelector = base();
  delete withoutSelector["selector"];
  assert.match(
    messages({ ...withoutSelector, selector: undefined }).join("\n"),
    /required for `kind: "element"`/,
  );
  assert.match(
    messages({ ...withoutSelector, selector: undefined, kind: "document" }).join("\n"),
    /decided by code; set `match: "logic"`/,
  );
  const doc = validateFrontmatter({ ...withoutSelector, kind: "document", match: "logic" });
  assert.ok(doc.ok);
  assert.equal(doc.meta.selector, null);
});

test("remove-attribute must name the attribute it removes", () => {
  // The op alone is not actionable: knowing a rule removes *an* attribute says
  // nothing about which one, and the fixer would have to guess.
  assert.match(
    messages({ fix: { op: "remove-attribute" } }).join("\n"),
    /required for `remove-attribute`/,
  );
  assert.match(
    messages({ fix: { op: "remove-attribute", attr: "TYPE" } }).join("\n"),
    /required for `remove-attribute`/,
  );
  const ok = validateFrontmatter({ ...base(), fix: { op: "remove-attribute", attr: "type" } });
  assert.ok(ok.ok);
  assert.deepEqual(ok.meta.fix, { op: "remove-attribute", attr: "type", token: null });
});

test("only the attribute ops take an attr", () => {
  for (const op of ["remove-element", "none"]) {
    assert.match(messages({ fix: { op, attr: "type" } }).join("\n"), /take an `attr`/, op);
  }
});

test("remove-token needs both the attribute and the keyword", () => {
  assert.match(
    messages({ fix: { op: "remove-token", attr: "rel" } }).join("\n"),
    /required for `remove-token`/,
  );
  assert.match(
    messages({ fix: { op: "remove-token", token: "shortcut" } }).join("\n"),
    /required for `remove-token`/,
  );
  // A keyword is one whitespace-separated token by definition.
  assert.match(
    messages({ fix: { op: "remove-token", attr: "rel", token: "shortcut icon" } }).join("\n"),
    /required for `remove-token`/,
  );
  const ok = validateFrontmatter({
    ...base(),
    fix: { op: "remove-token", attr: "rel", token: "shortcut" },
  });
  assert.ok(ok.ok);
  assert.deepEqual(ok.meta.fix, { op: "remove-token", attr: "rel", token: "shortcut" });
});

test("only remove-token takes a token", () => {
  for (const op of ["remove-element", "remove-attribute", "none"]) {
    const fix = op === "remove-attribute" ? { op, attr: "type", token: "x" } : { op, token: "x" };
    assert.match(messages({ fix }).join("\n"), /only `remove-token` takes a `token`/, op);
  }
});

test("remove-tokens needs an attr, takes no token, and needs a ~= test on that attr", () => {
  const rel = { selector: 'link[rel~="index" i]' };
  assert.deepEqual(messages({ ...rel, fix: { op: "remove-tokens", attr: "rel" } }), []);
  assert.match(messages({ ...rel, fix: { op: "remove-tokens" } }).join("\n"), /required for `remove-tokens`/);
  assert.match(
    messages({ ...rel, fix: { op: "remove-tokens", attr: "rel", token: "index" } }).join("\n"),
    /only `remove-token` takes a `token`/,
  );
  assert.match(
    messages({ selector: "link[rel]", fix: { op: "remove-tokens", attr: "rel" } }).join("\n"),
    /tests no keyword on `rel`/,
  );
});

test("remove-tokens allows match: logic; checkLogicModules rejects a match() export there", () => {
  assert.deepEqual(
    messages({
      selector: 'link[rel~="index" i]',
      match: "logic",
      fix: { op: "remove-tokens", attr: "rel" },
    }),
    [],
  );
});

test("remove-tokens rejects a missing selector", () => {
  const withoutSelector = base();
  delete withoutSelector["selector"];
  assert.match(
    messages({
      ...withoutSelector,
      selector: undefined,
      fix: { op: "remove-tokens", attr: "rel" },
    }).join("\n"),
    /needs a selector/,
  );
});

test("remove-tokens rejects a compound testing the same attribute twice", () => {
  assert.match(
    messages({
      selector: 'link[rel~="index" i][rel~="last" i]',
      fix: { op: "remove-tokens", attr: "rel" },
    }).join("\n"),
    /at most one `\[rel~="…"\]` test per comma alternative/,
  );
  // Two separate alternatives, one test each, are fine: each fires on its own.
  assert.deepEqual(
    messages({
      selector: 'link[rel~="index" i], link[rel~="last" i]',
      fix: { op: "remove-tokens", attr: "rel" },
    }),
    [],
  );
});

test("remove-attributes takes no attr or token, and needs a bare [attr] test", () => {
  const coords = { selector: "a[coords], a[shape]" };
  assert.deepEqual(messages({ ...coords, fix: { op: "remove-attributes" } }), []);
  assert.match(
    messages({ ...coords, fix: { op: "remove-attributes", attr: "coords" } }).join("\n"),
    /take an `attr`/,
  );
  assert.match(
    messages({ ...coords, fix: { op: "remove-attributes", token: "x" } }).join("\n"),
    /only `remove-token` takes a `token`/,
  );
  assert.match(
    messages({ selector: 'a[href="x"]', fix: { op: "remove-attributes" } }).join("\n"),
    /no bare `\[attr\]` test/,
  );
});

test("remove-attributes allows match: logic", () => {
  assert.deepEqual(
    messages({
      selector: "a[coords], a[shape]",
      match: "logic",
      fix: { op: "remove-attributes" },
    }),
    [],
  );
});

test("remove-attributes rejects a missing selector", () => {
  assert.match(
    messages({
      selector: undefined,
      fix: { op: "remove-attributes" },
    }).join("\n"),
    /needs a selector/,
  );
});

test("match only accepts \"logic\"", () => {
  assert.match(messages({ match: "regex" }).join("\n"), /only supported value is "logic"/);
});

test("related is checked for shape but not for existence", () => {
  assert.match(messages({ related: ["Meta/Nope"] }).join("\n"), /not a valid ruleId/);
  const result = validateFrontmatter({ ...base(), related: ["meta/does-not-exist-yet"] });
  assert.ok(result.ok);
  assert.deepEqual(result.meta.related, ["meta/does-not-exist-yet"]);
});

// --- prose ------------------------------------------------------------------

const body = ({
  intro = "What it is and where it came from.",
  why = "Why avoid",
  sections = ["Use instead", "Detectability", "Resources"],
  resources = ["- https://example.com/one\n", "- https://example.com/two\n"],
} = {}): string => {
  let out = intro === "" ? "" : `\n${intro}\n\n`;
  for (const heading of [why, ...sections]) {
    out += `## ${heading}\n\n`;
    out += heading === "Resources" ? resources.join("") : "Prose.\n";
    out += "\n";
  }
  return out;
};

const prose = (b: string, status: Parameters<typeof validateProse>[2] = "avoid"): string[] =>
  validateProse(b, 0, status).map((i: Issue) => i.message);

test("a well-formed rule doc has no prose issues", () => {
  assert.deepEqual(prose(body()), []);
});

test("the intro paragraph is required", () => {
  assert.match(prose(body({ intro: "" })).join("\n"), /needs an intro paragraph/);
});

test("status picks the Why heading", () => {
  assert.match(prose(body({ why: "Why use" })).join("\n"), /expected `## Why avoid`/);
  assert.match(
    prose(body({ why: "Why avoid" }), "recommended").join("\n"),
    /expected `## Why use`/,
  );
  // situational rules may frame it either way
  assert.deepEqual(prose(body({ why: "Why use" }), "situational"), []);
  assert.deepEqual(prose(body({ why: "Why avoid" }), "situational"), []);
});

test("sections must appear in order, with none missing or extra", () => {
  assert.match(
    prose(body({ sections: ["Detectability", "Use instead", "Resources"] })).join("\n"),
    /expected `## Use instead` here, found `## Detectability`/,
  );
  assert.match(
    prose(body({ sections: ["Use instead", "Resources"] })).join("\n"),
    /missing `## Resources` section/,
  );
  assert.match(
    prose(body({ sections: ["Use instead", "Detectability", "Resources", "Notes"] })).join("\n"),
    /unexpected `## Notes` section/,
  );
});

test("Resources needs at least two entries", () => {
  assert.match(
    prose(body({ resources: ["- https://example.com/only\n"] })).join("\n"),
    /at least two independent sources, found 1/,
  );
  assert.deepEqual(
    prose(body({ resources: ["1. https://example.com/one\n", "2. https://example.com/two\n"] })),
    [],
  );
  // A nested item is a detail of its parent, not a second source.
  assert.match(
    prose(body({ resources: ["- https://example.com/one\n", "    - a note about it\n"] })).join("\n"),
    /found 1/,
  );
});

test("headings inside fenced code blocks are not sections", () => {
  const withFence = body({ intro: "Intro.\n\n```html\n<!-- ## Resources -->\n```" });
  assert.deepEqual(prose(withFence), []);
});

test("prose offsets are absolute, so a caller can map them to file:line", () => {
  const issues = validateProse(body({ intro: "" }), 500, "avoid");
  assert.ok(issues.length > 0);
  const first = issues[0];
  assert.ok(first && first.kind === "prose");
  assert.equal(first.offset, 500);
});
