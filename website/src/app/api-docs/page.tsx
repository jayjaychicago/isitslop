import { API } from "@/lib/api";

export default function ApiDocs() {
  const base = API;
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="display text-5xl">API</h1>
      <p className="mt-4 text-ink-2 leading-relaxed">
        Everything the website does, curl can do. Base URL <code>{base}</code>. JSON in, JSON out. No API keys for reading. Rate limited per IP. Source on{" "}
        <a className="underline" href="https://github.com/jayjaychicago/isitslop/tree/main/api">GitHub</a>.
      </p>

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
      <Section title="Verify ownership">
        <pre>{`# sites: method is dns | file | email
curl -X POST ${base}/entries/ENTRY_ID/verify/start -H 'content-type: application/json' \\
  -d '{"method":"dns"}'
# follow the instructions in the response, then:
curl -X POST ${base}/entries/ENTRY_ID/verify/check -H 'content-type: application/json' \\
  -d '{"verificationId":"...","code":"123456 (email only)"}'
# -> { verified: true, ownerKey: "isk_..." }   shown once

# repos: open this in a browser and sign in with the GitHub account that has push access
${base}/github/login?entry=ENTRY_ID
# -> redirects back to the entry page with the owner key in the URL fragment`}</pre>
      </Section>
      <Section title="Request a grade (owner only)">
        <pre>{`curl -X POST ${base}/entries/ENTRY_ID/grade \\
  -H 'authorization: Bearer isk_...' -H 'content-type: application/json' \\
  -d '{"acceptTerms":true,"popularity":{"visitors":1200,"activated":90,"returned":40}}'`}</pre>
        <p className="text-sm text-muted">Sending <code>acceptTerms: true</code> is agreement to the terms at /terms. The popularity object is optional; leaving it out is a popularity of zero. Quality needs a connected GitHub account.</p>
      </Section>
      <Section title="Link a repo to a site (owner only)">
        <pre>{`# first connect GitHub for this site entry (browser):
${base}/github/login?entry=ENTRY_ID&ownerKey=isk_...
# then link any repo that account has push access to:
curl -X POST ${base}/entries/ENTRY_ID/repo \\
  -H 'authorization: Bearer isk_...' -H 'content-type: application/json' \\
  -d '{"repoUrl":"https://github.com/owner/repo"}'`}</pre>
        <p className="text-sm text-muted">One thing, one entry. Quality is then read from that repo. Send <code>repoUrl: null</code> to unlink.</p>
      </Section>
      <Section title="Remove an entry (owner or admin)">
        <pre>{`curl -X DELETE ${base}/entries/ENTRY_ID -H 'authorization: Bearer isk_...'`}</pre>
      </Section>
      <Section title="Appeal (owner only)">
        <pre>{`curl -X POST ${base}/entries/ENTRY_ID/appeals \\
  -H 'authorization: Bearer isk_...' -H 'content-type: application/json' \\
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
