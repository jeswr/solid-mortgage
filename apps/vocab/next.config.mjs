/** @type {import("next").NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      {
        source: "/",
        destination: "/mort",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
