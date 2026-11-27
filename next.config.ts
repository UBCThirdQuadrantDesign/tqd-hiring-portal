import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      // The application lived at /hiring last round; keep old shared links working.
      // Temporary (307) so browsers don't cache it if routes move again next round.
      { source: "/hiring", destination: "/", permanent: false },
    ];
  },
};

export default nextConfig;
