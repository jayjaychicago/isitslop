import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Documentation · Is it slop?",
  description: "Setup and usage for isitslop.org: the website, the score API, the MCP connector, data handling, security and support.",
};

const SCORE = "https://api.isitslop.org";
const MCP = "https://mcp.isitslop.org";
const PORTAL = "https://isitslop.portal.apiblaze.com/1.0.0";
const REPO = "https://github.com/jayjaychicago/isitslop";

const TOC: [string, string][] = [
  ["what", "What it is"],
  ["website", "Using the website"],
  ["api", "Score API"],
  ["mcp", "MCP connector"],
  ["data", "Data handling"],
  ["security", "Security"],
  ["reliability", "Reliability and limits"],
  ["support", "Support"],
  ["changes", "Versions and changes"],
  ["directory", "Directory listing kit"],
];

function H2({ id, children }: { id: string; children: React.ReactNode }) {
  return <h2 id={id} className="display text-3xl mt-12 scroll-mt-24">{children}</h2>;
}
function H3({ children }: { children: React.ReactNode }) {
  return <h3 className="font-semibold text-lg mt-6">{children}</h3>;
}
function P({ children }: { children: React.ReactNode }) {
  return <p className="mt-2 text-ink-2 leading-relaxed">{children}</p>;
}
function Table({ head, rows }: { head: string[]; rows: (React.ReactNode)[][] }) {
  return (
    <div className="card mt-3 overflow-x-auto">
      <table className="w-full text-sm">
        <thead><tr className="text-left text-xs uppercase tracking-wider text-muted">{head.map((h) => <th key={h} className="p-3 font-semibold">{h}</th>)}</tr></thead>
        <tbody>{rows.map((r, i) => <tr key={i} className="border-t border-line align-top">{r.map((c, j) => <td key={j} className="p-3">{c}</td>)}</tr>)}</tbody>
      </table>
    </div>
  );
}

