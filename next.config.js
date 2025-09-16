/** @type {import('next').NextConfig} */

const nextConfig = {
    webpack(config) {
        // Grab the existing rule that handles SVG imports
        const fileLoaderRule = config.module.rules.find((rule) =>
            rule.test?.test?.(".svg")
        );

        config.module.rules.push(
            // Reapply the existing rule, but only for svg imports ending in ?url
            {
                ...fileLoaderRule,
                test: /\.svg$/i,
                resourceQuery: /url/, // *.svg?url
            },
            // Convert all other *.svg imports to React components
            {
                test: /\.svg$/i,
                issuer: fileLoaderRule.issuer,
                resourceQuery: { not: [...fileLoaderRule.resourceQuery.not, /url/] }, // exclude if *.svg?url
                use: ["@svgr/webpack"],
            }
        );

        // Modify the file loader rule to ignore *.svg, since we have it handled now.
        fileLoaderRule.exclude = /\.svg$/i;

        return config;
    },

    // Usar rewrites en lugar de headers CORS
    async rewrites() {
        return [
            {
                source: '/api/auth/:path*',
                destination: 'http://localhost/api/auth/:path*',
            },
            {
                source: '/api/admin/:path*',
                destination: 'http://localhost/api/admin/:path*',
            },
            // Proxy para GPS API externa - evita problemas de CORS
            {
                source: '/api/gps/:path*',
                destination: 'https://gps.dxplus.org/api/:path*',
            },
            {
                source: '/api/devices/:path*',
                destination: 'https://gps.dxplus.org/api/devices/:path*',
            },
            {
                source: '/api/users/:path*',
                destination: 'https://gps.dxplus.org/api/users/:path*',
            },
            {
                source: '/api/assets/:path*',
                destination: 'https://gps.dxplus.org/api/assets/:path*',
            }
        ];
    },

    images: {
        unoptimized: true,
        remotePatterns: [
            {
                protocol: "https",
                hostname: "api.lorem.space",
            },
            {
                protocol: "https",
                hostname: "lh3.googleusercontent.com",
            },
            {
                protocol: "https",
                hostname: "a0.muscache.com",
            },
            {
                protocol: "https",
                hostname: "avatars.githubusercontent.com",
            },
        ],
    },
};

module.exports = nextConfig;