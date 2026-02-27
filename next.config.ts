import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";
import { PHASE_PRODUCTION_BUILD } from "next/constants.js";
import pkg from "./package.json";

const BUILD_MODE = process.env.NEXT_PUBLIC_BUILD_MODE;

export default async function Config(phase: string) {
  const nextConfig: NextConfig = {
    /* config options here */
    experimental: {
      reactCompiler: true,
    },
    env: {
      NEXT_PUBLIC_VERSION: pkg.version,
    },
    transpilePackages: ["pdfjs-dist", "mermaid"],
  };

  if (BUILD_MODE === "export") {
    nextConfig.output = "export";
    // Only used for static deployment, the default deployment directory is the root directory
    nextConfig.basePath = "";
    // Statically exporting a Next.js application via `next export` disables API routes and middleware.
    nextConfig.webpack = (config) => {
      config.module.rules.push({
        test: /src\/app\/api/,
        loader: "ignore-loader",
      });
      config.module.rules.push({
        test: /src\/middleware/,
        loader: "ignore-loader",
      });
      return config;
    };
  } else if (BUILD_MODE === "standalone") {
    nextConfig.output = "standalone";
  }

  if (phase === PHASE_PRODUCTION_BUILD) {
    const withSerwist = withSerwistInit({
      // Note: This is only an example. If you use Pages Router,
      // use something else that works, such as "service-worker/index.ts".
      swSrc: "src/app/sw.ts",
      swDest: "public/sw.js",
      register: false,
    });

    return withSerwist(nextConfig);
  }

  return nextConfig;
}
