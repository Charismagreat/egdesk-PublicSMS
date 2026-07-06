import type { NextConfig } from "next";

/**
 * 🔍 Automatically detect local IPv4 addresses to allow LAN access.
 */
const getLocalIPs = () => {
  try {
    const os = require('os');
    const interfaces = os.networkInterfaces();
    const ips = ['localhost', '127.0.0.1'];
    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name]) {
        if (iface.family === 'IPv4' && !iface.internal) {
          ips.push(iface.address);
          const parts = iface.address.split('.');
          if (parts.length === 4) {
            ips.push(`${parts[0]}.${parts[1]}.${parts[2]}.*`);
          }
        }
      }
    }
    return Array.from(new Set(ips));
  } catch (e) {
    return ['localhost', '127.0.0.1', '192.168.0.*', '192.168.1.*', '10.0.0.*'];
  }
};

// 정부 지원금 크롤러 스케줄러 데몬 중복 실행 방지 가드 가동
if (!(global as any)._grantSyncDaemonStarted) {
  (global as any)._grantSyncDaemonStarted = true;
  try {
    const { fork } = require('child_process');
    const path = require('path');
    const daemonPath = path.join(process.cwd(), 'scripts/grant_sync_daemon.js');
    console.log('🚀 [next.config] Starting Grant Sync Daemon at:', daemonPath);
    fork(daemonPath, [], {
      detached: true,
      stdio: 'ignore'
    }).unref();
  } catch (err) {
    console.error('❌ [next.config] Failed to start Grant Sync Daemon:', err);
  }
}

console.log('🔍 DEBUG next.config: EGDESK_BASE_PATH env var =', process.env.EGDESK_BASE_PATH);

const nextConfig = {
  // Trigger config reload: 2026-06-17T15:08:00
  // Allow LAN/IP access to the dev server (Next.js 15+)
  allowedDevOrigins: getLocalIPs(),
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
      allowedOrigins: [
        'localhost:3000',
        '127.0.0.1:3000',
        'localhost:4000',
        '127.0.0.1:4000',
        '*.loca.lt',
        '*.ngrok.io',
        '*.ngrok-free.app',
        '*.trycloudflare.com',
        '*.gitpod.io',
        '*.tryhook.io',
        '*.localto.net'
      ]
    }
  },
  // Only use basePath in production mode, not in dev mode
  basePath: process.env.NODE_ENV === 'development' ? '' : (process.env.EGDESK_BASE_PATH || ''),
  assetPrefix: process.env.NODE_ENV === 'development' ? '' : (process.env.EGDESK_BASE_PATH || ''),
  typescript: {
    // Always skip TypeScript errors to prevent blocking on auto-generated files
    ignoreBuildErrors: true,
  },
  eslint: {
    // Always skip ESLint errors to prevent blocking on auto-generated files
    ignoreDuringBuilds: true,
  },
  /* config options here */
} as any;

console.log('🔍 DEBUG next.config: Final config basePath =', nextConfig.basePath);
console.log('🔍 DEBUG next.config: Final config assetPrefix =', nextConfig.assetPrefix);


export default nextConfig;
