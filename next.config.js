/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  env: {
    BASIC_AUTH_USER: 'ivf', 
    BASIC_AUTH_PASSWORD: 'ivf'
  },
  experimental: {
    serverComponentsExternalPackages: ['pdfkit', 'qrcode']
  },
  webpack: (config) => {
    config.resolve.alias.canvas = false
    config.resolve.alias.encoding = false
    return config
  },
  // 検索エンジン対策
  async headers() {
    return [
      {
        source: '/robots.txt',
        headers: [
          {
            key: 'Content-Type',
            value: 'text/plain',
          },
        ],
      },
    ]
  },
}

module.exports = nextConfig