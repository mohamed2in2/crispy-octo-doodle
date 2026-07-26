module.exports = {
  apps: [
    {
      name: "code-up",
      script: "node_modules/next/dist/bin/next",
      args: "start",
      instances: 2, // Spawns 2 worker instances across both 2 vCPUs
      exec_mode: "cluster", // Enables load balancing across both vCPUs
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },
    },
  ],
};
