/** @type {import('next').NextConfig} */
const nextConfig = {
  // Proxy API calls to FastAPI during development
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/:path*`,
      },
    ];
  },

  // Optimize images from external domains if needed
  images: {
    remotePatterns: [],
  },

  // Enable React strict mode for catching issues early
  reactStrictMode: true,
};

export default nextConfig;
