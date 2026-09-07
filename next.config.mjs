const BK_CRM_ORIGIN = 'https://bk-crm-bhargavvora9-5434s-projects.vercel.app';

/**
 * PinkBox is a standalone Website deployment surface.
 * The existing Website module stays the source of truth in BK-CRM, so we do
 * not duplicate its business/UI code. Requests are internally proxied to the
 * existing production app, preserving the existing Supabase/auth/API work.
 */
const nextConfig = {
  async rewrites() {
    return [
      { source: '/', destination: `${BK_CRM_ORIGIN}/website` },
      { source: '/:path*', destination: `${BK_CRM_ORIGIN}/:path*` },
    ];
  },
};

export default nextConfig;
