import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    unoptimized: true, // Required for static exports like GitHub Pages
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
    ],
  },
  // For GitHub Pages, if deploying to a subpath like username.github.io/repo-name:
  // The actions/configure-pages@v5 action in the workflow should handle basePath and assetPrefix automatically.
  // basePath: '/repo-name',
  // assetPrefix: '/repo-name/',
  output: 'export', // Add this for static site generation for GitHub Pages
};

export default nextConfig;

