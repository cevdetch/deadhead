import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { createServer as createHttpServer, type IncomingMessage, type ServerResponse } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test, { type TestContext } from "node:test";
import { runInNewContext } from "node:vm";
import { gzipSync } from "node:zlib";
import { build, createLogger, createServer, type Plugin, type ViteDevServer } from "vite";

import deadhead, { type DeadheadViteOptions } from "../packages/cli/vite.ts";
import { loadRules } from "../packages/rules/load.ts";
import { compileForRun, lintSource } from "../packages/cli/source.ts";

const RULE = "meta/http-equiv-x-ua-compatible";
const CLEAN = '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Page</title></head><body>é</body></html>';
const PAGE = CLEAN.replace("<title>", '\n<meta http-equiv="X-UA-Compatible" content="IE=edge">\n<title>');
const rules = await loadRules();
const compiled = compileForRun(rules, {});
const MARKER = '\n<script type="module" data-deadhead-report';
type Route = (req: IncomingMessage, res: ServerResponse) => void;

async function start(t: TestContext, options: DeadheadViteOptions = {}, route?: Route, config?: string, nonce?: string) {
  const root = await mkdtemp(join(tmpdir(), "dh-vite-"));
  let server: ViteDevServer | undefined;
  t.after(async () => {
    await server?.close();
    await rm(root, { recursive: true, force: true });
  });
  await writeFile(join(root, "index.html"), PAGE);
  if (config !== undefined) await writeFile(join(root, "deadhead.config.ts"), config);
  const logs: string[] = [];
  const logger = createLogger("info", { allowClearScreen: false });
  logger.info = logger.warn = logger.error = (message) => { logs.push(message); };
  const ssr: Plugin = {
    name: "test-ssr",
    configureServer(server) {
      if (route) server.middlewares.use((req, res) => { route(req, res); });
    },
  };
  server = await createServer({
    root, configFile: false, customLogger: logger,
    plugins: [ssr, deadhead(options)], // enforce:pre observes framework routes too.
    ...(nonce === undefined ? {} : { html: { cspNonce: nonce } }),
    server: { host: "127.0.0.1", port: 0, watch: null },
  });
  await server.listen();
  const address = server.httpServer?.address();
  assert.ok(address && typeof address !== "string");
  return { server, root, logs, url: `http://127.0.0.1:${address.port}` };
}

test("unchanged responses reuse analysis and changed HTML is rechecked", async t => {
  const rule = (await loadRules()).find(rule => rule.meta.ruleId === "attr/script-async")!;
  const original = rule.match!;
  let calls = 0;
  rule.match = (element, context) => { calls++; return original(element, context); };
  t.after(() => { rule.match = original; });
  let page = PAGE.replace("</body>", '<script async>console.log("x")</script></body>');
  const { url, logs } = await start(t, {}, (_req, res) => {
    res.setHeader("content-type", "text/html");
    res.end(page);
  });
  const first = await (await fetch(url)).text();
  const count = logs.length;
  assert.equal(await (await fetch(url + "?reload=1")).text(), first);
  assert.equal(calls, 1);
  assert.equal(logs.length, count);
  page += "\n";
  await (await fetch(url)).text();
  assert.equal(calls, 2);
  assert.equal(logs.length, count, "changed bytes with identical findings still avoid repeated terminal output");
});

test("large reports evict old cached analysis instead of retaining unlimited text", async t => {
  const rule = (await loadRules()).find(rule => rule.meta.ruleId === "attr/script-async")!;
  const original = rule.match!;
  let calls = 0;
  rule.match = (element, context) => { calls++; return original(element, context); };
  t.after(() => { rule.match = original; });
  const page = PAGE.replace("</head>", '<meta name="keywords" content="x">'.repeat(50) + "</head>")
    .replace("</body>", '<script async>console.log("x")</script></body>');
  const { url } = await start(t, {}, (_req, res) => { res.setHeader("content-type", "text/html"); res.end(page); });
  await (await fetch(url + "/first")).text();
  await (await fetch(url + "/first")).text();
  assert.equal(calls, 1);
  for (let i = 0; i < 150; i++) await (await fetch(url + `/other-${i}`)).text();
  await (await fetch(url + "/first")).text();
  assert.equal(calls, 152, "the first report was evicted and recomputed");
});

function browserLogs(html: string): string[] {
  const script = html.slice(html.indexOf(MARKER)).replace(/^\n<script[^>]*>/, "").replace(/<\/script>$/, "");
  const logs: string[] = [];
  const record = (format: string, message: string) => { assert.equal(format, "%s"); logs.push(message); };
  runInNewContext(script, { console: { groupCollapsed: record, groupEnd() {}, warn: record, info: record } });
  return logs;
}

