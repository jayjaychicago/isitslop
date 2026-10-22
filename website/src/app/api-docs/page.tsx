
export default function ApiDocs() {
  const base = "https://api.isitslop.org/v1";
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="display text-5xl">API</h1>
      <p className="mt-4 text-ink-2 leading-relaxed">
        Everything the website does, curl can do. Base URL <code>{base}</code>. JSON in, JSON out. Reading needs nothing. Owner actions need the session cookie from GitHub sign-in, or the owner key a site verification returns. Rate limited per IP. The OpenAPI spec is at <a className="underline" href="/internalopenapi.yaml">/internalopenapi.yaml</a>. Source on{" "}
        <a className="underline" href="https://github.com/jayjaychicago/isitslop/tree/main/api">GitHub</a>.
      </p>

      <Section title="Look up a score">
        <pre>{`curl -H "X-API-Key: $ISITSLOP_API_KEY" "${base}/score?url=apiblaze.com"
# {"found":true,"quality":79,"popularity":32,"verdict":"fringe_craft","label":"Fringe Craft","gradedAt":"...","page":"..."}
# 404 {"found":false} when the URL is not in the index`}</pre>
        <p className="text-sm text-muted">Send your API key as <code>X-API-Key</code>. Keys are issued per consumer; the spec for this one call is at <a className="underline" href="/openapi.yaml">/openapi.yaml</a>. Everything below needs no key to read.</p>
      </Section>
      <Section title="Try the quality rules on any public repo (nothing stored)">
        <pre>{`curl "${base}/preview?url=github.com/honojs/hono"`}</pre>
      </Section>
      <Section title="Search the index">
        <pre>{`curl "${base}/entries?q=example"`}</pre>
      </Section>
      <Section title="Add a URL">
        <pre>{`curl -X POST ${base}/entries -H 'content-type: application/json' \\
  -d '{"url":"https://example.com"}'`}</pre>
      </Section>
      <Section title="Sign in and own things">
        <pre>{`# browser: sign in with GitHub (sets a session cookie on .isitslop.org)
${base}/auth/github?return=/me
curl -b cookies ${base}/me

# sites: prove the domain with dns | file | email
curl -b cookies -X POST ${base}/entries/ENTRY_ID/verify/start -H 'content-type: application/json' -d '{"method":"dns"}'
curl -b cookies -X POST ${base}/entries/ENTRY_ID/verify/check -H 'content-type: application/json' -d '{"verificationId":"..."}'
# -> { verified: true, ownerKey: "isk_..." }   the ownerKey is only for curl use; the website uses your sign-in

# repositories: your GitHub account must have push access
curl -b cookies -X POST ${base}/entries/ENTRY_ID/claim`}</pre>
      </Section>
      <Section title="Request a grade (owner only)">
        <pre>{`curl -b cookies -X POST ${base}/entries/ENTRY_ID/grade \\
  -H 'content-type: application/json' -d '{"acceptTerms":true}'
# or, without a browser session: -H 'authorization: Bearer isk_...'`}</pre>
        <p className="text-sm text-muted">Sending <code>acceptTerms: true</code> is agreement to the terms at /terms. Quality is read from the connected GitHub account; Popularity from the connected Google Analytics property. Nothing connected is unknown.</p>
      </Section>
      <Section title="Connect Google Analytics (owner only)">
        <pre>{`# browser, signed in: Google sign-in with the read-only Analytics scope
${base}/google/login?entry=ENTRY_ID
# if the account has several GA4 properties, pick one:
curl -b cookies -X POST ${base}/entries/ENTRY_ID/analytics -H 'content-type: application/json' -d '{"propertyId":"123456789"}'`}</pre>
      </Section>
      <Section title="Link a repo to a site (owner only)">
        <pre>{`curl -b cookies -X POST ${base}/entries/ENTRY_ID/repo -H 'content-type: application/json' \
  -d '{"repoUrl":"https://github.com/owner/repo"}'`}</pre>
        <p className="text-sm text-muted">One thing, one entry. Quality is read from that repo. The repo can be private; its URL is never published. Send <code>repoUrl: null</code> to unlink.</p>
      </Section>
      <Section title="Remove an entry (owner or admin)">
        <pre>{`curl -b cookies -X DELETE ${base}/entries/ENTRY_ID`}</pre>
      </Section>
      <Section title="Appeal (owner only)">
        <pre>{`curl -b cookies -X POST ${base}/entries/ENTRY_ID/appeals -H 'content-type: application/json' \\
  -d '{"text":"The contributors rule counted our release bot as a human."}'`}</pre>
      </Section>
      <Section title="Methodology">
        <pre>{`curl ${base}/methodology`}</pre>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="display text-2xl mb-2">{title}</h2>
      <div className="flex flex-col gap-2">{children}</div>
    </section>
  );
}
