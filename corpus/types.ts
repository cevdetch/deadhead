/** How a network step failed, in the classes classify.ts needs. */
export type ErrorKind = "dns" | "connect" | "tls" | "timeout" | "other";

/** One domain's result. `duplicate` is decided across domains, in aggregate.ts. */
export type Outcome = "skipped" | "no-site" | "failed" | "blocked" | "duplicate" | "linted";

/** One domain as fetched and rendered, stored gzipped in corpus/data/snapshot/. */
export type SnapshotRecord = {
  rank: number;
  domain: string;
  listId: string;
  fetchedAt: string;
  robots: "allowed" | "disallowed";
  tried: string[];
  finalUrl: string | null;
  status: number | null;
  contentType: string | null;
  bytes: number;
  truncated: boolean;
  error: ErrorKind | null;
  errorMessage: string | null;
  /** Base64 of the response body bytes, never re-encoded. */
  raw: string | null;
  rendered: string | null;
  renderError: string | null;
  ms: { robots: number; raw: number; render: number };
};

/** Rule id to finding count. */
export type Counts = Record<string, number>;

/** A page's size raw, gzip and brotli, and what applying every autofix saves in each. */
export type PageBytes = { page: number; gzip: number; brotli: number; saved: number; savedGzip: number; savedBrotli: number };

/** One domain after linting, one line of corpus/data/lint-<commit>.jsonl. Local only: it names the domain. */
export type LintLine = {
  rank: number;
  domain: string;
  fetchedAt: string;
  finalOrigin: string | null;
  /** Whether the response's Content-Type named a charset, which takes precedence over any meta declaration. */
  charsetHeader: boolean;
  /** Platforms detected from the page's markup (platforms.ts). */
  platforms: string[];
  raw: {
    outcome: Exclude<Outcome, "duplicate">;
    counts: Counts | null;
    /** Null unless linted. */
    bytes: PageBytes | null;
    /** Raw bytes each rule's fixes remove; null unless linted. */
    fixBytes: Counts | null;
    /** Raw bytes per removed item (metrics.ts itemKey); null unless linted. */
    items: Counts | null;
  };
  rendered: { outcome: Exclude<Outcome, "duplicate" | "skipped" | "no-site"> | "not-rendered"; counts: Counts | null };
};
