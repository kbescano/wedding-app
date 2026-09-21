import { withPayload } from '@payloadcms/next/withPayload'
import type { NextConfig } from 'next'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(__filename)

const nextConfig: NextConfig = {
  agentRules: false,
  devIndicators: false, // the dev badge overlaps the mobile tab bar
  images: {
    localPatterns: [
      {
        pathname: '/api/photos/file/**',
      },
    ],
  },
  webpack: (webpackConfig) => {
    webpackConfig.resolve.extensionAlias = {
      '.cjs': ['.cts', '.cjs'],
      '.js': ['.ts', '.tsx', '.js', '.jsx'],
      '.mjs': ['.mts', '.mjs'],
    }

    return webpackConfig
  },
  turbopack: {
    root: path.resolve(dirname),
  },
  experimental: {
    // Turbopack's persistent build cache records every environment variable the build reads as `NAME/value`
    // (PAYLOAD_SECRET included) in .next/cache. Hosts that scan build output for secrets (Netlify) then refuse the
    // deploy, and it's a needless copy of the secret on disk. Production builds start clean on CI anyway.
    turbopackFileSystemCacheForBuild: false,
  },
}

export default withPayload(nextConfig, { devBundleServerPackages: false })
