export const metadata = { title: "Privacy Policy · Is it slop?" };

export default function Privacy() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 prose-legal">
      <h1 className="display text-5xl">Privacy Policy</h1>
      <p className="text-muted">Version 2026-10-21. Effective October 21, 2026.</p>
      <p>
        This policy describes what isitslop.org and api.isitslop.org (the <strong>Service</strong>), operated by <strong>API Blaze, LLC</strong>,
        collect and why. The short version: almost nothing, and most of it is public by design.
      </p>

      <h2>1. What we collect</h2>
      <ul>
        <li><strong>URLs you add.</strong> The URL, the derived domain, and the page title we fetch. These are public: that is the point of an index.</li>
        <li><strong>Verification data.</strong> A random token, the method chosen, and for email verification the administrative address the code was sent to (for example admin@yourdomain). We store a hash of the code, never the code. Verification records expire after 24 hours.</li>
        <li><strong>Owner keys.</strong> We store only a SHA-256 hash of your owner key. We cannot recover it. The website also stores the key in your browser's local storage so you do not have to paste it; clearing site data removes it.</li>
        <li><strong>GitHub connection.</strong> If you connect GitHub, we store your GitHub login and the access and refresh tokens the isitslop GitHub App issues, encrypted at rest. They are used only to read your repositories when you request a grade, and are deleted when you disconnect or remove the entry. We never write to your repositories.</li>
        <li><strong>Analytics connection.</strong> If you connect Google Analytics, PostHog or Plausible, we store the identifiers and any read-only API key you provide, encrypted at rest, and use them only to read two aggregate numbers (visitors and returning visitors for the last 30 days) when you request a grade. Deleted on disconnect or removal.</li>
        <li><strong>Grades and appeals.</strong> The scores, the signal breakdown with its evidence (counts, dates, file presence), the aggregate analytics numbers, and any appeal text. All of this is public.</li>
        <li><strong>IP addresses.</strong> Used transiently for rate limiting, keyed by a per-feature bucket in a table that is overwritten as windows expire. Not joined to entries, grades, or appeals.</li>
        <li><strong>Terms acceptance.</strong> The terms version and timestamp of your acceptance, attached to your entry.</li>
      </ul>

      <h2>2. What we do not collect</h2>
      <p>No accounts, no passwords, no cookies set by us, no analytics scripts on the website, no advertising, no sale of data, no sharing of data with third parties beyond the processors below.</p>

      <h2>3. Processors</h2>
      <ul>
        <li><strong>Vercel</strong> hosts the website.</li>
        <li><strong>Cloudflare</strong> runs the API and resolves DNS lookups for verification.</li>
        <li><strong>GitHub</strong> provides repository data through the isitslop GitHub App, under your authorization.</li>
        <li><strong>Google Analytics, PostHog or Plausible</strong>, if you connect one, provide aggregate visitor counts under your authorization.</li>
        <li><strong>Neon</strong> hosts the database.</li>
        <li><strong>Amazon Web Services (SES)</strong> sends verification emails, if you choose email verification.</li>
      </ul>
      <p>Each may keep its own operational logs (including IP addresses) under its own policy.</p>

      <h2>4. Reading your repository</h2>
      <p>At grading time we read your repository through the GitHub API with your connected account, identified by the user agent <code>isitslop-bot</code>. We keep only the counts and facts used for the score, shown in the public breakdown. We do not read file contents beyond the README size and the names of top-level files.</p>

      <h2>5. Retention</h2>
      <p>Entries, grades and appeals are kept indefinitely because they are the index. Verification records expire after 24 hours. Rate limit buckets are overwritten continuously. A verified owner can request removal of their entry; see the Terms, section 9.</p>

      <h2>6. Your rights</h2>
      <p>If you are in a jurisdiction that grants you rights over personal data (such as the EU, UK, or California), you may exercise them by filing a public appeal from your entry page or opening an issue on GitHub. Because we hold almost no personal data, the usual answer is "it is already public, and we can delete your entry".</p>

      <h2>7. Children</h2>
      <p>The Service is not directed at children under 13 and we do not knowingly collect data from them.</p>

      <h2>8. Changes</h2>
      <p>We may update this policy. The version in force is shown at the top of this page.</p>

      <h2>9. Contact</h2>
      <p>API Blaze, LLC. github.com/jayjaychicago/isitslop.</p>
    </div>
  );
}
