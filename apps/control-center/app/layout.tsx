import './globals.css';
import type { ReactNode } from 'react';

export const metadata = {
  title: 'OpenClaw Control Center',
  description: 'Operations dashboard for OpenClaw runtime and hardened memory'
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
