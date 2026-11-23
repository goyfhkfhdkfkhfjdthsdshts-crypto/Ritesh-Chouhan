import type { NextConfig } from 'next';
import { PHASE_DEVELOPMENT_SERVER } from 'next/constants';

const nextConfig = (phase: string): NextConfig => {
  const isDev = phase === PHASE_DEVELOPMENT_SERVER;
  const isExport =
    process.env.GITHUB_PAGES === 'true' ||
    process.env.STATIC_EXPORT === 'true' ||
    process.env.NEXT_EXPORT === 'true';

  // Determine repository base path for GitHub Pages (e.g., /repo-name)
  // When deploying to https://<username>.github.io/<repo-name>/, basePath is required.
  let repoName = '';
  if (process.env.GITHUB_REPOSITORY) {
    const parts = process.env.GITHUB_REPOSITORY.split('/');
    const repo = parts[1];
    // If repository is username.github.io, it is served at root domain, so basePath is ''
    if (repo && !repo.endsWith('.github.io')) {
      repoName = `/${repo}`;
    }
  }

  const rawBasePath = process.env.NEXT_PUBLIC_BASE_PATH || process.env.BASE_PATH || (isExport ? repoName : '');
  const basePath = rawBasePath && rawBasePath !== '/' 
    ? (rawBasePath.startsWith('/') ? rawBasePath : `/${rawBasePath}`).replace(/\/$/, '') 
    : '';

  // Next.js gates dev assets and HMR by request origin in dev mode.
  // Allow AI Studio preview host (*.run.app), localhost, and Base44 sandbox if enabled.
  const allowedDevOrigins: string[] = [
    'localhost:3000',
    'localhost:8080',
    '127.0.0.1:3000',
    '127.0.0.1:8080',
    '*.run.app',
    '*.google.com',
  ];
  if (process.env.BASE44_PUBLIC_HOST_SUFFIX) {
    allowedDevOrigins.push(
      `3000-${process.env.BASE44_PUBLIC_HOST_SUFFIX}`,
      `https://3000-${process.env.BASE44_PUBLIC_HOST_SUFFIX}`
    );
  }
  if (process.env.APP_URL) {
    try {
      const parsedUrl = new URL(process.env.APP_URL);
      if (parsedUrl.host) {
        allowedDevOrigins.push(parsedUrl.host);
      }
    } catch {}
  }

  return {
    ...(allowedDevOrigins ? { allowedDevOrigins } : {}),
    // Enable static export when building for GitHub Pages or static hosting
    ...(isExport
      ? {
          output: 'export' as const,
          trailingSlash: true,
          basePath: basePath || undefined,
        }
      : {
          // Separate dev server cache from production build directory to avoid
          // file access race conditions between running dev server and next build.
          distDir: isDev ? '.next-dev' : '.next',
        }),
    reactStrictMode: true,
    eslint: {
      ignoreDuringBuilds: true,
    },
    typescript: {
      ignoreBuildErrors: isExport,
    },
    images: {
      unoptimized: isExport,
      remotePatterns: [
        {
          protocol: 'https',
          hostname: 'picsum.photos',
          port: '',
          pathname: '/**',
        },
        {
          protocol: 'https',
          hostname: 'images.unsplash.com',
          port: '',
          pathname: '/**',
        },
      ],
    },
    transpilePackages: ['motion'],
    env: {
      NEXT_PUBLIC_APP_URL:
        process.env.NEXT_PUBLIC_APP_URL && !process.env.NEXT_PUBLIC_APP_URL.includes('ais-dev-')
          ? process.env.NEXT_PUBLIC_APP_URL
          : '',
      NEXT_PUBLIC_API_URL:
        process.env.NEXT_PUBLIC_API_URL && !process.env.NEXT_PUBLIC_API_URL.includes('ais-dev-')
          ? process.env.NEXT_PUBLIC_API_URL
          : '',
      NEXT_PUBLIC_BASE_PATH: basePath || '',
    },
    webpack: (config, { dev }) => {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify - file watching is disabled to prevent flickering during agent edits.
      if (dev && process.env.DISABLE_HMR === 'true') {
        config.watchOptions = {
          ignored: /.*/,
        };
      }
      return config;
    },
  };
};

export default nextConfig;
