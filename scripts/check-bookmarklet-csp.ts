#!/usr/bin/env node
/** Serve a page under the strictest CSP and Trusted Types, for a manual bookmarklet check in real browsers. */
import { readFile } from "node:fs/promises";
import { createServer } from "node:http";

const page = await readFile(new URL("../test/browser/hostile.html", import.meta.url));
const server = createServer((req, res) => {
  // The page links a shortcut icon to keep that finding in the count. Answer
  // it empty: the browser still logs one CSP refusal for it, which the steps
  // below tell the tester to ignore.
  if (req.url === "/f.ico") {
    res.writeHead(204, { "content-type": "image/x-icon" });
    res.end();
    return;
  }
  res.writeHead(200, {
    "content-type": "text/html; charset=utf-8",
    "content-security-policy": "default-src 'none'; style-src 'self'; require-trusted-types-for 'script'",
  });
  res.end(page);
});
server.listen(0, "127.0.0.1", () => {
  const { port } = server.address() as { port: number };
  process.stdout.write(
    `Serving http://127.0.0.1:${port}/ under a strict CSP.\n` +
      "1. pnpm build:bookmarklet, then copy the printed javascript: URL into a bookmark in Chrome, Firefox and Safari.\n" +
      "2. Open the page, click the bookmark. Pass: a styled panel listing 3 findings, and no CSP or Trusted Types errors in the console.\n" +
      "Ignore the single refusal for /f.ico: the page links it on purpose, and the refusal comes from the page, not the bookmarklet.\n" +
      "3. Switch the OS or browser to dark mode and click it again. The page declares color-scheme dark light; pass: the panel stays white with a readable close button.\n" +
      "4. Click full report. Pass: a new tab opens on deadhead.cevdet.ch/try and says the HTML was read from the rendered DOM; this page's CSP refuses the re-read, and the console shows that one connect-src refusal.\n" +
      "Ctrl-C to stop.\n",
  );
});
