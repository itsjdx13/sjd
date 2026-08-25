import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'SJD Project', short_name: 'SJD', description: 'Life, work, and wealth in one private workspace.',
    start_url: '/', display: 'standalone', background_color: '#070b17', theme_color: '#00106E',
    orientation: 'any',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
