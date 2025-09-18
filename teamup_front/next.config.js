/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['teamupbucket035.s3.ap-southeast-2.amazonaws.com'],
  },
};

module.exports = nextConfig;
