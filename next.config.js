/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['sqlite3']
  },
  output: 'standalone'
}

module.exports = nextConfig 