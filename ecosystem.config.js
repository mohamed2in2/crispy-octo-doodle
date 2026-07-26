module.exports = {
  apps: [
    {
      name: "code-up",
      script: "node_modules/next/dist/bin/next",
      args: "start",
      instances: "max", // Automatically utilizes all available vCPUs (2 vCPUs = 2 workers)
      exec_mode: "cluster", // Enables PM2 Cluster Mode to balance traffic across both CPUs
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },
    },
  ],
};
