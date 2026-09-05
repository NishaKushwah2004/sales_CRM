const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const prisma = require("../lib/prisma");
const {
  cookieName,
  getCookieOptions,
  getJwtSecret,
} = require("../config/auth");
const { requireAuth } = require("../middleware/auth");
const { allowRoles } = require("../middleware/authorize");
const router = express.Router();
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const minimumPasswordLength = 8;
const safeUser = (user) => ({
  id: user.id,
  email: user.email,
  role: user.role,
});
router.post("/register", async (req, res, next) => {
  try {
    const email =
      typeof req.body?.email === "string"
        ? req.body.email.trim().toLowerCase()
        : "";
    const password =
      typeof req.body?.password === "string" ? req.body.password : "";
    if (!emailPattern.test(email) || password.length < minimumPasswordLength) {
      return res
        .status(400)
        .json({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: `A valid email and password of at least ${minimumPasswordLength} characters are required.`,
          },
        });
    }
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: { email, passwordHash, role: "SALES_REP" },
    });
    return res
      .status(201)
      .json({ success: true, data: { user: safeUser(user) } });
  } catch (error) {
    if (error.code === "P2002")
      return res
        .status(409)
        .json({
          success: false,
          error: {
            code: "EMAIL_EXISTS",
            message: "An account with this email already exists.",
          },
        });
    return next(error);
  }
});
router.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body ?? {};
    if (
      typeof email !== "string" ||
      !emailPattern.test(email.trim()) ||
      typeof password !== "string" ||
      !password
    )
      return res
        .status(400)
        .json({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "A valid email and password are required.",
          },
        });
    const user = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });
    const validPassword = user
      ? await bcrypt.compare(password, user.passwordHash)
      : false;
    if (!user || !validPassword)
      return res
        .status(401)
        .json({
          success: false,
          error: {
            code: "INVALID_CREDENTIALS",
            message: "Email or password is incorrect.",
          },
        });
    const token = jwt.sign({ sub: user.id }, getJwtSecret(), {
      expiresIn: process.env.JWT_EXPIRES_IN || "1d",
    });
    res.cookie(cookieName, token, getCookieOptions());
    return res
      .status(200)
      .json({ success: true, data: { user: safeUser(user) } });
  } catch (error) {
    return next(error);
  }
});
router.post("/logout", (req, res) => {
  const options = getCookieOptions();
  res.clearCookie(cookieName, {
    httpOnly: options.httpOnly,
    secure: options.secure,
    sameSite: options.sameSite,
    path: options.path,
  });
  return res
    .status(200)
    .json({ success: true, data: { message: "Logged out successfully." } });
});
router.get("/me", requireAuth, (req, res) =>
  res.status(200).json({ success: true, data: { user: req.user } }),
);
router.get("/manager-check", requireAuth, allowRoles("MANAGER"), (req, res) =>
  res
    .status(200)
    .json({
      success: true,
      data: { message: "Manager authorization confirmed." },
    }),
);
module.exports = router;
