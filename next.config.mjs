/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // pdf-parse uses dynamic requires
    serverComponentsExternalPackages: ['pdf-parse'],
  },
}

export default nextConfig
