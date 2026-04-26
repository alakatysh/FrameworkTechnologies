import * as githubController from '#controllers/github.v1.controller.js';

export const githubV1Routes = async (fastify) => {
  fastify.get('/github/shared-repos', githubController.getSharedReposV1);
};
