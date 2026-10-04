import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { chmod, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { aggregate } from "../corpus/aggregate.ts";
import { classifyRaw, duplicateRanks, isBlocked, isErrorPage, type RawFacts } from "../corpus/classify.ts";
import { describeError, errorKind, fetchSite, USER_AGENT } from "../corpus/fetch.ts";
import { lintRecord, RENDER_EXCLUDED } from "../corpus/lint.ts";
import { fixBytes, itemKey, summary } from "../corpus/metrics.ts";
import { detectPlatforms } from "../corpus/platforms.ts";
import { fetchOk, parseList } from "../corpus/list.ts";
import { chromiumArgs, render } from "../corpus/render.ts";
import { disallowsRoot, TOKEN } from "../corpus/robots.ts";
import { eachLimited, recordFile } from "../corpus/snapshot.ts";
import type { LintLine, SnapshotRecord } from "../corpus/types.ts";
import type { Finding } from "../packages/core/types.ts";
import { compileForRun } from "../packages/cli/lint.ts";
import { loadRules } from "../packages/rules/load.ts";
import { wilson } from "../corpus/stats.ts";

const round4 = ([lo, hi]: [number, number]): [number, number] => [Math.round(lo * 1e4) / 1e4, Math.round(hi * 1e4) / 1e4];

test("wilson: 95% intervals at the edges and for rare rates", () => {
  assert.deepEqual(round4(wilson(0, 100)), [0, 0.037]);
  assert.deepEqual(round4(wilson(100, 100)), [0.963, 1]);
  assert.deepEqual(round4(wilson(1, 1000)), [0.0002, 0.0056]);
  assert.deepEqual(round4(wilson(70, 7000)), [0.0079, 0.0126]);
  assert.deepEqual(wilson(0, 0), [0, 0]);
});

test("robots: the * group decides when no group names the token", () => {
  assert.equal(disallowsRoot("User-agent: *\nDisallow: /"), true);
  assert.equal(disallowsRoot("User-agent: *\nDisallow: /private"), false);
  assert.equal(disallowsRoot("User-agent: *\nDisallow:"), false);
  assert.equal(disallowsRoot("User-agent: *\r\nDisallow: /*\r\n"), true);
  assert.equal(disallowsRoot("# none\nUser-agent: *  # all\nDisallow: /  # everything"), true);
  assert.equal(disallowsRoot(""), false);
});

test("robots: a group naming the token wins over *", () => {
  assert.equal(disallowsRoot(`User-agent: *\nDisallow: /\n\nUser-agent: ${TOKEN}\nAllow: /`), false);
  assert.equal(disallowsRoot(`User-agent: *\nAllow: /\n\nUser-agent: DeadHead-Research\nDisallow: /`), true);
  assert.equal(disallowsRoot("User-agent: Googlebot\nDisallow: /\n\nUser-agent: *\nAllow: /"), false);
});

test("robots: an equal Allow beats Disallow, and agents in one group share its rules", () => {
  assert.equal(disallowsRoot("User-agent: *\nDisallow: /\nAllow: /"), false);
  assert.equal(disallowsRoot("User-agent: Googlebot\nUser-agent: *\nDisallow: /"), true);
});

const facts = (overrides: Partial<RawFacts>): RawFacts => ({
  robots: "allowed",
  error: null,
  status: 200,
  contentType: "text/html; charset=utf-8",
  bytes: 200_000,
  head: "<!doctype html><title>Home</title>",
  ...overrides,
});

test("classify: each outcome from its facts", () => {
  assert.equal(classifyRaw(facts({})), "linted");
  assert.equal(classifyRaw(facts({ robots: "disallowed" })), "skipped");
  assert.equal(classifyRaw(facts({ error: "dns", status: null })), "no-site");
  assert.equal(classifyRaw(facts({ error: "connect", status: null })), "no-site");
  assert.equal(classifyRaw(facts({ error: "tls", status: null })), "no-site");
  assert.equal(classifyRaw(facts({ error: "timeout", status: null })), "failed");
  assert.equal(classifyRaw(facts({ status: 503 })), "failed");
  assert.equal(classifyRaw(facts({ contentType: "application/json" })), "failed");
  assert.equal(classifyRaw(facts({ contentType: null })), "failed");
});

test("classify: both blocked thresholds", () => {
  assert.equal(isBlocked(9_999, "<html>"), true, "under 10 kB");
  assert.equal(isBlocked(50_000, "<title>Just a moment...</title>"), true, "challenge marker under 60 kB");
  assert.equal(isBlocked(50_000, "<title>Home</title>"), false);
  assert.equal(isBlocked(80_000, "<p>Wait just a moment, then try the captcha</p>"), false, "60 kB and up is a page that mentions it");
  assert.equal(classifyRaw(facts({ bytes: 4_000 })), "blocked");
  // A loading interstitial seen on two top-200 sites: spinner GIF, noindex, no title, 13.6 kB.
  assert.equal(isBlocked(13_602, '<html><head><meta name="robots" content="noindex, noarchive" /><style>.gorizontal-vertikal {}</style>'), true);
});

test("classify: a challenge title is a wall at any size", () => {
  // Branded challenge pages run to hundreds of kB; the title gives them away.
  assert.equal(isBlocked(755_000, "<html><head><title>Just a moment...</title>"), true);
  assert.equal(isBlocked(450_000, '<title data-x="1">Access denied | Example</title>'), true);
  assert.equal(isBlocked(270_000, "<title>\n  Security Verification\n</title>"), true);
  assert.equal(isBlocked(200_000, "<title>Captcha solutions for developers</title>"), false, "a page about captchas is not a wall");
});

test("classify: Chromium's own error pages and not-found pages are not home pages", () => {
  assert.equal(isErrorPage('<html><head><title>example.org</title></head><body class="neterror" style="font-size: 75%">'), true);
  assert.equal(isErrorPage('<html><head><title>Privacy error</title></head><body id="body" class="ssl"><div>net::ERR_CERT_DATE_INVALID'), true);
  for (const title of ["Page not found", "404", "404 | Example", "Error 404 - Example", "404 Not Found", "Not Found"]) {
    assert.equal(isErrorPage(`<title>${title}</title><body>`), true, title);
  }
  for (const title of ["404 Media", "Lost and Found | Example", "Example: news"]) assert.equal(isErrorPage(`<title>${title}</title><body>`), false, title);
  assert.equal(isErrorPage('<title>Home</title><body class="neterror-free">'), false);
});

test("classify: walls served with an error status are blocked, other errors failed", () => {
  for (const status of [401, 403, 429]) assert.equal(classifyRaw(facts({ status, bytes: 5_000 })), "blocked", `HTTP ${status}`);
  assert.equal(classifyRaw(facts({ status: 403, bytes: 400_000 })), "blocked", "a big 403 page is still a wall");
  assert.equal(classifyRaw(facts({ status: 503, head: "<title>Just a moment...</title><div id=cf-chl>" })), "blocked");
  assert.equal(classifyRaw(facts({ status: 503 })), "failed");
  assert.equal(classifyRaw(facts({ status: 404 })), "failed");
  assert.equal(classifyRaw(facts({ status: 403, contentType: "application/json" })), "failed", "not HTML");
});

test("classify: a final origin counts once, at the best rank", () => {
  const dup = duplicateRanks([
    { rank: 5, finalOrigin: "https://aws.amazon.com" },
    { rank: 2, finalOrigin: "https://aws.amazon.com" },
    { rank: 3, finalOrigin: null },
    { rank: 4, finalOrigin: null },
    { rank: 1, finalOrigin: "https://www.google.com" },
  ]);
  assert.deepEqual([...dup], [5]);
});

test("list: Tranco CSV rows, CRLF and blank lines tolerated", () => {
  assert.deepEqual(parseList("1,google.com\r\n2,cloudflare.com\r\n\r\n"), [
    { rank: 1, domain: "google.com" },
    { rank: 2, domain: "cloudflare.com" },
  ]);
  assert.deepEqual(parseList("rank,domain\nx,broken\n3,example.org"), [{ rank: 3, domain: "example.org" }]);
});

test("fetch: errors sort into the classes classify needs", () => {
  const withCode = (code: string) => Object.assign(new TypeError("fetch failed"), { cause: Object.assign(new Error(code), { code }) });
  assert.equal(errorKind(withCode("ENOTFOUND")), "dns");
  assert.equal(errorKind(withCode("ECONNREFUSED")), "connect");
  assert.equal(errorKind(withCode("ERR_TLS_CERT_ALTNAME_INVALID")), "tls");
  assert.equal(errorKind(withCode("UND_ERR_CONNECT_TIMEOUT")), "timeout");
  // Happy eyeballs: every address timed out, reported as an AggregateError.
  const aggregate = Object.assign(new TypeError("fetch failed"), { cause: Object.assign(new AggregateError([], ""), { code: "ETIMEDOUT" }) });
  assert.equal(errorKind(aggregate), "timeout");
  assert.equal(errorKind(Object.assign(new Error("t"), { name: "TimeoutError" })), "timeout");
  assert.equal(errorKind(new Error("other")), "other");
});

test("fetch: robots.txt, the www retry, redirects and the user agent", async (t) => {
  const seen: string[] = [];
  const server = createServer((req, res) => {
    seen.push(`${req.headers["user-agent"] ?? ""} ${req.url ?? ""}`);
    const host = new URL(req.url ?? "/", "http://x").searchParams.get("host");
    if (req.url?.startsWith("/robots.txt")) {
      res.writeHead(200, { "content-type": "text/plain" });
      res.end(host === "blocked.test" ? "User-agent: *\nDisallow: /" : "User-agent: *\nDisallow: /admin");
      return;
    }
    if (req.url?.startsWith("/?")) {
      res.writeHead(302, { location: `/home?host=${host}` });
      res.end();
      return;
    }
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    res.end("<!doctype html><title>Home</title>");
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => server.close());
  const { port } = server.address() as AddressInfo;
  // A port that was free a moment ago; fetch refuses port 1 as a bad port before connecting.
  const closed = createServer();
  await new Promise<void>((resolve) => closed.listen(0, "127.0.0.1", resolve));
  const closedPort = (closed.address() as AddressInfo).port;
  await new Promise<void>((resolve) => closed.close(() => resolve()));
  // The apex points at a closed port, so it fails to connect and the www host is tried.
  const url = (host: string, path: string) =>
    host.startsWith("www.") || path === "/robots.txt"
      ? `http://127.0.0.1:${port}${path}${path.includes("?") ? "&" : "?"}host=${host}`
      : `http://127.0.0.1:${closedPort}${path}`;

  const ok = await fetchSite("example.test", { url });
  assert.equal(ok.robots, "allowed");
  assert.equal(ok.tried.length, 2);
  assert.equal(ok.status, 200);
  assert.match(ok.finalUrl ?? "", /\/home\?host=www\.example\.test$/);
  assert.equal(ok.body?.toString("utf8"), "<!doctype html><title>Home</title>");
  assert.equal(ok.error, null);
  assert.ok(seen.every((line) => line.startsWith(USER_AGENT)));

  const blocked = await fetchSite("blocked.test", { url });
  assert.equal(blocked.robots, "disallowed");
  assert.deepEqual(blocked.tried, []);
  assert.equal(blocked.body, null);
});

test("render: Chromium runs headless, isolated, with the project's user agent", () => {
  const args = chromiumArgs("https://example.org/", "/tmp/p1");
  assert.ok(args.includes("--headless=new"));
  assert.ok(args.includes("--dump-dom"));
  assert.ok(args.includes("--user-data-dir=/tmp/p1"));
  assert.ok(args.includes(`--user-agent=${USER_AGENT}`));
  assert.equal(args.at(-1), "https://example.org/");
});

test("snapshot: at most n tasks at once, every item once", async () => {
  let running = 0;
  let peak = 0;
  const seen: number[] = [];
  await eachLimited([1, 2, 3, 4, 5, 6, 7], 3, async (item) => {
    running++;
    peak = Math.max(peak, running);
    await new Promise((resolve) => setTimeout(resolve, 5));
    seen.push(item);
    running--;
  });
  assert.equal(peak, 3);
  assert.deepEqual(seen.sort((a, b) => a - b), [1, 2, 3, 4, 5, 6, 7]);
  assert.equal(recordFile("d", 42, "example.org"), "d/00042-example.org.json.gz");
});

const page = (head: string): string =>
  `<!doctype html><html lang="en"><head>${head}<title>Home</title><meta name="viewport" content="width=device-width"></head><body><p>${"x".repeat(20_000)}</p></body></html>`;

const record = (raw: string | null, rendered: string | null, overrides: Partial<SnapshotRecord> = {}): SnapshotRecord => ({
  rank: 7,
  domain: "example.org",
  listId: "TEST",
  fetchedAt: "2026-10-02T00:00:00.000Z",
  robots: "allowed",
  tried: ["https://example.org/"],
  finalUrl: "https://www.example.org/",
  status: 200,
  contentType: "text/html",
  bytes: raw === null ? 0 : Buffer.byteLength(raw),
  truncated: false,
  error: null,
  errorMessage: null,
  raw: raw === null ? null : Buffer.from(raw).toString("base64"),
  rendered,
  renderError: null,
  ms: { robots: 1, raw: 1, render: 1 },
  ...overrides,
});

test("lint: raw and rendered counts per rule, source-position rules left out of rendered", async () => {
  const compiled = compileForRun(await loadRules(), {});
  // charset after the first 1024 bytes trips head/charset-position in raw HTML.
  const html = page(`<!-- ${"p".repeat(1100)} --><meta charset="utf-8"><meta http-equiv="X-UA-Compatible" content="IE=edge">`);
  const { line } = lintRecord(record(html, html), compiled);
  assert.equal(line.raw.outcome, "linted");
  assert.equal(line.rendered.outcome, "linted");
  assert.equal(line.finalOrigin, "https://www.example.org");
  assert.equal(line.raw.counts?.["meta/http-equiv-x-ua-compatible"], 1);
  assert.equal(line.rendered.counts?.["meta/http-equiv-x-ua-compatible"], 1);
  assert.equal(line.raw.counts?.["head/charset-position"], 1);
  assert.equal(line.rendered.counts?.["head/charset-position"], undefined);
});

test("lint: no counts for a site that was not linted", async () => {
  const compiled = compileForRun(await loadRules(), {});
  const skipped = lintRecord(record(null, null, { robots: "disallowed", tried: [], finalUrl: null, status: null }), compiled).line;
  assert.equal(skipped.raw.outcome, "skipped");
  assert.equal(skipped.raw.counts, null);
  assert.equal(skipped.rendered.outcome, "not-rendered");
  const failedRender = lintRecord(record(page(""), null, { renderError: "timeout" }), compiled).line;
  assert.equal(failedRender.rendered.outcome, "failed");
  assert.equal(failedRender.rendered.counts, null);
  const errorPage = `<html><head><title>example.org</title></head><body class="neterror">${"x".repeat(185_000)}</body></html>`;
  const browserError = lintRecord(record(page(""), errorPage), compiled).line;
  assert.equal(browserError.rendered.outcome, "failed");
  assert.equal(browserError.rendered.counts, null);
});

test("lint: the rendered exclusions match the conformance suite's source-dependent rules", async () => {
  const source = await readFile(new URL("conformance/adapters.test.ts", import.meta.url), "utf8");
  const literal = /const SOURCE_DEPENDENT = new Set\((\[[^\]]*\])\)/.exec(source)?.[1];
  assert.ok(literal, "SOURCE_DEPENDENT not found in test/conformance/adapters.test.ts");
  assert.deepEqual([...RENDER_EXCLUDED].sort(), (JSON.parse(literal) as string[]).sort());
});

const noBytes = { bytes: null, fixBytes: null, items: null };
const lintLine = (
  rank: number,
  raw: Pick<LintLine["raw"], "outcome" | "counts"> & Partial<LintLine["raw"]>,
  origin: string | null = `https://site${rank}.test`,
  extra: Partial<LintLine> = {},
): LintLine => ({
  rank,
  domain: `site${rank}.test`,
  fetchedAt: `2026-10-02T00:00:0${rank % 10}.000Z`,
  finalOrigin: origin,
  platforms: [],
  raw: { ...noBytes, ...raw },
  rendered: raw.outcome === "linted" ? { outcome: "linted", counts: raw.counts } : { outcome: "not-rendered", counts: null },
  ...extra,
});

test("aggregate: rates, bands, duplicates, zero-hit rules and no domain names", () => {
  const lines = [
    lintLine(1, { outcome: "linted", counts: { "a/rule": 2 } }),
    lintLine(2, { outcome: "linted", counts: {} }),
    lintLine(3, { outcome: "linted", counts: { "a/rule": 1 } }, "https://site1.test"),
    lintLine(4, { outcome: "skipped", counts: null }, null),
    lintLine(1500, { outcome: "linted", counts: { "a/rule": 1 } }),
  ];
  const result = aggregate(lines, ["a/rule", "b/rule"], { listId: "TEST", listCreated: "2026-09-30", n: 10_000, version: "0.2.0", commit: "abc1234" });
  assert.deepEqual(result.coverage.raw, { linted: 3, duplicate: 1, skipped: 1 });
  const a = result.rules["a/rule"];
  assert.ok(a);
  assert.equal(a.raw.sites, 2);
  assert.equal(a.raw.rate, 0.6667);
  assert.deepEqual(a.raw.top1k, { linted: 2, sites: 1, rate: 0.5 });
  assert.deepEqual(a.raw.rest, { linted: 1, sites: 1, rate: 1 });
  assert.equal(result.rules["b/rule"]?.raw.sites, 0);
  assert.deepEqual(result.snapshot, { first: "2026-10-02T00:00:00.000Z", last: "2026-10-02T00:00:04.000Z" });
  const serialized = JSON.stringify(result);
  for (const line of lines) assert.ok(!serialized.includes(line.domain), `${line.domain} leaked`);
});

test("aggregate: the second band is null for a 1,000-site pilot", () => {
  const result = aggregate([lintLine(1, { outcome: "linted", counts: {} })], ["a/rule"], { listId: "T", listCreated: null, n: 1000, version: "0.2.0", commit: "x" });
  assert.equal(result.rules["a/rule"]?.raw.rest, null);
});

// A stand-in for Chromium: it leaves a helper writing into the profile, as
// Chromium's zygote and renderers do. The helper holds stdout open and
// recreates the profile if it is deleted, so only killing it ends it.
const FAKE_BROWSER = `#!/bin/sh
for a in "$@"; do case "$a" in --user-data-dir=*) dir="\${a#--user-data-dir=}";; esac; done
mkdir -p "$dir/Default"
( while :; do mkdir -p "$dir/Default" 2>/dev/null; touch "$dir/Default/f$(date +%s%N)" 2>/dev/null; sleep 0.01; done ) &
echo "$! $dir" > "$FAKE_PIDFILE"
if [ "$FAKE_MODE" = hang ]; then sleep 30; fi
echo "<html><head></head><body>ok</body></html>"
`;

const gone = async (pid: number): Promise<boolean> => {
  for (let i = 0; i < 50; i++) {
    try {
      process.kill(pid, 0);
    } catch {
      return true;
    }
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  return false;
};

for (const mode of ["exit", "hang"] as const) {
  test(`render: a browser that ${mode === "exit" ? "exits" : "hangs"} leaves no helper and no profile behind`, async (t) => {
    const dir = await mkdtemp(join(tmpdir(), "deadhead-fake-"));
    t.after(() => rm(dir, { recursive: true, force: true }));
    const binary = join(dir, "chromium");
    await writeFile(binary, FAKE_BROWSER);
    await chmod(binary, 0o755);
    process.env["FAKE_PIDFILE"] = join(dir, "pid");
    process.env["FAKE_MODE"] = mode;
    t.after(() => {
      delete process.env["FAKE_PIDFILE"];
      delete process.env["FAKE_MODE"];
    });

    const result = await render("https://example.org/", { binary, timeoutMs: 1_000 });
    if (mode === "exit") {
      assert.equal(result.error, null);
      assert.match(result.dom ?? "", /<body>ok<\/body>/);
    } else {
      assert.equal(result.dom, null);
      assert.match(result.error ?? "", /timed out/);
    }
    const [pid = "", profile = ""] = (await readFile(join(dir, "pid"), "utf8")).trim().split(" ");
    assert.ok(await gone(Number(pid)), "the helper outlived render()");
    assert.equal(existsSync(profile), false, "the profile outlived render()");
  });
}

test("render: a missing binary is a failed render, not a crash", async () => {
  const result = await render("https://example.org/", { binary: "/nonexistent/chromium", timeoutMs: 1_000 });
  assert.equal(result.dom, null);
  assert.match(result.error ?? "", /ENOENT/);
});

test("list: rate limits are retried, other errors throw", async (t) => {
  let calls = 0;
  const server = createServer((req, res) => {
    if (req.url === "/missing") {
      res.writeHead(404);
      res.end();
      return;
    }
    calls++;
    if (calls < 3) {
      res.writeHead(429);
      res.end();
      return;
    }
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ created_on: "2026-10-03T22:00:02" }));
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => server.close());
  const { port } = server.address() as AddressInfo;

  const res = await fetchOk(`http://127.0.0.1:${port}/id`, { delayMs: 10 });
  assert.equal(calls, 3);
  assert.deepEqual(await res.json(), { created_on: "2026-10-03T22:00:02" });
  await assert.rejects(fetchOk(`http://127.0.0.1:${port}/missing`, { delayMs: 10 }), /404/);
});

