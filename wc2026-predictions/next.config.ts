import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Allow phone / LAN devices on the same Wi-Fi to load /_next dev resources
  // (JS + CSS) when testing the dev server from another device.
  allowedDevOrigins: ['192.168.0.82', '*.local'],
  // Hide the dev tools floating button (it overlaps the bottom tab bar).
  devIndicators: false,
};

export default nextConfig;