export default function DocsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="display text-5xl">Documentation</h1>
      <P>Everything needed to use isitslop.org as a person, as a program, or as a tool inside an AI assistant. This page is the documentation URL for directory listings; it is kept accurate with every release.</P>

      <nav className="card mt-6 p-4 text-sm">
        <div className="text-xs uppercase tracking-wider text-muted font-semibold">On this page</div>
        <ol className="mt-2 grid sm:grid-cols-2 gap-x-6 gap-y-1">
          {TOC.map(([id, label], i) => <li key={id}><a className="hover:underline" href={`#${id}`}>{i + 1}. {label}</a></li>)}
        </ol>
      </nav>

      <H2 id="what">1. What it is</H2>
      <P>
        Is it slop? gives software one public number: how sloppy it is, from 0% to 100%. Two measurements, each out of 100. <strong className="text-ink">Quality</strong> is read from the GitHub repository: commits by humans other than the author, maintenance over the last year, issues filed. <strong className="text-ink">Popularity</strong> is read from the owner&apos;s Google Analytics: reach, and how many visitors come back. Average the two and subtract from 100.
      </P>
      <P>
        Only verified owners can list a thing, every rule is code, and the <Link className="underline" href="/methodology">methodology page</Link> is generated from the code that computes the score. No model is involved: heuristics only. Operated by <a className="underline" href="https://apiblaze.com" target="_blank" rel="noreferrer">API Blaze, LLC</a>; MIT licensed at <a className="underline" href={REPO}>{REPO.replace("https://", "")}</a>.
      </P>
      <Table head={["Surface", "URL", "Needs"]} rows={[
        ["Website", <Link key="w" className="underline" href="/">isitslop.org</Link>, "Nothing to read. GitHub sign-in to claim and grade."],
        ["Score API", <code key="a">{SCORE}/score</code>, "An API key (free, self-serve)."],
        ["MCP connector", <code key="m">{MCP}</code>, "Nothing. Public data, one read-only tool."],
        ["Internal API", <code key="i">internalapi.isitslop.org</code>, "What the website itself calls. Documented on the API page."],
      ]} />

      <H2 id="website">2. Using the website</H2>
      <H3>Look something up</H3>
      <P>Type a domain or a GitHub repository into the search box on the home page. Anything in the index shows its score, verdict and history. Anything not in the index can be previewed: the Quality signals of any public repository are shown without creating an entry.</P>
      <H3>Get your own thing scored</H3>
      <ol className="mt-2 flex flex-col gap-2 text-ink-2 leading-relaxed list-decimal pl-5">
        <li><strong className="text-ink">Claim it</strong> at <Link className="underline" href="/claim">/claim</Link>. Sign in with GitHub. A repository is yours if your account can push to it. A website is yours after a DNS TXT record, a file at a well-known path, or an email to admin@ your domain. Nothing is listed before this passes.</li>
        <li><strong className="text-ink">Connect the sources.</strong> Link the repository that builds the thing (private repositories work and are never named), and connect the Google Analytics 4 property with your own Google sign-in. Both are read-only.</li>
        <li><strong className="text-ink">Request a grade.</strong> Accept the <Link className="underline" href="/terms">terms</Link>, the rules run, the result is published on your entry page and the home page. Popularity refreshes daily, Quality monthly, and the history stays visible.</li>
        <li><strong className="text-ink">Disagree?</strong> Appeal from the entry page. Appeals and their answers are public.</li>
      </ol>

      <H2 id="api">3. Score API</H2>
      <P>One call: the current score of a URL. Served at <code>{SCORE}</code> through an API gateway; interactive docs, a playground and your usage are in the <a className="underline" href={PORTAL} target="_blank" rel="noreferrer">developer portal</a>.</P>
      <H3>Get a key</H3>
      <P>Sign in with GitHub on the <Link className="underline" href="/api-docs">API page</Link> and create a key. Keys are free, tied to your GitHub account, and can be revoked there at any time. Send the key as the <code>X-API-Key</code> header.</P>
      <H3>Request</H3>
      <pre>{`curl -H "X-API-Key: $ISITSLOP_API_KEY" "${SCORE}/score?url=apiblaze.com"`}</pre>
      <P>The only parameter is <code>url</code>: a website such as <code>example.com</code> or a repository such as <code>github.com/owner/repo</code>. Schemes and <code>www.</code> are ignored.</P>
      <H3>Response</H3>
      <pre>{`{
  "found": true,
  "url": "https://apiblaze.com",
  "sloppy": 60,
  "quality": 79,
  "popularity": 0,
  "verdict": "fringe_craft",
  "label": "Fringe Craft",
  "gradedAt": "2026-11-03T14:09:50.189Z",
  "page": "https://isitslop.org/s/38f774a9-0e5f-4fe4-ba46-5ec0716a3233"
}`}</pre>
      <Table head={["Field", "Meaning"]} rows={[
        [<code key="1">sloppy</code>, "0 to 100. Null when either half is unknown."],
        [<code key="2">quality</code>, "0 to 100, from the repository. Null when no repository is linked."],
        [<code key="3">popularity</code>, "0 to 100, from analytics. Null when no analytics is connected."],
        [<code key="4">verdict</code>, <>Two words joined by an underscore: <code>fringe</code> or <code>popular</code> or <code>unknown</code>, then <code>slop</code> or <code>craft</code> or <code>unknown</code>.</>],
        [<code key="5">label</code>, "The verdict in words."],
        [<code key="6">url</code>, "Null for private repositories; their URL is never published."],
        [<code key="7">page</code>, "The public entry page, with the full breakdown and history."],
      ]} />
      <H3>Errors</H3>
      <Table head={["Status", "When", "Body"]} rows={[
        ["200", "The URL is in the index.", "The object above."],
        ["404", "Not in the index, or a private repository.", <code key="a">{`{"found": false, "label": "Not in the index"}`}</code>],
        ["400", "Not a usable URL.", <code key="b">{`{"error": "..."}`}</code>],
        ["401", "Missing or revoked key.", "Create a key on the API page."],
        ["429", "Over the key's quota.", "Quotas are shown in the developer portal."],
      ]} />
      <P>Nothing about the caller is stored beyond the gateway&apos;s usage counters. The OpenAPI 3.1 description is at <a className="underline" href="/openapi.yaml">/openapi.yaml</a>.</P>

      <H2 id="mcp">4. MCP connector</H2>
      <P>The same lookup as a tool for AI assistants, over the Model Context Protocol. It is a remote server at <code>{MCP}</code> using the Streamable HTTP transport, reachable over HTTPS only, and needs no sign-in: it reads public scores and nothing else. The server is run by the same operator as the website and calls the operator&apos;s own API.</P>
      <H3>Add it to Claude</H3>
      <ol className="mt-2 flex flex-col gap-1 text-ink-2 leading-relaxed list-decimal pl-5">
        <li>Open Settings, then Connectors, then <em>Add custom connector</em>.</li>
        <li>Name it <em>Is it slop?</em> and paste <code>{MCP}</code> as the URL. No OAuth client is needed.</li>
        <li>Enable it in a conversation and ask, for example: <em>&quot;Is apiblaze.com slop?&quot;</em></li>
      </ol>
      <H3>Add it to Claude Code or another client</H3>
      <pre>{`claude mcp add --transport http isitslop ${MCP}`}</pre>
      <P>Any client that speaks Streamable HTTP can use the URL directly. The MCP Inspector works with the same URL for testing.</P>
      <H3>Tools</H3>
      <Table head={["Tool", "Title", "Annotations", "Input", "Output"]} rows={[
        [<code key="t">getScore</code>, "Get the score of a URL", <><code>readOnlyHint: true</code>, <code>destructiveHint: false</code>, <code>idempotentHint: true</code></>, <><code>url</code> (string, required): a website or a GitHub repository.</>, "The score object from section 3, as structured content and as text."],
      ]} />
      <P>There are no write tools. The tool never modifies anything on isitslop.org or anywhere else, never reads the conversation, and takes only the one URL it is given. Example prompts: <em>&quot;How sloppy is github.com/honojs/hono?&quot;</em>, <em>&quot;Compare the isitslop scores of these three sites.&quot;</em></P>
      <H3>Errors from the tool</H3>
      <P>A URL that is not in the index returns <code>found: false</code> with the label &quot;Not in the index&quot;, not an error, so the assistant can say so plainly. A malformed URL returns an error message naming the problem. The server answers within a second; scores are precomputed, so a call does no grading.</P>

      <H2 id="data">5. Data handling</H2>
      <P>The full policy is at <Link className="underline" href="/privacy">/privacy</Link>. In short:</P>
      <ul className="mt-2 flex flex-col gap-2 text-ink-2 leading-relaxed list-disc pl-5">
        <li><strong className="text-ink">The API and the connector read public data only.</strong> A score lookup stores nothing about the caller or the conversation. The gateway keeps per-key usage counts for quotas.</li>
        <li><strong className="text-ink">Owners&apos; Google data is turned into two subscores and discarded.</strong> No visitor counts, no property names, nothing from Google is kept in a grade. The connection itself is stored encrypted and erased on disconnect or delete.</li>
        <li><strong className="text-ink">Repositories are read with the owner&apos;s own GitHub token</strong>, read-only. Private repositories are scored but never named.</li>
        <li><strong className="text-ink">Processors:</strong> Cloudflare (API and edge), Vercel (website), Neon (database), Amazon SES (email), Google Analytics (the site&apos;s own visit counts), apiblaze (API gateway and keys).</li>
        <li><strong className="text-ink">Retention:</strong> an entry and its grades stay until the owner or the operator deletes them. Sessions last 30 days. Feedback and contact messages are emailed, not stored.</li>
        <li><strong className="text-ink">Your rights:</strong> delete your entry yourself from its page, or write to us through the <Link className="underline" href="/support">support form</Link>.</li>
      </ul>

      <H2 id="security">6. Security</H2>
      <ul className="mt-2 flex flex-col gap-2 text-ink-2 leading-relaxed list-disc pl-5">
        <li>Every endpoint is HTTPS only. The MCP server and the score API live on the operator&apos;s own domains.</li>
        <li>Public reads need no credentials and expose nothing that is not already on the website.</li>
        <li>Owner actions require a GitHub sign-in session or the owner key returned by verification. Stored GitHub and Google tokens are encrypted at rest with a key held only by the API.</li>
        <li>API keys are per user, revocable instantly from the API page, and never shown again after creation.</li>
        <li>The connector exposes one read-only tool with no free-form request construction, so there is nothing for a prompt to redirect.</li>
        <li>Report a vulnerability through the <Link className="underline" href="/support">support form</Link>. We acknowledge within two working days and fix before disclosure. The code is public, so you can also open a pull request.</li>
      </ul>

      <H2 id="reliability">7. Reliability and limits</H2>
      <ul className="mt-2 flex flex-col gap-2 text-ink-2 leading-relaxed list-disc pl-5">
        <li>Public reads are served from Cloudflare&apos;s edge with a cache of up to a minute, so a lookup does not touch the database on every call.</li>
        <li>Score API keys carry a quota shown in the developer portal. The website&apos;s own endpoints are rate limited per IP.</li>
        <li>Grades are precomputed. Popularity refreshes daily at 04:10 UTC, Quality on the first of each month; owners can request a fresh grade up to five times a day.</li>
        <li>If a refresh fails, the previous grade stays, the entry shows why, and the operator is alerted.</li>
      </ul>

      <H2 id="support">8. Support</H2>
      <P>
        The <Link className="underline" href="/support">support form</Link>, or an issue at <a className="underline" href={`${REPO}/issues`}>GitHub</a>. Bugs and rule changes are welcome as pull requests. A wrong score on your own entry is best raised as a public appeal from its page.
      </P>

      <H2 id="changes">9. Versions and changes</H2>
      <P>The score API is version 1.0.0 and its shape is stable; new fields may be added, existing ones are not removed or renamed. The scoring rules carry their own version, shown on the methodology page and in every grade, so a change in the rules is visible in the history. Changes are announced on the <Link className="underline" href="/blog">blog</Link>, and every change is a commit in the public repository.</P>

      <H2 id="directory">10. Directory listing kit</H2>
      <P>What a connector directory such as Anthropic&apos;s asks for, and where each item is. Anthropic&apos;s own requirements are at <a className="underline" href="https://claude.com/docs/connectors/building/submission" target="_blank" rel="noreferrer">claude.com/docs/connectors/building/submission</a>.</P>
      <Table head={["Requirement", "Answer"]} rows={[
        ["Server URL (remote, HTTPS)", <code key="1">{MCP}</code>],
        ["Authentication", "None. The connector reads public data only. No OAuth client, no test account needed; reviewers can connect and call the tool directly."],
        ["Tool annotations", "Every tool has a title and readOnlyHint. See section 4."],
        ["Read or write", "Reads only."],
        ["Documentation URL", <code key="2">https://isitslop.org/docs</code>],
        ["Privacy policy URL", <code key="3">https://isitslop.org/privacy</code>],
        ["Support contact", <code key="4">https://isitslop.org/support</code>],
        ["Company", "API Blaze, LLC, https://apiblaze.com"],
        ["API ownership", "First-party. The server calls the operator's own API on the operator's own domain."],
        ["Icon", <a key="5" className="underline" href="/brand/mark.png">/brand/mark.png</a>],
        ["Tested", "Each tool has been called through the MCP Inspector and as a custom connector in Claude before each release."],
        ["Financial transactions, AI media generation, health data, sponsored content", "None."],
      ]} />
      <H3>Listing text</H3>
      <Table head={["Field", "Text"]} rows={[
        ["Name", "Is it slop?"],
        ["One-liner", "Look up how sloppy a website or GitHub repository is, scored by public rules from real usage and real maintenance."],
        ["Description", "Is it slop? gives software one public number, 0% to 100% sloppy, from two things that are hard to fake: Popularity, read from the owner's Google Analytics (reach and returning visitors), and Quality, read from the GitHub repository (commits by other humans, maintenance over a year, issues filed). No stars, no README, no badges, no model: the rules are code, MIT licensed, and the methodology page is generated from the code that computes the score. Only verified owners can list a thing, and appeals are public. This connector adds one read-only tool, getScore, which returns the current score, verdict and entry page for any URL in the index, or says plainly that it is not listed. It needs no sign-in and stores nothing about the conversation."],
        ["Categories", "Developer tools; Research; Productivity"],
        ["Use cases", "Check a dependency or a vendor before adopting it. Compare candidates by real usage and maintenance. Sanity-check a project's own standing while writing about it."],
        ["Before connecting", "Nothing. Owners who want their own project scored claim it on isitslop.org first."],
      ]} />

      <div className="mt-10 flex flex-wrap gap-2">
        <Link href="/api-docs" className="btn">API page</Link>
        <Link href="/methodology" className="btn btn-ghost">Methodology</Link>
        <Link href="/privacy" className="btn btn-ghost">Privacy</Link>
        <Link href="/support" className="btn btn-ghost">Support</Link>
      </div>
    </div>
  );
}
