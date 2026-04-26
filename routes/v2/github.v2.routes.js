import * as githubV2Controller from '#controllers/github.v2.controller.js';

export const githubV2Routes = async (fastify) => {
  fastify.get('/github/shared-repos', githubV2Controller.getSharedReposV2);
};
