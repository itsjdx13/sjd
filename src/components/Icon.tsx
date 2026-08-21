import type { SVGProps } from 'react';

const paths: Record<string, string> = {
  overview: 'M4 13h6V4H4v9Zm0 7h6v-4H4v4Zm10 0h6v-9h-6v9Zm0-16v4h6V4h-6Z',
  portfolio: 'M3 7h18v13H3V7Zm4-3h10v3H7V4Zm0 8h4v3H7v-3Z',
  markets: 'M4 18V9m5 9V5m5 13v-7m5 7V3',
  calculator: 'M5 3h14v18H5V3Zm3 4h8M8 11h1m3 0h1m3 0h1m-9 4h1m3 0h1m3 0h1',
  settings: 'M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm7.4-3.5a7.8 7.8 0 0 0-.1-1l2-1.5-2-3.4-2.4 1a8 8 0 0 0-1.8-1L14.8 3h-4l-.4 2.6a8 8 0 0 0-1.8 1l-2.4-1-2 3.4 2 1.5a7.8 7.8 0 0 0 0 2l-2 1.5 2 3.4 2.4-1a8 8 0 0 0 1.8 1l.4 2.6h4l.4-2.6a8 8 0 0 0 1.8-1l2.4 1 2-3.4-2-1.5a7.8 7.8 0 0 0 .1-1Z',
  eye: 'M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Zm10 3a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z',
  eyeOff: 'm3 3 18 18M10.6 6.2A12 12 0 0 1 12 6c6.5 0 10 6 10 6a14 14 0 0 1-2.1 2.8M6.2 6.2C3.4 8 2 12 2 12s3.5 6 10 6a10 10 0 0 0 3.8-.7M9.9 9.9a3 3 0 0 0 4.2 4.2',
  refresh: 'M20 7v5h-5M4 17v-5h5M6.1 9a7 7 0 0 1 11.4-2L20 12M4 12l2.5 5a7 7 0 0 0 11.4-2',
  plus: 'M12 5v14M5 12h14',
  close: 'M6 6l12 12M18 6 6 18',
  trash: 'M4 7h16M9 7V4h6v3m3 0-1 14H7L6 7m4 4v6m4-6v6',
  download: 'M12 3v12m0 0 5-5m-5 5-5-5M5 21h14',
  upload: 'M12 17V5m0 0 5 5m-5-5-5 5M5 21h14',
  chevron: 'm9 18 6-6-6-6',
  wifiOff: 'M2 8.5A16 16 0 0 1 6 6m4.5-1a16 16 0 0 1 11.5 3.5M5.5 12a10 10 0 0 1 4-2m4.5.2a10 10 0 0 1 4.5 1.8M8.8 15.5a4.8 4.8 0 0 1 6.4 0M12 19h.01M3 3l18 18'
};

export function Icon({ name, ...props }: SVGProps<SVGSVGElement> & { name: keyof typeof paths }) {
  return <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}><path d={paths[name]} /></svg>;
}
