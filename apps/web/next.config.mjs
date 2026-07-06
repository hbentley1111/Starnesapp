/** Thin RSC shell over a client-data interior (§3.1). App Router segments per
 * feature module are lazy boundaries enforcing per-route bundle budgets
 * (shell ≤130KB, per-route ≤70KB, PWA capture ≤90KB gzip). */
const nextConfig = { reactStrictMode: true };
export default nextConfig;
