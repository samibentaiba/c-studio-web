import type { NextConfig } from "next";
import withPWAInit from "next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  // We don't strictly need workbox to generate everything if we wrote sw.js but next-pwa helps inject it
  swSrc: "public/sw.js",
});

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/emception/(.*\\.mjs)",
        headers: [
          {
            key: "Content-Type",
            value: "application/javascript",
          },
        ],
      },
      {
        source: "/emception/(.*\\.wasm)",
        headers: [
          {
            key: "Content-Type",
            value: "application/wasm",
          },
        ],
      },
      {
        source: "/emception/(.*\\.worker\\.js)",
        headers: [
          {
            key: "Content-Type",
            value: "application/javascript",
          },
        ],
      },
      {
        // In Next.js App Router, COOP/COEP might be required for SharedArrayBuffer (which wasm multithreading uses)
        source: "/emception/(.*)",
        headers: [
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin",
          },
          {
            key: "Cross-Origin-Embedder-Policy",
            value: "require-corp",
          },
        ],
      },
    ];
  },
};

export default withPWA(nextConfig);
