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

      <Section title="Try the rules on any URL (nothing stored)">
        <pre>{`curl "${base}/preview?url=example.com"`}</pre>
      </Section>
      <Section title="Search the index">
        <pre>{`curl "${base}/entries?q=example"`}</pre>
      </Section>
      <Section title="Add a URL">
        <pre>{`curl -X POST ${base}/entries -H 'content-type: application/json' \\
  -d '{"url":"https://example.com"}'`}</pre>
      </Section>
      <Section title="Verify ownership">
        <pre>{`# start: method is dns | file | email for sites, repo_file for GitHub repos
curl -X POST ${base}/entries/ENTRY_ID/verify/start -H 'content-type: application/json' \\
  -d '{"method":"dns"}'
# follow the instructions in the response, then:
curl -X POST ${base}/entries/ENTRY_ID/verify/check -H 'content-type: application/json' \\
  -d '{"verificationId":"...","code":"123456 (email only)"}'
# -> { verified: true, ownerKey: "isk_..." }   shown once`}</pre>
      </Section>
      <Section title="Request a grade (owner only)">
        <pre>{`curl -X POST ${base}/entries/ENTRY_ID/grade \\
  -H 'authorization: Bearer isk_...' -H 'content-type: application/json' \\
  -d '{"acceptTerms":true,"people":{"visitors":1200,"activated":90,"returned":40}}'`}</pre>
        <p className="text-sm text-muted">Sending <code>acceptTerms: true</code> is agreement to the terms at /terms. The people object (usage numbers) is optional.</p>
      </Section>
      <Section title="Link a repo to a site (owner only)">
        <pre>{`# commit .isitslop to the repo root containing: isitslop-site=ENTRY_ID
curl -X POST ${base}/entries/ENTRY_ID/repo \\
  -H 'authorization: Bearer isk_...' -H 'content-type: application/json' \\
  -d '{"repoUrl":"https://github.com/owner/repo"}'`}</pre>
        <p className="text-sm text-muted">One thing, one entry. The README is then graded together with the landing page. Send <code>repoUrl: null</code> to unlink.</p>
      </Section>
      <Section title="Remove an entry (owner or admin)">
        <pre>{`curl -X DELETE ${base}/entries/ENTRY_ID -H 'authorization: Bearer isk_...'`}</pre>
      </Section>
      <Section title="Appeal (owner only)">
        <pre>{`curl -X POST ${base}/entries/ENTRY_ID/appeals \\
  -H 'authorization: Bearer isk_...' -H 'content-type: application/json' \\
  -d '{"text":"The who rule missed: the page says built for clinics in the hero."}'`}</pre>
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