test("Vite dev reports the served HTML with the CLI's positions, advice and links, without linting its own script", async (t) => {
  const { url, logs } = await start(t);
  const response = await fetch(url);
  const html = await response.text();
  const source = html.slice(0, html.indexOf(MARKER));
  const expected = lintSource(source, "/ (served HTML)", compiled, {});
  const finding = expected.findings.find((f) => f.ruleId === RULE);
  assert.ok(finding?.loc);
  assert.equal(expected.findings.length, 1);
  assert.match(logs.join("\n"), new RegExp(`${finding.loc.line}:${finding.loc.col}`));
  assert.ok(logs.some((line) => line.includes(finding.url) && line.includes(finding.replacement)));
  const console = browserLogs(html);
  assert.ok(console.some((line) => line.includes(RULE)));
  assert.ok(console.some((line) => line.includes(finding.message)));
  assert.equal(response.headers.get("content-length"), null);
  assert.equal(response.headers.get("etag"), null);
  assert.equal(html.split(MARKER).length, 2);
});

test("SSR HTML bypassing transformIndexHtml gets a report; unchanged reloads and query strings do not repeat terminal output", async (t) => {
  let page = PAGE;
  const { url, logs } = await start(t, {}, (_req, res) => {
    res.writeHead(200, "OK", { "content-type": "text/html; charset=utf-8", "content-length": Buffer.byteLength(page), etag: '"old"' });
    res.end(page);
  });
  const first = await (await fetch(`${url}/page?q=1`)).text();
  assert.ok(first.startsWith(PAGE + MARKER));
  assert.ok(logs[0]?.includes("/page (served HTML)"));
  const count = logs.length;
  assert.ok((await (await fetch(`${url}/page?q=2`)).text()).includes(MARKER));
  assert.equal(logs.length, count);
  page = CLEAN;
  const clean = await (await fetch(`${url}/page`)).text();
  assert.equal(logs.length, count + 1);
  assert.match(logs.at(-1)!, /no findings/);
  assert.ok(browserLogs(clean).some((line) => line.endsWith("0 findings")));
  await fetch(`${url}/page`);
  assert.equal(logs.length, count + 1);
});

test("streamed HTML flows before end, retains split UTF-8 characters and forwards callbacks", async (t) => {
  let finish: (() => void) | undefined;
  let writeCallback = false;
  let endCallback = false;
  const bytes = Buffer.from(PAGE);
  const split = bytes.indexOf(Buffer.from("é")) + 1;
  const { url, logs } = await start(t, {}, (_req, res) => {
    res.setHeader("content-type", "text/html; charset=utf-8");
    res.setHeader("content-length", bytes.length);
    res.flushHeaders();
    res.write(bytes.subarray(0, split), () => { writeCallback = true; });
    finish = () => { res.end(bytes.subarray(split), () => { endCallback = true; }); };
  });
  const response = await fetch(url);
  const reader = response.body!.getReader();
  const first = await reader.read();
  assert.ok(first.value && first.value.length > 0, "the first chunk arrives while the response is still open");
  assert.equal(logs.length, 0, "report waits for the complete document");
  assert.ok(finish);
  finish();
  const received = [Buffer.from(first.value)];
  for (;;) {
    const chunk = await reader.read();
    if (chunk.done) break;
    received.push(Buffer.from(chunk.value));
  }
  const html = Buffer.concat(received).toString("utf8");
  assert.ok(html.startsWith(PAGE + MARKER));
  assert.equal(writeCallback, true);
  assert.equal(endCallback, true);
  assert.match(logs.join("\n"), new RegExp(RULE));
});

test("console:false preserves the response bytes, content length and validators", async (t) => {
  const { url, logs } = await start(t, { console: false }, (_req, res) => {
    res.writeHead(200, { "content-type": "text/html", "content-length": Buffer.byteLength(PAGE), etag: '"original"' });
    res.end(PAGE, "utf8");
  });
  const response = await fetch(url);
  assert.equal(await response.text(), PAGE);
  assert.equal(response.headers.get("content-length"), String(Buffer.byteLength(PAGE)));
  assert.equal(response.headers.get("etag"), '"original"');
  assert.match(logs.join("\n"), new RegExp(RULE));
});

test("write and end retain third-argument callbacks with an omitted encoding, with console on and off", async (t) => {
  for (const console of [true, false]) {
    let writeCallback = false;
    let endCallback = false;
    let accepted: boolean | undefined;
    const page = PAGE.replace("</body>", "x".repeat(128 * 1024) + "</body>");
    const { url } = await start(t, { console }, (_req, res) => {
      res.setHeader("content-type", "text/html");
      accepted = Reflect.apply(res.write, res, [page.slice(0, -10), undefined, () => { writeCallback = true; }]);
      Reflect.apply(res.end, res, [page.slice(-10), undefined, () => { endCallback = true; }]);
    });
    const html = await (await fetch(url)).text();
    assert.equal(accepted, false, "large write keeps Node's backpressure signal");
    assert.equal(writeCallback, true);
    assert.equal(endCallback, true);
    assert.equal(console ? html.slice(0, html.indexOf(MARKER)) : html, page);
  }
});

