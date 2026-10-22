import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Env } from './lib/env.ts';
import { entries } from './routes/entries.ts';
import { verify } from './routes/verify.ts';
import { grade } from './routes/grade.ts';
import { appeals } from './routes/appeals.ts';
import { methodology } from './routes/methodology.ts';

const app = new Hono<{ Bindings: Env }>();

app.use('*', cors({ origin: '*', allowHeaders: ['Content-Type', 'Authorization'], maxAge: 86400 }));

app.get('/', (c) =>
  c.json({
    name: 'isitslop api',
    docs: 'https://github.com/jayjaychicago/isitslop',
    endpoints: [
      'GET  /v1/health',
      'GET  /v1/methodology',
      'GET  /v1/entries?q=&limit=&offset=',
      'POST /v1/entries {url}',
      'GET  /v1/entries/:id',
      'GET  /v1/preview?url=            dry-run definition score, nothing stored',
      'POST /v1/entries/:id/verify/start {method: dns|file|email|repo_file, email?}',
      'POST /v1/entries/:id/verify/check {verificationId, code?}',
      'POST /v1/entries/:id/grade  (Bearer owner key) {acceptTerms: true, people?: {visitors, activated, returned}}',
      'POST /v1/entries/:id/repo   (Bearer owner key) {repoUrl}   link a public repo to a site entry; repo must contain .isitslop with isitslop-site=<id>',
      'DELETE /v1/entries/:id       (Bearer owner key or admin)  remove the entry',
      'POST /v1/entries/:id/appeals (Bearer owner key) {text}',
      'POST /v1/appeals/:id/resolve (Bearer admin) {status, response}',
    ],
  }),
);
app.get('/v1/health', (c) => c.json({ ok: true }));

app.route('/v1', methodology);
app.route('/v1', entries);
app.route('/v1', verify);
app.route('/v1', grade);
app.route('/v1', appeals);

app.notFound((c) => c.json({ error: 'not found' }, 404));
app.onError((err, c) => {
  console.error(err);
  return c.json({ error: 'internal error' }, 500);
});

export default app;
