const { UserRole } = require("../../../node_modules/@prisma/client");

function dealAccess(user) {
  return user.role === UserRole.MANAGER
    ? {}
    : {
        OR: [
          { ownerId: user.id },
          { collaborators: { some: { userId: user.id } } },
        ],
      };
}

module.exports = { dealAccess };
