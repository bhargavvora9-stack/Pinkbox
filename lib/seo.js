const DEFAULT_SITE_URL = 'https://pinkbox-gv7q.vercel.app';

export function getSiteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL || DEFAULT_SITE_URL).replace(/\/$/, '');
}

export function absoluteUrl(path = '/') {
  const base = getSiteUrl();
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}

export function safeJsonLd(data) {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}
