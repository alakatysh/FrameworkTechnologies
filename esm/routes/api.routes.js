import getUserById, { getUsers } from "../controllers/user.controller.js";
import { getStats } from "../state/request-counter.js";

const getUserByIdSchema = {
  schema: {
    params: {
      type: "object",
      properties: {
        id: { type: "integer" },
      },
      required: ["id"],
    },
  },
};

export default async function apiRoutes(fastify, options) {
  fastify.get("/users", getUsers);
  fastify.get("/users/:id", getUserByIdSchema, getUserById);

  fastify.get("/stats", async () => getStats());
}
