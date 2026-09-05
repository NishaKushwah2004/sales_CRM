const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../../.env") });
const authRoutes = require("./routes/auth.routes");
const companyRoutes = require("./routes/company.routes");
const dealRoutes = require("./routes/deal.routes");
const dashboardRoutes = require("./routes/dashboard.routes");
const app = express();
app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));
app.use(express.json({ limit: "100kb" }));
app.use(cookieParser());
app.disable("x-powered-by");
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");
  next();
});
app.get("/api/health", (req, res) =>
  res.json({ success: true, message: "Sales CRM API is running" }),
);
app.use("/api/auth", authRoutes);
app.use("/api/companies", companyRoutes);
app.use("/api/deals", dealRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use((req, res) =>
  res
    .status(404)
    .json({
      success: false,
      error: { code: "NOT_FOUND", message: "Route not found." },
    }),
);
app.use((error, req, res, next) => {
  console.error(error);
  res
    .status(500)
    .json({
      success: false,
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "An unexpected error occurred.",
      },
    });
});
const configuredPort = String(process.env.PORT || "");
const PORT =
  /^\d{1,5}$/.test(configuredPort) &&
  Number(configuredPort) > 0 &&
  Number(configuredPort) <= 65535
    ? Number(configuredPort)
    : 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
