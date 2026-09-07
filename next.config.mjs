/** @type {import('next').NextConfig} */
const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "base-uri 'self'",
      "object-src 'none'",
      "frame-ancestors 'none'",
      "form-action 'self'",
      "script-src 'self' 'unsafe-inline' https://checkout.razorpay.com https://*.razorpay.com",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data: https:",
      "connect-src 'self' https://*.supabase.co https://api.razorpay.com https://*.razorpay.com",
      "frame-src 'self' https://checkout.razorpay.com https://*.razorpay.com",
      "media-src 'self' blob: https:",
      "worker-src 'self' blob:",
      "manifest-src 'self'",
      "upgrade-insecure-requests",
    ].join('; '),
  },
];

const nextConfig = {
  async headers() {
    return [{ source: '/(.*)', headers: securityHeaders }];
  },
  async redirects() {
    return [
      { source: '/', destination: '/website', permanent: false },
    ];
  },
};

export default nextConfig;
