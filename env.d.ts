declare namespace NodeJS {
    interface ProcessEnv {
        NODE_ENV: "development" | "production";
        VITE_API_URL: string;
        VITE_DISCORD_APP_ID: string;
        DISCORD_APP_SECRET: string;
        DISCORD_BOT_TOKEN: string;
    }
}
