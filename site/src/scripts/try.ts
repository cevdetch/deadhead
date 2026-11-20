/**
 * The try page in the browser. All output is built with createElement and
 * textContent: snippets come from the visitor's HTML and must never be parsed
 * as markup.
 */
import { decodeHandoff } from "../../../packages/browser/handoff.ts";
import { compileForRun } from "../../../packages/cli/source.ts";
import { loadRuntimeRules } from "../../../packages/rules/load.ts";
import { codeRuns } from "../lib/code-runs.ts";
import { decodeShare, encodeShare, lintHtml, SHARE_LIMIT, type LintView } from "../lib/playground.ts";

const $ = <T extends HTMLElement>(id: string): T => {
  const element = document.getElementById(id);
  if (element === null) throw new Error(`try page: #${id} is missing`);
  return element as T;
};

const lint = $<HTMLButtonElement>("try-lint");
const input = $<HTMLTextAreaElement>("try-input");
const file = $<HTMLInputElement>("try-file");
const share = $<HTMLButtonElement>("try-share");
const status = $<HTMLParagraphElement>("try-status");
const results = $<HTMLElement>("try-results");
const fixedBox = $<HTMLDetailsElement>("try-fixed");
const output = $<HTMLTextAreaElement>("try-output");
const copy = $<HTMLButtonElement>("try-copy");
const from = $<HTMLParagraphElement>("try-from");
const report = $<HTMLElement>("try-report");

let compiled: ReturnType<typeof compileForRun> | undefined;

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, text?: string): HTMLElementTagNameMap[K] => {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  return node;
};

/** A severity badge, colored by the site's `[data-severity]` styles. */
const badge = (severity: string, text: string): HTMLSpanElement => {
  const span = el("span", text);
  span.dataset["severity"] = severity;
  return span;
};

// The summary of the last report. Copy and file messages go in one text node
// after it rather than replacing it, so the status keeps describing the
// findings shown and, with aria-atomic="false", only the message is announced.
let summary: (string | Node)[] = [];
const note = document.createTextNode("");
// Whether the status describes a report that an edit has since made stale.
let reported = false;

const say = (message: string): void => {
  note.data = `${summary.length > 0 ? " " : ""}${message}`;
  if (note.parentNode !== status) status.append(note);
};

function render(view: LintView): void {
  results.replaceChildren();
  const total = view.findings.length;
  const mode = ` Checked as a ${view.page ? "page" : "fragment"}.`;
  if (total === 0) summary = ["No findings.", mode];
  else {
    summary = [`${total} finding${total === 1 ? "" : "s"}`];
    for (const severity of ["harmful", "deprecated", "unnecessary"] as const) {
      if (view.counts[severity] > 0) summary.push(" ", badge(severity, `${view.counts[severity]} ${severity}`));
    }
    summary.push(` · ${view.fixed} automatically fixed · ${view.remaining} remaining.`, mode);
    const list = el("ol");
    list.className = "rules";
    for (const finding of view.findings) {
      const item = el("li");
      // A heading per finding, so a screen reader can move between them. h2:
      // the report sits directly under the page's h1.
      const heading = el("h2");
      const link = el("a");
      link.href = finding.url;
      link.append(el("code", finding.ruleId));
      heading.append(link);
      const message = el("p");
      if (finding.line !== null) message.append(el("code", `${finding.line}:${finding.col}`), " ");
      message.append(finding.message);
      const snippet = el("pre");
      snippet.append(el("code", finding.snippet));
      const advice = el("p");
      advice.append(...codeRuns(finding.replacement).map((run, i) => (i % 2 === 1 ? el("code", run) : run)));
      advice.append(" ", el("small", finding.fixable ? "Automatic fix." : "Manual change."));
      if (finding.detail !== null) advice.append(el("br"), el("small", finding.detail));
      item.append(heading, badge(finding.severity, `${finding.severity}${finding.possible ? ", possible" : ""}`), message, snippet, advice);
      list.append(item);
    }
    results.append(list);
  }
  status.replaceChildren(...summary);
  reported = true;
  fixedBox.hidden = view.fixed === 0;
  output.value = view.output;
}

