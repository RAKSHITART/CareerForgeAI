/** @type {import('next').NextConfig} */
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), geolocation=(), microphone=(self)" }, // microphone is used by voice interviews
];

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    domains: ["images.unsplash.com", "avatars.githubusercontent.com"],
  },
  experimental: {
    // parsed at runtime by Node, not bundled
    serverComponentsExternalPackages: ["pdf-parse", "pdfjs-dist", "mammoth", "nodemailer", "docx"],
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
