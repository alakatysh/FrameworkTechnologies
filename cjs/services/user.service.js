const userController = require("../controllers/user.controller");
const userRepository = require("../repositories/user.repository");

const rolesMap = require("../data/roles.json");

const getPublicUsers = async () => {
  const users = await userRepository.findAll();
  const formatter = await import("../utils/formatter.mjs");
  return users.map((u) => ({
    id: u.id,
    name: formatter.formatName(u.name),
    roleName: rolesMap[u.id] || "Unknown",
  }));
};

const getUserFormatted = async (id, reply) => {
  return userController.getUserById({ params: { id } }, reply);
};

module.exports = {
  getPublicUsers,
  getUserFormatted,
};