test("plugin options beat root config, merge rule settings, and match URL paths without queries", async (t) => {
  const config = `export default { include: ["dist/**"], ignore: ["pages/vendor/**"], rules: { "${RULE}": "off", "head/title": "off" }, skipTemplates: true };`;
  const page = PAGE.replace("<title>Page</title>", "") + '<template><meta name="keywords" content="x"></template>';
  const { url, logs } = await start(t, { include: ["pages/**"], rules: { [RULE]: "harmful" } }, (_req, res) => {
    res.setHeader("content-type", "text/html"); res.end(page);
  }, config);
  for (const path of ["/other", "/pages/vendor/a"]) {
    assert.equal(await (await fetch(url + path)).text(), page);
  }
  assert.equal(logs.length, 0);
  const html = await (await fetch(`${url}/pages/a?x=/vendor/`)).text();
  const report = browserLogs(html).join("\n");
  assert.match(report, new RegExp(RULE));
  assert.match(report, /harmful/);
  assert.doesNotMatch(report, /head\/title|meta\/keywords/);
});

test("invalid plugin and project settings fail at server startup", async (t) => {
  await assert.rejects(start(t, { rules: { "meta/typo": "off" } }), /unknown rule `meta\/typo`/);
  await assert.rejects(start(t, { console: "yes" as unknown as boolean }), /`console` must be a boolean/);
  await assert.rejects(start(t, {}, undefined, 'export default { skipTemplates: "yes" };'), /`skipTemplates` must be a boolean/);
});

test("non-HTML, compressed, partial, non-UTF-8, no-transform, oversized and HEAD responses pass through", async (t) => {
  const large = PAGE + "x".repeat(2 * 1024 * 1024);
  const zipped = gzipSync(PAGE);
  const { url, logs } = await start(t, {}, (req, res) => {
    res.setHeader("content-type", "text/html");
    switch (req.url) {
      case "/json": res.setHeader("content-type", "application/json"); res.end(PAGE); break;
      case "/gzip": res.setHeader("content-encoding", "gzip"); res.end(zipped); break;
      case "/partial": res.statusCode = 206; res.setHeader("content-range", "bytes 0-9/100"); res.end(PAGE); break;
      case "/partial-no-header": res.statusCode = 206; res.end(PAGE); break;
      case "/latin1": res.setHeader("content-type", "text/html; charset=iso-8859-1"); res.end(PAGE); break;
      case "/unaltered": res.setHeader("cache-control", "no-transform"); res.end(PAGE); break;
      case "/large": res.setHeader("content-length", Buffer.byteLength(large)); res.end(large); break;
      case "/large-stream": res.write(PAGE); res.end(large); break;
      case "/head": res.setHeader("content-length", Buffer.byteLength(PAGE)); res.end(PAGE); break;
      default: res.writeHead(304, { etag: '"same"' }); res.end();
    }
  });
  for (const path of ["json", "gzip", "partial", "partial-no-header", "latin1", "unaltered"]) {
    assert.equal(await (await fetch(`${url}/${path}`)).text(), PAGE, path);
  }
  assert.equal(await (await fetch(`${url}/large`)).text(), large);
  assert.equal(await (await fetch(`${url}/large-stream`)).text(), PAGE + large);
  assert.equal((await fetch(`${url}/cached`)).status, 304);
  const head = await fetch(`${url}/head`, { method: "HEAD" });
  assert.equal(head.headers.get("content-length"), String(Buffer.byteLength(PAGE)));
  assert.equal(logs.length, 0);
});

test("raw writeHead headers preserve repeated cookies and Vite's CSP nonce reaches the console script", async (t) => {
  const { url } = await start(t, {}, (_req, res) => {
    res.writeHead(200, ["Content-Type", "text/html", "Set-Cookie", "a=1", "Set-Cookie", "b=2", "Content-Length", String(Buffer.byteLength(PAGE))]);
    res.end(PAGE);
  }, undefined, 'test"<&');
  const response = await fetch(url);
  assert.deepEqual(response.headers.getSetCookie(), ["a=1", "b=2"]);
  assert.match(await response.text(), /nonce="test&quot;&lt;&amp;"/);
});

