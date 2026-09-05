const cookieName = "sales_crm_session";
const defaultCookieAgeMs = 24 * 60 * 60 * 1000;
function getCookieMaxAgeMs() {
  const configured = Number(process.env.JWT_COOKIE_MAX_AGE_MS);
  return Number.isFinite(configured) && configured > 0
    ? configured
    : defaultCookieAgeMs;
}
function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is not configured");
  if (process.env.NODE_ENV === "production" && secret.length < 32)
    throw new Error("JWT_SECRET must be at least 32 characters in production");
  return secret;
}
function getCookieOptions() {
  const isProduction = process.env.NODE_ENV === "production";
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    maxAge: getCookieMaxAgeMs(),
    path: "/",
  };
}
module.exports = {
  cookieName,
  getCookieMaxAgeMs,
  getJwtSecret,
  getCookieOptions,
};
