const getHealth = (req, res) => {
  res.statusCode = 200;
  return res.end(
    JSON.stringify({
      pid: process.pid,
      nodeVersion: process.version,
      platform: process.platform,
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
    }),
  );
};

module.exports = { getHealth };
