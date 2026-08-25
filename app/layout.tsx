import type { Metadata, Viewport } from 'next';
import './globals.css';
import { AppShell } from '@/components/AppShell';
import { ServiceWorkerRegister } from '@/components/ServiceWorkerRegister';
import { StoreProvider } from '@/lib/store';

export const metadata: Metadata = {
  title: { default: 'SJD Project', template: '%s | SJD Project' },
  description: 'One calm system for life, work, and wealth.',
  applicationName: 'SJD Project',
  manifest: '/manifest.webmanifest',
  icons: { icon: '/icon-192.png', apple: '/icon-192.png' },
};

export const viewport: Viewport = { themeColor: '#00106E', colorScheme: 'dark' };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <StoreProvider><AppShell>{children}</AppShell></StoreProvider>
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
