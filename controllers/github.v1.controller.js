export const getSharedReposV1 = async (request, reply) => {
  const { repo } = request.query; // наприклад: "fastify/fastify"

  if (!repo) {
    throw reply.badRequest(
      'Query parameter "repo" is required (e.g., ?repo=fastify/fastify)',
    );
  }

  // eslint-disable-next-line no-process-env
  const token = process.env.GITHUB_TOKEN;
  const headers = {
    Accept: 'application/vnd.github.v3+json',
    'User-Agent': 'NodeJS-App',
    ...(token && { Authorization: `Bearer ${token}` }),
  };

  try {
    request.log.info(`Fetching contributors for ${repo}...`);
    const contribResponse = await fetch(
      `https://api.github.com/repos/${repo}/contributors?per_page=30`,
      { headers },
    );

    if (!contribResponse.ok) {
      throw new Error(`GitHub API returned ${contribResponse.status}`);
    }
    const contributors = await contribResponse.json();

    const repoCounts = {};

    await Promise.all(
      contributors.map(async (contributor) => {
        try {
          const userReposRes = await fetch(
            `https://api.github.com/users/${contributor.login}/repos?per_page=50`,
            { headers },
          );
          if (!userReposRes.ok) return;

          const userRepos = await userReposRes.json();

          userRepos.forEach((r) => {
            if (r.full_name.toLowerCase() === repo.toLowerCase()) return;

            if (!repoCounts[r.full_name]) {
              repoCounts[r.full_name] = {
                repo: r.full_name,
                shared_contributors: 0,
                html_url: r.html_url,
              };
            }
            repoCounts[r.full_name].shared_contributors++;
          });
        } catch {
          request.log.error(`Failed to fetch repos for ${contributor.login}`);
        }
      }),
    );

    const topSharedRepos = Object.values(repoCounts)
      .sort((a, b) => b.shared_contributors - a.shared_contributors)
      .slice(0, 5);

    return {
      target_repo: repo,
      top_shared_repos: topSharedRepos,
    };
  } catch (error) {
    request.log.error(error);
    throw reply.internalServerError(`GitHub API Error: ${error.message}`);
  }
};
