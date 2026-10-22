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
import { auth } from './routes/auth.ts';

const app = new Hono<{ Bindings: Env }>();

app.use('*', cors({
  origin: (origin, c) => (origin === c.env.PUBLIC_SITE_URL || /^http:\/\/localhost:\d+$/.test(origin) ? origin : c.env.PUBLIC_SITE_URL),
  credentials: true,
  allowHeaders: ['Content-Type', 'Authorization', 'x-api-key'],
  allowMethods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  maxAge: 86400,
}));

app.get('/', (c) =>
  c.json({
    name: 'isitslop api',
    docs: 'https://github.com/jayjaychicago/isitslop',
    endpoints: [
      'GET  /v1/health',
      'GET  /v1/methodology',
      'GET  /v1/score?url=example.com   (Authorization: Bearer API key) the current score of a URL, nothing else',
      'GET  /v1/entries?q=&limit=&offset=',
      'POST /v1/entries {url}',
      'GET  /v1/entries/:id',
      'GET  /v1/preview?url=github.com/o/r   dry-run quality score, nothing stored',
      'POST /v1/entries/:id/verify/start {method: dns|file|email}   (sites)',
      'GET  /v1/auth/github?return=/   sign in with GitHub (sets a session cookie)',
      'GET  /v1/me                     who am I and what do I own',
      'POST /v1/auth/logout',
      'POST /v1/entries/:id/claim      (signed in) claim a repository entry; your GitHub account must have push access',
      'POST /v1/entries/:id/verify/check {verificationId, code?}',
      'GET  /v1/google/login?entry=     (signed in as owner) connect Google Analytics, read-only',
      'POST /v1/entries/:id/analytics (Bearer owner key) {propertyId}   pick the GA4 property after sign-in',
      'DELETE /v1/entries/:id/analytics (Bearer owner key)',
      'POST /v1/entries/:id/grade  (signed in as owner, or Bearer owner key) {acceptTerms: true}',
      'POST /v1/entries/:id/repo   (signed in as owner) {repoUrl}   link a repo to a site entry; your GitHub account must have push access',
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
app.route('/v1', auth);

app.notFound((c) => c.json({ error: 'not found' }, 404));
app.onError((err, c) => {
  console.error(err);
  return c.json({ error: 'internal error' }, 500);
});

export default app;
