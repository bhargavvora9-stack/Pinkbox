const BK_CRM_ORIGIN = 'https://bk-crm-bhargavvora9-5434s-projects.vercel.app';

const nextConfig = {
  async redirects() {
    return [
      { source: '/', destination: '/website', permanent: false },
      { source: '/dashboard', destination: '/website', permanent: false },
      { source: '/dashboard/:path*', destination: '/website', permanent: false },
    ];
  },
  async rewrites() {
    return [
      { source: '/:path*', destination: `${BK_CRM_ORIGIN}/:path*` },
    ];
  },
};

export default nextConfig;
