const nextConfig = {
  async redirects() {
    return [
      { source: '/', destination: '/website', permanent: false },
    ];
  },
};

export default nextConfig;
