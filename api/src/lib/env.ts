export type Env = {
  DATABASE_URL: string;
  ADMIN_TOKEN: string;
  PUBLIC_SITE_URL: string;
  AWS_ACCESS_KEY_ID?: string;
  AWS_SECRET_ACCESS_KEY?: string;
  AWS_REGION?: string;
  SES_FROM?: string;
};

export const TERMS_VERSION = '2026-10-21';
