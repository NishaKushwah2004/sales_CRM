const path = require("path");
const { PrismaClient } = require(
  path.resolve(__dirname, "../../../node_modules/@prisma/client"),
);
module.exports = new PrismaClient();
