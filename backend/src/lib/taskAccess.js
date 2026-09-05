function canManageTasks(deal, user) {
  return user.role === "MANAGER" || deal.ownerId === user.id;
}

module.exports = { canManageTasks };
