/** @type {import('next').NextConfig} */
const crypto = require('crypto');

const nextConfig = {
  reactStrictMode: true,

  // 🔥 v12.1 — Build ID univoco ad OGNI deploy (timestamp + random)
  // Invalida automaticamente la cache del browser e del CDN su ogni nuova build,
  // anche se i file sorgente non sono cambiati (es. build trigger manuale).
  generateBuildId: async () => {
    const random = crypto.randomBytes(8).toString('hex');
    return `${Date.now()}-${random}`;
  },

  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/:path*`,
      },
    ];
  },

  // Header anti-cache per le pagine HTML (i chunks JS hanno già hash univoci)
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          // HTML: non cachare mai (browser controlla sempre l'aggiornamento)
          { key: 'Cache-Control', value: 'public, max-age=0, must-revalidate' },
        ],
      },
      {
        // Asset statici Next con hash → cache lunga e immutabile
        source: '/_next/static/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