test("strict content-length responses retain bytes and headers while reporting in the terminal", async (t) => {
  const { url, logs } = await start(t, {}, (_req, res) => {
    res.strictContentLength = true;
    res.setHeader("content-type", "text/html");
    res.setHeader("content-length", Buffer.byteLength(PAGE));
    res.end(PAGE);
  });
  const response = await fetch(url);
  assert.equal(await response.text(), PAGE);
  assert.equal(response.headers.get("content-length"), String(Buffer.byteLength(PAGE)));
  assert.match(logs.join("\n"), new RegExp(RULE));
});

test("suppressions warn on unknown rules and accept known rules disabled by config", async (t) => {
  const source = '<!-- deadhead-disable meta/keywords -->\n<!-- deadhead-disable meta/typo -->\n' + PAGE;
  const { url, logs } = await start(t, { rules: { "meta/keywords": "off" } }, (_req, res) => {
    res.setHeader("content-type", "text/html"); res.end(source);
  });
  const html = await (await fetch(url)).text();
  const report = logs.join("\n") + browserLogs(html).join("\n");
  assert.match(report, /meta\/typo/);
  assert.doesNotMatch(report, /meta\/keywords/);
});

test("report data cannot terminate the script and console output treats percent codes as text", async (t) => {
  const { url } = await start(t, {}, (_req, res) => { res.setHeader("content-type", "text/html"); res.end(PAGE); });
  const html = await (await fetch(`${url}/%3C%2Fscript%3E%3Cscript%3Ethrow%201%3C%2Fscript%3E%25c`)).text();
  const script = html.slice(html.indexOf(MARKER));
  assert.equal(script.match(/<\/script>/g)?.length, 1);
  assert.ok(browserLogs(html).some((line) => line.includes("</script><script>throw 1</script>%c")));
});

test("vite build does not lint or inject the plugin report", async (t) => {
  const { root, logs } = await start(t);
  const logger = createLogger("silent");
  logger.warn = logger.info = logger.error = (message) => { logs.push(message); };
  const output = await build({ root, configFile: false, plugins: [deadhead()], customLogger: logger, build: { write: false } });
  assert.ok(!Array.isArray(output) && "output" in output);
  const html = output.output.find((item) => item.type === "asset" && item.fileName === "index.html");
  assert.ok(html && html.type === "asset");
  assert.ok(String(html.source).includes('http-equiv="X-UA-Compatible"'));
  assert.ok(!String(html.source).includes("data-deadhead-report"));
  assert.ok(!logs.some((line) => line.includes("[deadhead]")));
});

test("a separate Node HTTP host reports HTML that passes through Vite middleware mode", async (t) => {
  for (const console of [true, false]) {
    const root = await mkdtemp(join(tmpdir(), "dh-vite-host-"));
    const logs: string[] = [];
    const logger = createLogger("info", { allowClearScreen: false });
    logger.info = logger.warn = logger.error = (message) => { logs.push(message); };
    let vite: ViteDevServer | undefined;
    const host = createHttpServer((req, res) => {
      assert.ok(vite);
      vite.middlewares(req, res, () => {
        if (req.url === "/data") {
          res.setHeader("content-type", "application/json");
          res.end('{"ok":true}');
        } else {
          res.setHeader("content-type", "text/html; charset=utf-8");
          res.setHeader("content-length", Buffer.byteLength(PAGE));
          res.setHeader("etag", '"original"');
          res.end(PAGE);
        }
      });
    });
    t.after(async () => {
      try {
        if (host.listening) await new Promise<void>((resolve, reject) => {
          host.close((error) => error ? reject(error) : resolve());
        });
      } finally {
        await vite?.close();
        await rm(root, { recursive: true, force: true });
      }
    });
    vite = await createServer({
      root, configFile: false, customLogger: logger,
      plugins: [deadhead({ console })], appType: "custom",
      server: { middlewareMode: true, watch: null },
    });
    await new Promise<void>((resolve, reject) => {
      host.once("error", reject);
      host.listen(0, "127.0.0.1", resolve);
    });
    const address = host.address();
    assert.ok(address && typeof address !== "string");
    const url = `http://127.0.0.1:${address.port}`;
    const response = await fetch(url, { signal: AbortSignal.timeout(30_000) });
    const html = await response.text();
    assert.match(logs.join("\n"), new RegExp(RULE));
    assert.equal(console ? html.slice(0, html.indexOf(MARKER)) : html, PAGE);
    assert.equal(html.split(MARKER).length, console ? 2 : 1);
    assert.equal(response.headers.get("content-length"), console ? null : String(Buffer.byteLength(PAGE)));
    assert.equal(response.headers.get("etag"), console ? null : '"original"');
    const count = logs.length;
    assert.equal(await (await fetch(`${url}/data`)).text(), '{"ok":true}');
    assert.equal(logs.length, count);
  }
});
