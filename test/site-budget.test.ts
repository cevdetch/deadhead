/**
 * The byte budget gate must work on a synthetic dist, never the real
 * site/dist: this suite runs in the root `pnpm test`, which does not build
 * the site.
 */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";

const SCRIPT = fileURLToPath(new URL("../scripts/site-budget.ts", import.meta.url));

const gz = (text: string) => gzipSync(Buffer.from(text), { level: 9 }).length;

async function withDist(fn: (dir: string) => Promise<void>): Promise<void> {
  const dir = await mkdtemp(join(tmpdir(), "site-budget-"));
  try {
    await fn(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

/** The two tags the search checks read: the page title and its meta description. */
const headOf = (title: string, description: string) =>
  `<title>${title}</title><meta name="description" content="${description}">`;

/** A description inside the 50-160 character window, unique per subject. */
const descriptionFor = (subject: string) => `${subject}: a synthetic page, described at a length the check accepts.`;

/** A page with a valid, unique title and description by default. */
const doc = (title: string, body: string, description = descriptionFor(title)) =>
  `<html><head>${headOf(title, description)}</head><body>${body}</body></html>`;

const home = doc("Home page", "home page " + "x".repeat(2000));
const rulesIndex = doc("Rules index", "rules index " + "y".repeat(3000));
const rulePages = {
  "meta/a.html": doc("Rule meta/a", "rule meta/a " + "a".repeat(1000)),
  "meta/b.html": doc("Rule meta/b", "rule meta/b " + "b".repeat(2000)),
  "link/c.html": doc("Rule link/c", "rule link/c " + "c".repeat(3000)),
};
const astroCss = "." + "a".repeat(4000) + "{color:red}";
const astroJs = "console.log(" + "z".repeat(500) + ");";
const deadheadCss = "." + "d".repeat(99_000) + "{color:blue}"; // engine stylesheet at dist root, never counted
const bookmarkletJs = "javascript:" + "b".repeat(53_000); // bookmarklet at dist root, never counted

// A valid `_headers`: only `/_astro/*` (Astro's hashed build assets) is immutable.
const validHeaders = "/_astro/*\n  Cache-Control: public, max-age=31536000, immutable\n";

/** A 404 with a valid title and description, plus whatever else its head carries. */
const notFoundDoc = (extraHead: string) =>
  `<html><head>${headOf("Not found", descriptionFor("Not found"))}${extraHead}</head><body>not found</body></html>`;

// A valid 404: noindex, and so no canonical or og:url (both would assert a
// canonical identity for a page that should not be indexed at all).
const notFoundNoindex = notFoundDoc('<meta name="robots" content="noindex">');

type DistOverrides = {
  /** `null` omits the file entirely, to test the missing-file case. */
  headers?: string | null;
  notFound?: string;
  /** Pages written last, keyed by path under dist: they replace a default page or add one. */
  pages?: Record<string, string>;
};

async function writeSyntheticDist(dir: string, overrides: DistOverrides = {}): Promise<void> {
  await mkdir(join(dir, "dist", "_astro"), { recursive: true });
  await mkdir(join(dir, "dist", "rules", "meta"), { recursive: true });
  await mkdir(join(dir, "dist", "rules", "link"), { recursive: true });
  await writeFile(join(dir, "dist", "index.html"), home);
  await writeFile(join(dir, "dist", "rules.html"), rulesIndex);
  for (const [rel, content] of Object.entries(rulePages)) {
    await writeFile(join(dir, "dist", "rules", rel), content);
  }
  await writeFile(join(dir, "dist", "_astro", "global.abc123.css"), astroCss);
  await writeFile(join(dir, "dist", "_astro", "chunk.def456.js"), astroJs);
  await writeFile(join(dir, "dist", "deadhead.css"), deadheadCss);
  await writeFile(join(dir, "dist", "bookmarklet.js"), bookmarkletJs);

  const headers = overrides.headers === undefined ? validHeaders : overrides.headers;
  if (headers !== null) {
    await writeFile(join(dir, "dist", "_headers"), headers);
  }
  await writeFile(join(dir, "dist", "404.html"), overrides.notFound ?? notFoundNoindex);
  for (const [rel, content] of Object.entries(overrides.pages ?? {})) {
    await mkdir(dirname(join(dir, "dist", rel)), { recursive: true });
    await writeFile(join(dir, "dist", rel), content);
  }
}

const expected = {
  homeGzip: gz(home),
  rulesIndexGzip: gz(rulesIndex),
  rulePageAvgGzip: Math.round(
    Object.values(rulePages).reduce((sum, content) => sum + gz(content), 0) / Object.values(rulePages).length,
  ),
  cssRaw: Buffer.byteLength(astroCss),
};

/** Writes `site/budget.json` with every key padded above `expected`, unless overridden. */
async function writeBudget(dir: string, overrides: Partial<typeof expected> = {}): Promise<void> {
  await mkdir(join(dir, "site"), { recursive: true });
  const budget = {
    homeGzip: expected.homeGzip + 100,
    rulesIndexGzip: expected.rulesIndexGzip + 100,
    rulePageAvgGzip: expected.rulePageAvgGzip + 100,
    cssRaw: expected.cssRaw + 100,
    ...overrides,
  };
  await writeFile(join(dir, "site", "budget.json"), JSON.stringify(budget));
}

function run(dir: string): { status: number | null; stdout: string; stderr: string } {
  return spawnSync(process.execPath, [SCRIPT, "dist"], { cwd: dir, encoding: "utf8" });
}

test("prints the four measured values and passes when inside budget", async () => {
  await withDist(async (dir) => {
    await writeSyntheticDist(dir);
    await writeBudget(dir);

    const result = run(dir);

    assert.equal(result.status, 0, result.stdout + result.stderr);
    for (const [key, value] of Object.entries(expected)) {
      const line = result.stdout.split("\n").find((l) => l.startsWith(key));
      assert.ok(line, `missing line for ${key} in:\n${result.stdout}`);
      assert.match(line, new RegExp(`^${key}\\s+${value}\\s+/`), `${key} line: ${line}`);
      assert.match(line, /\bok\b/, `${key} line should be ok: ${line}`);
    }
  });
});

test("cssRaw counts only dist/_astro/*.css: not deadhead.css, not bookmarklet.js, not non-css _astro files", async () => {
  await withDist(async (dir) => {
    await writeSyntheticDist(dir);
    await writeBudget(dir);

    const result = run(dir);

    assert.equal(result.status, 0, result.stdout + result.stderr);
    const line = result.stdout.split("\n").find((l) => l.startsWith("cssRaw"));
    assert.ok(line);
    // deadhead.css (99,000+ bytes) and bookmarklet.js (53,000+ bytes) must not
    // be folded into cssRaw, which should equal only the _astro CSS bytes.
    assert.match(line, new RegExp(`^cssRaw\\s+${expected.cssRaw}\\s+/`), line);
    assert.ok(expected.cssRaw < deadheadCss.length, "sanity: astro css smaller than deadhead.css fixture");
  });
});

test("exits 1 and flags OVER on the homeGzip line when its budget is below the measured value", async () => {
  await withDist(async (dir) => {
    await writeSyntheticDist(dir);
    await writeBudget(dir, { homeGzip: expected.homeGzip - 1 });

    const result = run(dir);

    assert.equal(result.status, 1, result.stdout + result.stderr);
    const homeLine = result.stdout.split("\n").find((l) => l.startsWith("homeGzip"));
    assert.ok(homeLine);
    assert.match(homeLine, /OVER/, homeLine);
    for (const key of ["rulesIndexGzip", "rulePageAvgGzip", "cssRaw"]) {
      const line = result.stdout.split("\n").find((l) => l.startsWith(key));
      assert.ok(line);
      assert.match(line, /\bok\b/, `${key} should stay ok: ${line}`);
    }
  });
});

test("fails when a budget key is missing from site/budget.json", async () => {
  await withDist(async (dir) => {
    await writeSyntheticDist(dir);
    await mkdir(join(dir, "site"), { recursive: true });
    // cssRaw omitted: a missing key must not fall back to an unbounded limit.
    const budget = {
      homeGzip: expected.homeGzip + 100,
      rulesIndexGzip: expected.rulesIndexGzip + 100,
      rulePageAvgGzip: expected.rulePageAvgGzip + 100,
    };
    await writeFile(join(dir, "site", "budget.json"), JSON.stringify(budget));

    const result = run(dir);

    assert.equal(result.status, 1, result.stdout + result.stderr);
    assert.match(result.stdout, /✗ site\/budget\.json: missing key "cssRaw"/);
  });
});

test("fails when dist/rules has no .html pages", async () => {
  await withDist(async (dir) => {
    await mkdir(join(dir, "dist", "_astro"), { recursive: true });
    await mkdir(join(dir, "dist", "rules"), { recursive: true });
    await writeFile(join(dir, "dist", "index.html"), home);
    await writeFile(join(dir, "dist", "rules.html"), rulesIndex);
    await writeFile(join(dir, "dist", "_astro", "global.abc123.css"), astroCss);
    await writeFile(join(dir, "dist", "_headers"), validHeaders);
    await writeFile(join(dir, "dist", "404.html"), notFoundNoindex);
    await writeBudget(dir);

    const result = run(dir);

    assert.equal(result.status, 1, result.stdout + result.stderr);
    assert.match(result.stdout, /✗ dist\/rules has no \.html pages/);
  });
});

test("passes with no problem lines when _headers and 404.html are both valid", async () => {
  await withDist(async (dir) => {
    await writeSyntheticDist(dir);
    await writeBudget(dir);

    const result = run(dir);

    assert.equal(result.status, 0, result.stdout + result.stderr);
    assert.doesNotMatch(result.stdout, /✗/, result.stdout);
  });
});

test("fails when dist/_headers is missing", async () => {
  await withDist(async (dir) => {
    await writeSyntheticDist(dir, { headers: null });
    await writeBudget(dir);

    const result = run(dir);

    assert.equal(result.status, 1, result.stdout + result.stderr);
    assert.match(result.stdout, /_headers is missing/);
  });
});

test("fails when _headers also marks another path immutable", async () => {
  await withDist(async (dir) => {
    await writeSyntheticDist(dir, {
      headers:
        validHeaders +
        "\n/bookmarklet.js\n  Cache-Control: public, max-age=31536000, immutable\n",
    });
    await writeBudget(dir);

    const result = run(dir);

    assert.equal(result.status, 1, result.stdout + result.stderr);
    assert.match(result.stdout, /\/bookmarklet\.js[^\n]*immutable/);
  });
});

test("fails when the /_astro/* block lacks the immutable line", async () => {
  await withDist(async (dir) => {
    await writeSyntheticDist(dir, {
      headers: "/_astro/*\n  Cache-Control: public, max-age=31536000\n",
    });
    await writeBudget(dir);

    const result = run(dir);

    assert.equal(result.status, 1, result.stdout + result.stderr);
    assert.match(result.stdout, /\/_astro\/\*[^\n]*missing/);
  });
});

test("fails when the 404 page carries a canonical link", async () => {
  await withDist(async (dir) => {
    await writeSyntheticDist(dir, {
      notFound: notFoundDoc(
        '<meta name="robots" content="noindex">' + '<link rel="canonical" href="https://deadhead.cevdet.ch/404">',
      ),
    });
    await writeBudget(dir);

    const result = run(dir);

    assert.equal(result.status, 1, result.stdout + result.stderr);
    assert.match(result.stdout, /404\.html[^\n]*canonical/);
  });
});

test("fails when the 404 page carries an og:url meta", async () => {
  await withDist(async (dir) => {
    await writeSyntheticDist(dir, {
      notFound: notFoundDoc(
        '<meta name="robots" content="noindex">' + '<meta property="og:url" content="https://deadhead.cevdet.ch/404">',
      ),
    });
    await writeBudget(dir);

    const result = run(dir);

    assert.equal(result.status, 1, result.stdout + result.stderr);
    assert.match(result.stdout, /404\.html[^\n]*og:url/);
  });
});

test("fails when the 404 page has no robots noindex", async () => {
  await withDist(async (dir) => {
    await writeSyntheticDist(dir, {
      notFound: notFoundDoc(""),
    });
    await writeBudget(dir);

    const result = run(dir);

    assert.equal(result.status, 1, result.stdout + result.stderr);
    assert.match(result.stdout, /404\.html[^\n]*noindex/);
  });
});

// Titles and descriptions: every page gets a unique title of at most 60
// characters and a description of 50-160, measured after entity decoding.

/** Runs the gate over the default dist with `pages` replacing or adding pages. */
async function runWithPages(pages: Record<string, string>): Promise<{ status: number | null; stdout: string }> {
  let result: { status: number | null; stdout: string } = { status: null, stdout: "" };
  await withDist(async (dir) => {
    await writeSyntheticDist(dir, { pages });
    await writeBudget(dir);
    result = run(dir);
  });
  return result;
}

test("fails a title over 60 characters and names the page", async () => {
  const result = await runWithPages({ "index.html": doc("t".repeat(61), "home") });

  assert.equal(result.status, 1, result.stdout);
  assert.match(result.stdout, /✗ index\.html: title is 61 characters/);
});

test("fails an empty title", async () => {
  const result = await runWithPages({ "index.html": doc("", "home", descriptionFor("Home page")) });

  assert.equal(result.status, 1, result.stdout);
  assert.match(result.stdout, /✗ index\.html: title is 0 characters/);
});

test("fails a duplicate title and names both pages", async () => {
  const result = await runWithPages({
    "rules/meta/b.html": doc("Rule meta/a", "rule meta/b", descriptionFor("Rule meta/b")),
  });

  assert.equal(result.status, 1, result.stdout);
  const line = result.stdout.split("\n").find((l) => l.includes("duplicates"));
  assert.ok(line, result.stdout);
  assert.match(line, /rules\/meta\/a\.html/);
  assert.match(line, /rules\/meta\/b\.html/);
  assert.match(line, /Rule meta\/a/);
});

test("fails a description under 50 characters", async () => {
  const result = await runWithPages({ "index.html": doc("Home page", "home", "d".repeat(49)) });

  assert.equal(result.status, 1, result.stdout);
  assert.match(result.stdout, /✗ index\.html: description is 49 characters/);
});

test("fails a description over 160 characters", async () => {
  const result = await runWithPages({ "index.html": doc("Home page", "home", "d".repeat(161)) });

  assert.equal(result.status, 1, result.stdout);
  assert.match(result.stdout, /✗ index\.html: description is 161 characters/);
});

test("passes a title of 60 characters decoded that is longer raw", async () => {
  const title = "&lt;" + "t".repeat(58) + "&gt;"; // 66 raw, 60 decoded
  const result = await runWithPages({ "index.html": doc(title, "home", descriptionFor("Home page")) });

  assert.equal(result.status, 0, result.stdout);
  assert.doesNotMatch(result.stdout, /✗/, result.stdout);
});

test("passes a description of 160 characters decoded that is longer raw", async () => {
  const description = "&lt;meta&gt; &quot;a&quot; &#39;b&#39; &amp; " + "d".repeat(160 - "<meta> \"a\" 'b' & ".length);
  assert.ok(description.length > 160, "sanity: raw form is over the limit");
  const result = await runWithPages({ "index.html": doc("Home page", "home", description) });

  assert.equal(result.status, 0, result.stdout);
  assert.doesNotMatch(result.stdout, /✗/, result.stdout);
});

test("skips a page with no <head>, like a search-console verification file", async () => {
  const result = await runWithPages({
    "google1234567890abcdef.html": "google-site-verification: google1234567890abcdef.html",
  });

  assert.equal(result.status, 0, result.stdout);
  assert.doesNotMatch(result.stdout, /✗/, result.stdout);
});