test("fetch: www after an apex error page or a dead apex, never after a wall", async (t) => {
  const server = createServer((req, res) => {
    const host = new URL(req.url ?? "/", "http://x").searchParams.get("host") ?? "";
    if (req.url?.startsWith("/robots.txt")) {
      res.writeHead(404);
      res.end();
      return;
    }
    const status = host.startsWith("www.") ? 200 : host.startsWith("wall") ? 403 : 404;
    res.writeHead(status, { "content-type": "text/html" });
    res.end(`<title>${status}</title>`);
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => server.close());
  const { port } = server.address() as AddressInfo;
  const url = (host: string, path: string) => `http://127.0.0.1:${port}${path}?host=${host}`;

  const notFound = await fetchSite("missing.test", { url });
  assert.equal(notFound.tried.length, 2);
  assert.equal(notFound.status, 200);

  const wall = await fetchSite("wall.test", { url });
  assert.equal(wall.tried.length, 1);
  assert.equal(wall.status, 403);
});

test("fetch: an error description carries the code when the cause has no message", () => {
  const aggregate = Object.assign(new TypeError("fetch failed"), { cause: Object.assign(new AggregateError([], ""), { code: "ETIMEDOUT" }) });
  assert.equal(describeError(aggregate), "fetch failed: ETIMEDOUT");
  const refused = Object.assign(new TypeError("fetch failed"), { cause: Object.assign(new Error("connect ECONNREFUSED 127.0.0.1:9"), { code: "ECONNREFUSED" }) });
  assert.equal(describeError(refused), "fetch failed: connect ECONNREFUSED 127.0.0.1:9");
  assert.equal(describeError("plain"), "plain");
});

// ---- Report metrics: bytes, items, platforms, rollups ----

test("metrics: an item names what a fix removes", () => {
  assert.equal(itemKey('<meta name="Twitter:Title" content="x">', '<meta name="Twitter:Title" content="x">', "remove-element"), "meta[name=twitter:title]");
  assert.equal(itemKey('<meta property="og:locale" content="en">', '<meta property="og:locale" content="en">', "remove-element"), "meta[property=og:locale]");
  assert.equal(itemKey('<meta http-equiv="X-UA-Compatible" content="IE=edge">', '<meta http-equiv="X-UA-Compatible" content="IE=edge">', "remove-element"), "meta[http-equiv=x-ua-compatible]");
  assert.equal(itemKey('<script type="text/javascript" src="a.js">', ' type="text/javascript"', "remove-attribute"), "script[type]");
  assert.equal(itemKey("<script defer async src=a.js>", " defer", "remove-attribute"), "script[defer]");
  assert.equal(itemKey('<link rel="shortcut icon" href="/f.ico">', "shortcut ", "remove-tokens"), "link[rel~=shortcut]");
  // A token fix can rewrite the whole value: what it drops is the removed tokens minus the kept ones.
  assert.equal(itemKey('<link rel="shortcut icon" href="/f.ico">', "shortcut icon", "remove-tokens", "icon"), "link[rel~=shortcut]");
  assert.equal(itemKey("<center>", "<center>", "remove-element"), "center");
});

test("metrics: a bare element names the rule that removes it", () => {
  const source = '<head><script nomodule src="p.js"></script></head>';
  const start = source.indexOf("<script");
  const end = source.indexOf("</head>");
  const finding = { ruleId: "attr/script-nomodule", range: [start, end], fix: { ruleId: "attr/script-nomodule", range: [start, end], text: "" } } as unknown as Finding;
  assert.deepEqual(fixBytes(source, [finding], new Map([["attr/script-nomodule", "remove-element"]])).items, { "script (attr/script-nomodule)": end - start });
});

test("metrics: platforms from documented signatures", () => {
  assert.deepEqual(detectPlatforms('<meta name="generator" content="WordPress 6.6"><link href="/wp-content/x.css">'), ["wordpress"]);
  assert.deepEqual(detectPlatforms('<script id="__NEXT_DATA__" type="application/json">{}</script>'), ["next.js"]);
  assert.deepEqual(detectPlatforms('<link href="https://cdn.shopify.com/s/files/x.css">'), ["shopify"]);
  assert.deepEqual(detectPlatforms("<html><head><title>Plain</title></head></html>"), []);
  assert.deepEqual(detectPlatforms('<p>We moved off wp-content years ago</p>'), [], "prose is not a signature");
});

test("metrics: quantiles and means", () => {
  assert.deepEqual(summary([5, 1, 3, 2, 4]), { median: 3, mean: 3, p90: 5, total: 15 });
  assert.deepEqual(summary([]), { median: 0, mean: 0, p90: 0, total: 0 });
});

test("lint: bytes saved, per rule and item, and platforms", async () => {
  const rules = await loadRules();
  const compiled = compileForRun(rules, {});
  const ops = new Map(rules.map((r) => [r.meta.ruleId, r.meta.fix.op]));
  // X-UA-Compatible is reported but has fix op "none": it removes no bytes.
  const html = page('<meta charset="utf-8"><meta http-equiv="X-UA-Compatible" content="IE=edge"><meta name="keywords" content="a, b"><script type="text/javascript" src="/wp-content/a.js"></script>');
  const { line } = lintRecord(record(html, html), compiled, ops);
  const keywords = '<meta name="keywords" content="a, b">'.length;
  assert.equal(line.raw.counts?.["meta/http-equiv-x-ua-compatible"], 1);
  assert.equal(line.raw.fixBytes?.["meta/http-equiv-x-ua-compatible"], undefined);
  assert.equal(line.raw.fixBytes?.["meta/keywords"], keywords);
  assert.equal(line.raw.fixBytes?.["attr/script-type-javascript"], ' type="text/javascript"'.length);
  assert.equal(line.raw.items?.["meta[name=keywords]"], keywords);
  assert.equal(line.raw.items?.["script[type]"], ' type="text/javascript"'.length);
  assert.ok(line.raw.bytes !== null && line.raw.bytes.saved >= keywords + 22, "the full fix removes at least both");
  assert.ok(line.raw.bytes.savedBrotli > 0 && line.raw.bytes.brotli < line.raw.bytes.page);
  assert.deepEqual(line.platforms, ["wordpress"]);
  const skipped = lintRecord(record(null, null, { robots: "disallowed", tried: [], finalUrl: null, status: null }), compiled, ops).line;
  assert.equal(skipped.raw.bytes, null);
  assert.equal(skipped.raw.fixBytes, null);
});

const bytes = (saved: number, savedBrotli: number) => ({ page: 100_000, gzip: 20_000, brotli: 15_000, saved, savedGzip: savedBrotli + 10, savedBrotli });

test("aggregate: severity rollups and findings per page", () => {
  const lines = [
    lintLine(1, { outcome: "linted", counts: { "h/rule": 1, "u/rule": 3 } }),
    lintLine(2, { outcome: "linted", counts: { "u/rule": 1 } }),
    lintLine(3, { outcome: "linted", counts: {} }),
    lintLine(4, { outcome: "linted", counts: { "d/rule": 2 } }),
  ];
  const severities = { "h/rule": "harmful", "d/rule": "deprecated", "u/rule": "unnecessary" } as const;
  const result = aggregate(lines, Object.keys(severities), { listId: "T", listCreated: null, n: 1000, version: "0.2.0", commit: "x" }, severities);
  assert.equal(result.severity.harmful.sites, 1);
  assert.equal(result.severity.harmful.rate, 0.25);
  assert.equal(result.severity.unnecessary.sites, 2);
  assert.equal(result.severity.any.sites, 3);
  assert.deepEqual(result.perPage.rules, { median: 1, mean: 1, p90: 2, total: 4 });
  assert.deepEqual(result.perPage.findings, { median: 1, mean: 1.75, p90: 4, total: 7 });
});

test("aggregate: the share of a rule's rendered sites where only scripts added it", () => {
  const lines = [
    lintLine(1, { outcome: "linted", counts: { "a/rule": 1 } }, undefined, { rendered: { outcome: "linted", counts: { "a/rule": 1 } } }),
    lintLine(2, { outcome: "linted", counts: {} }, undefined, { rendered: { outcome: "linted", counts: { "a/rule": 2 } } }),
    lintLine(3, { outcome: "linted", counts: {} }, undefined, { rendered: { outcome: "linted", counts: { "a/rule": 1 } } }),
    lintLine(4, { outcome: "blocked", counts: null }, undefined, { rendered: { outcome: "linted", counts: { "a/rule": 1 } } }),
  ];
  const result = aggregate(lines, ["a/rule"], { listId: "T", listCreated: null, n: 1000, version: "0.2.0", commit: "x" });
  // Sites 1 to 3 are linted both ways; 2 and 3 have it only after scripts. Site 4 has no raw page to compare.
  assert.deepEqual(result.rules["a/rule"]?.rendered.injected, { sites: 2, share: 0.6667 });
});

test("aggregate: bytes saved per page, rule and item, rare items left out", () => {
  const lines = Array.from({ length: 12 }, (_, i) =>
    lintLine(i + 1, {
      outcome: "linted",
      counts: { "a/rule": 1 },
      bytes: bytes(100 + i, 10 + i),
      fixBytes: { "a/rule": 50 },
      items: i === 0 ? { "meta[name=a]": 50, "meta[name=rare-site-specific]": 9 } : { "meta[name=a]": 50 },
    }),
  );
  const result = aggregate(lines, ["a/rule"], { listId: "T", listCreated: null, n: 1000, version: "0.2.0", commit: "x" });
  assert.equal(result.bytes.pages, 12);
  assert.equal(result.bytes.saved.raw.median, 105, "nearest rank: the 6th of 12");
  assert.equal(result.bytes.saved.brotli.total, 10 * 12 + 66);
  assert.deepEqual(result.bytes.rules["a/rule"], { sites: 12, median: 50, mean: 50, p90: 50, total: 600 });
  assert.deepEqual(Object.keys(result.bytes.items), ["meta[name=a]"], "an item on fewer than 10 sites stays out");
  assert.equal(result.bytes.items["meta[name=a]"]?.sites, 12);
});

test("aggregate: platforms with enough sites, and none below the threshold", () => {
  const lines = Array.from({ length: 40 }, (_, i) =>
    lintLine(i + 1, { outcome: "linted", counts: i < 30 ? { "a/rule": 1 } : {}, bytes: bytes(10, 5) }, undefined, { platforms: i < 31 ? ["wordpress"] : ["tiny"] }),
  );
  const result = aggregate(lines, ["a/rule"], { listId: "T", listCreated: null, n: 1000, version: "0.2.0", commit: "x" }, { "a/rule": "unnecessary" });
  assert.deepEqual(Object.keys(result.platforms), ["wordpress"], "9 sites is too few to report");
  assert.equal(result.platforms["wordpress"]?.sites, 31);
  assert.equal(result.platforms["wordpress"]?.severity.unnecessary, 0.9677);
  assert.equal(result.platforms["wordpress"]?.top[0]?.rule, "a/rule");
  assert.ok(!JSON.stringify(result).includes("site1.test"));
});
