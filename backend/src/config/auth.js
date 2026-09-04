const cookieName = 'sales_crm_session'
const defaultCookieAgeMs = 24 * 60 * 60 * 1000
function getCookieMaxAgeMs() { const configured = Number(process.env.JWT_COOKIE_MAX_AGE_MS); return Number.isFinite(configured) && configured > 0 ? configured : defaultCookieAgeMs }
function getJwtSecret() { if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET is not configured'); return process.env.JWT_SECRET }
function getCookieOptions() { const isProduction = process.env.NODE_ENV === 'production'; return { httpOnly: true, secure: isProduction, sameSite: isProduction ? 'none' : 'lax', maxAge: getCookieMaxAgeMs(), path: '/' } }
module.exports = { cookieName, getCookieMaxAgeMs, getJwtSecret, getCookieOptions }
