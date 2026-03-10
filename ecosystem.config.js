module.exports = {
  apps: [
    {
      name: "track",
      script: "node_modules/next/dist/bin/next",
      args: "start",
      cwd: "/var/www/track",
      instances: "max", // CPUコア数に応じて自動調整
      exec_mode: "cluster",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },
      // ログ設定
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      error_file: "/var/log/pm2/track-error.log",
      out_file: "/var/log/pm2/track-out.log",
      merge_logs: true,
      // 自動再起動設定
      max_memory_restart: "500M",
      restart_delay: 5000,
      max_restarts: 10,
      // 監視設定（開発時のみ有効化）
      watch: false,
    },
  ],
};