// Clears the report and shows a message in place of its summary.
const reset = (message: string): void => {
  summary = [message];
  reported = false;
  results.replaceChildren();
  fixedBox.hidden = true;
  output.value = "";
  status.replaceChildren(message);
};

const run = async (): Promise<void> => {
  try {
    if (compiled === undefined) status.replaceChildren("Loading the rules…");
    compiled ??= compileForRun(await loadRuntimeRules(), {});
  } catch {
    reset("Could not load the rules. Check your connection, then press Lint again.");
    return;
  }
  try {
    if (input.value.trim() === "") reset("Nothing to check. Paste HTML or open a file.");
    else render(lintHtml(input.value, compiled));
  } catch (error) {
    reset(`Could not check this HTML: ${error instanceof Error ? error.message.replace(/\.$/, "") : String(error)}. Try the CLI.`);
  }
};

// The page reserves a screen for the report so the automatic first run does
// not shift what follows. A run the reader starts may shrink it.
const release = (): void => {
  report.style.minHeight = "0";
};

// Lint is type="button", so a press before this script loads cannot submit
// the form, reload the page and lose the pasted HTML.
lint.addEventListener("click", () => {
  release();
  void run();
});

input.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
    event.preventDefault();
    release();
    void run();
  }
});

file.addEventListener("change", async () => {
  const chosen = file.files?.[0];
  if (chosen === undefined) return;
  try {
    const text = await chosen.text();
    if (file.files?.[0] !== chosen) return;
    input.value = text;
    from.textContent = `Opened ${chosen.name}.`;
    from.hidden = false;
    release();
    await run();
  } catch { say("Could not read this file. Paste its HTML instead."); }
});

async function copyText(text: string, success: string, failure: string): Promise<void> {
  try { await navigator.clipboard.writeText(text); say(success); }
  catch { say(failure); }
}

share.addEventListener("click", async () => {
  share.disabled = true;
  try {
    const fragment = await encodeShare(input.value);
    if (fragment.length > SHARE_LIMIT) {
      say(`This HTML is too long for a share link (${fragment.length} of ${SHARE_LIMIT} characters).`);
      return;
    }
    history.replaceState(null, "", fragment);
    await copyText(location.href, "Link copied. It holds the HTML.", "Could not copy the link. Copy it from the address bar.");
  } catch (error) {
    say(error instanceof RangeError ? error.message : "Could not create a link. Copy the HTML instead.");
  } finally { share.disabled = false; }
});

copy.addEventListener("click", async () => {
  await copyText(output.value, "HTML copied.", "Could not copy the HTML. Copy the text manually.");
});

input.addEventListener("input", () => {
  from.hidden = true;
  if (reported) {
    reported = false;
    say("Edited since this report. Press Lint to update.");
  }
});

const fragment = location.hash;
const isHandoff = fragment.startsWith("#page=");
if (isHandoff) history.replaceState(null, "", location.pathname + location.search);
const handed = await decodeHandoff(fragment);
const shared = handed === null ? await decodeShare(fragment) : null;
if (handed !== null) {
  input.value = handed.html;
  from.textContent =
    handed.source === "raw"
      ? `Source HTML from ${handed.url}.`
      : `Rendered HTML from ${handed.url}. Source could not be fetched; scripts may have changed the markup.`;
  from.hidden = false;
} else if (shared !== null) input.value = shared;
const unreadable = (isHandoff || fragment.startsWith("#html=")) && handed === null && shared === null;
if (unreadable) {
  // Leaving the example in place would present it as the link's content.
  input.value = "";
  status.textContent = "Could not read this link. Paste HTML or open a file.";
}
else await run();
