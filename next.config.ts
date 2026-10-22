import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // PGlite ships a WASM Postgres build and pg uses optional native bindings;
  // both must stay outside the bundler's module graph.
  serverExternalPackages: ["@electric-sql/pglite", "pg"],
};

export default nextConfig;
