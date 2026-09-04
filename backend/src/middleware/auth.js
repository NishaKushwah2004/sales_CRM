const jwt = require('jsonwebtoken')
const prisma = require('../lib/prisma')
const { cookieName, getJwtSecret } = require('../config/auth')
async function requireAuth(req, res, next) {
  const token = req.cookies[cookieName]
  if (!token) return res.status(401).json({ success: false, error: { code: 'UNAUTHENTICATED', message: 'Authentication is required.' } })
  try {
    const payload = jwt.verify(token, getJwtSecret())
    if (!payload || typeof payload.sub !== 'string') return res.status(401).json({ success: false, error: { code: 'UNAUTHENTICATED', message: 'Authentication token is invalid.' } })
    const user = await prisma.user.findUnique({ where: { id: payload.sub }, select: { id: true, email: true, role: true } })
    if (!user) return res.status(401).json({ success: false, error: { code: 'UNAUTHENTICATED', message: 'Authentication is required.' } })
    req.user = user
    return next()
  } catch (error) {
    if (error.name === 'TokenExpiredError' || error.name === 'JsonWebTokenError') return res.status(401).json({ success: false, error: { code: 'UNAUTHENTICATED', message: 'Authentication token is invalid or expired.' } })
    return next(error)
  }
}
module.exports = { requireAuth }
