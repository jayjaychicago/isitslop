import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Env } from './lib/env.ts';
import { entries } from './routes/entries.ts';
import { verify } from './routes/verify.ts';
import { grade } from './routes/grade.ts';
import { appeals } from './routes/appeals.ts';
import { methodology } from './routes/methodology.ts';
import { github } from './routes/github.ts';
import { analytics } from './routes/analytics.ts';
import { google } from './routes/google.ts';

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
      'GET  /v1/preview?url=github.com/o/r   dry-run quality score, nothing stored',
      'POST /v1/entries/:id/verify/start {method: dns|file|email}   (sites)',
      'GET  /v1/github/login?entry=&ownerKey=   connect the owner GitHub account (repo entries: this is the ownership proof)',
      'POST /v1/entries/:id/verify/check {verificationId, code?}',
      'GET  /v1/analytics/providers',
      'GET  /v1/google/login?entry=&ownerKey=   connect Google Analytics with Google sign-in (read-only)',
      'POST /v1/entries/:id/analytics (Bearer owner key) {provider, apiKey, projectId|siteId, host?}   connect analytics; read-only, stored encrypted',
      'DELETE /v1/entries/:id/analytics (Bearer owner key)',
      'POST /v1/entries/:id/grade  (Bearer owner key) {acceptTerms: true}',
      'POST /v1/entries/:id/repo   (Bearer owner key) {repoUrl}   link a repo to a site entry; the connected GitHub account must have push access',
      'POST /v1/entries/:id/github/disconnect (Bearer owner key)',
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
app.route('/v1', github);
app.route('/v1', analytics);
app.route('/v1', google);

app.notFound((c) => c.json({ error: 'not found' }, 404));
app.onError((err, c) => {
  console.error(err);
  return c.json({ error: 'internal error' }, 500);
});

export default app;
