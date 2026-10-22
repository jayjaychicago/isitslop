export type Env = {
  DATABASE_URL: string;
  ADMIN_TOKEN: string;
  /** Single fixed key for the external score API (GET /v1/score). Proxied by the operator; self-service keys later. */
  API_KEY?: string;
  PUBLIC_SITE_URL: string;
  AWS_ACCESS_KEY_ID?: string;
  AWS_SECRET_ACCESS_KEY?: string;
  AWS_REGION?: string;
  SES_FROM?: string;
  GITHUB_TOKEN?: string;
  GITHUB_APP_CLIENT_ID?: string;
  GITHUB_APP_CLIENT_SECRET?: string;
  GITHUB_APP_SLUG?: string;
  TOKEN_KEY?: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
};

export const TERMS_VERSION = '2026-10-22';
