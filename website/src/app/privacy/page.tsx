export const metadata = { title: "Privacy Policy · Is it slop?" };

export default function Privacy() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 prose-legal">
      <h1 className="display text-5xl">Privacy Policy</h1>
      <p className="text-muted">Version 2026-10-22. Effective October 22, 2026.</p>
      <p>
        This policy describes what isitslop.org and api.isitslop.org (the <strong>Service</strong>), operated by <strong>API Blaze, LLC</strong>,
        collect and why. The short version: as little as possible, most of it is public by design, and what you connect is read-only and yours to
        disconnect.
      </p>

      <h2>1. What we collect</h2>
      <ul>
        <li><strong>URLs you add.</strong> The URL, the derived domain, a title, timestamps. These are public: that is the point of an index.</li>
        <li><strong>Verification data.</strong> A random token, the method chosen, and for email verification the administrative address the code was sent to (for example admin@yourdomain). We store a hash of the code, never the code. Verification records expire after 24 hours.</li>
        <li><strong>Owner keys.</strong> We store only a SHA-256 hash of your owner key. We cannot recover it. The website stores the key in your browser&apos;s local storage so you do not have to paste it; clearing site data removes it.</li>
        <li><strong>GitHub connection.</strong> Your GitHub login name, and the access and refresh tokens issued by the Is It Slop GitHub App, encrypted at rest with a key held only by the API. Used solely to read your repository when you request a grade: metadata, commit history, contributors and issue counts. We never write to GitHub. Deleted when you disconnect or remove the entry.</li>
        <li><strong>Google Analytics connection.</strong> See section 3.</li>
        <li><strong>Grades and appeals.</strong> The scores, the signal breakdown with its evidence (counts and dates), the aggregate analytics numbers, and any appeal text. All of this is public.</li>
        <li><strong>IP addresses.</strong> Used transiently for rate limiting, keyed by a per-feature bucket that is overwritten as windows expire. Not joined to entries, grades or appeals.</li>
        <li><strong>Terms acceptance.</strong> The terms version and timestamp of your acceptance, attached to your entry.</li>
        <li><strong>Session cookie.</strong> If you sign in with GitHub, a random session ID in a cookie on isitslop.org, valid 30 days, deleted on sign-out.</li>
        <li><strong>Website analytics.</strong> Google Analytics on isitslop.org records page views and the usual device and approximate-location data Google collects, under Google&apos;s policy. We see only aggregates.</li>
      </ul>

      <h2>2. What we do not collect</h2>
      <p>No passwords, no advertising, no sale of data, no sharing of data with third parties beyond the processors in section 5. The website uses Google Analytics to count visits (we eat our own cooking: the site is graded on it). Google Analytics sets its own cookies under Google&apos;s policy; the only cookie we set ourselves is the sign-in session.</p>

      <h2>3. Google user data</h2>
      <p>
        If you connect Google Analytics, you sign in with Google and grant the Service the <code>analytics.readonly</code> scope. Here is exactly what
        happens with that access:
      </p>
      <ul>
        <li><strong>What we access.</strong> The list of Google Analytics accounts and properties your Google account can see (names and IDs), so you can choose one; and for the chosen property, a single aggregate report: active users for the last 30 days, split new versus returning. Nothing about individual visitors, nothing from other Google services.</li>
        <li><strong>How we use it.</strong> Only to compute and display the Popularity score for the entry you chose. The two aggregate numbers are shown publicly on the entry page next to the score.</li>
        <li><strong>What we store.</strong> The chosen property ID and name, and the OAuth refresh token Google issues, encrypted at rest. Access tokens are short-lived and not stored. We do not store the report beyond the two numbers in the public grade.</li>
        <li><strong>Sharing.</strong> We do not share, sell, or transfer Google user data to anyone. It is not used for advertising, not used to train any model, and not read by humans except to debug a problem you report.</li>
        <li><strong>Deleting it.</strong> Click Disconnect on the entry page, delete the entry, or revoke the Service at myaccount.google.com/permissions. Any of these removes the stored token immediately.</li>
      </ul>
      <p>
        The Service&apos;s use of information received from Google APIs adheres to the{" "}
        <a className="underline" href="https://developers.google.com/terms/api-services-user-data-policy">Google API Services User Data Policy</a>, including the
        Limited Use requirements.
      </p>

      <h2>4. Reading your repository</h2>
      <p>We read your repository through the GitHub API with your connected account, identified by the user agent <code>isitslop-bot</code>, only when you request a grade. We keep the counts and dates used for the score, shown in the public breakdown. We do not read file contents.</p>

      <h2>5. Processors</h2>
      <ul>
        <li><strong>Vercel</strong> hosts the website.</li>
        <li><strong>Cloudflare</strong> runs the API and resolves DNS lookups for verification.</li>
        <li><strong>Neon</strong> hosts the database, including the encrypted tokens.</li>
        <li><strong>Amazon Web Services (SES)</strong> sends verification emails, if you choose email verification.</li>
        <li><strong>GitHub</strong> and <strong>Google</strong> provide the repository and analytics data you authorise, under their own policies.</li>
        <li><strong>Google Analytics</strong> measures traffic on this website.</li>
      </ul>
      <p>Each may keep its own operational logs (including IP addresses) under its own policy.</p>

      <h2>6. Retention</h2>
      <p>Entries, grades and appeals are kept indefinitely because they are the index, until the owner removes them. Verification records expire after 24 hours. Rate-limit buckets are overwritten continuously. Connected credentials live exactly as long as the connection.</p>

      <h2>7. Your rights</h2>
      <p>If you are in a jurisdiction that grants you rights over personal data (such as the EU, UK or California), you may exercise them by removing your entry, by filing a public appeal from your entry page, or by opening an issue on GitHub. Because we hold almost no personal data, the usual answer is &quot;it is already public, and you can delete it yourself&quot;.</p>

      <h2>8. Children</h2>
      <p>The Service is not directed at children under 13 and we do not knowingly collect data from them.</p>

      <h2>9. Changes</h2>
      <p>We may update this policy. The version in force is shown at the top of this page.</p>

      <h2>10. Contact</h2>
      <p>API Blaze, LLC. github.com/jayjaychicago/isitslop.</p>
    </div>
  );
}
