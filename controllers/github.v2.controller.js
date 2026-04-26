export const getSharedReposV2 = async (request, reply) => {
  const { repo } = request.query;

  if (!repo) {
    throw reply.badRequest('Query parameter "repo" is required');
  }

  const [owner, name] = repo.split('/');
  // eslint-disable-next-line no-process-env
  const token = process.env.GITHUB_TOKEN;

  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    'User-Agent': 'NodeJS-App',
  };

  try {
    request.log.info(
      `[v2] Fetching top 20 contributors via REST for ${repo}...`,
    );
    // 1. Отримуємо контриб'юторів (REST)
    const contribRes = await fetch(
      `https://api.github.com/repos/${owner}/${name}/contributors?per_page=20`,
      { headers },
    );
    if (!contribRes.ok) throw new Error(`REST Error: ${contribRes.status}`);
    const contributors = await contribRes.json();

    // 2. Будуємо 1 гігантський GraphQL запит для всіх контриб'юторів одразу (використовуючи Alias)
    let graphqlQuery = 'query {\n';
    contributors.forEach((user, index) => {
      graphqlQuery += `
        user${index}: user(login: "${user.login}") {
          repositories(first: 50, isFork: false, orderBy: {field: PUSHED_AT, direction: DESC}) {
            nodes { nameWithOwner, url }
          }
        }
      `;
    });
    graphqlQuery += '}';

    request.log.info(
      `[v2] Fetching ALL repositories in ONE GraphQL request...`,
    );
    // 3. Відправляємо запит на GraphQL API
    const gqlRes = await fetch('https://api.github.com/graphql', {
      method: 'POST',
      headers,
      body: JSON.stringify({ query: graphqlQuery }),
    });

    if (!gqlRes.ok) throw new Error(`GraphQL Error: ${gqlRes.status}`);
    const gqlData = await gqlRes.json();

    const repoCounts = {};

    // 4. Розбираємо відповідь і рахуємо
    Object.values(gqlData.data).forEach((userData) => {
      if (!userData || !userData.repositories) return;

      userData.repositories.nodes.forEach((r) => {
        if (r.nameWithOwner.toLowerCase() === repo.toLowerCase()) return;

        if (!repoCounts[r.nameWithOwner]) {
          repoCounts[r.nameWithOwner] = {
            repo: r.nameWithOwner,
            shared_contributors: 0,
            html_url: r.url,
          };
        }
        repoCounts[r.nameWithOwner].shared_contributors++;
      });
    });

    const topSharedRepos = Object.values(repoCounts)
      .sort((a, b) => b.shared_contributors - a.shared_contributors)
      .slice(0, 5);

    return {
      target_repo: repo,
      method: 'GraphQL + REST Optimization',
      top_shared_repos: topSharedRepos,
    };
  } catch (error) {
    request.log.error(error);
    throw reply.internalServerError(`GitHub API Error: ${error.message}`);
  }
};
