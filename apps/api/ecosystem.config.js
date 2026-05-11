module.exports = {
  apps: [
    {
      name: "api",
      script: "dist/main.js",
      cwd: "/home/deploy/finder-backend/apps/api",
      env: {
        NODE_ENV: "production",
      },
      autorestart: true,
      max_restarts: 10,
    },
  ],
};
