const databaseUrl = process.env.NEXT_PUBLIC_DATABASE_URL;
const sessionSecret = process.env.NEXT_PUBLIC_SESSION_SECRET;

if (!databaseUrl) {
  throw new Error("Missing required env: DATABASE_URL");
}

if (!sessionSecret) {
  throw new Error("Missing required env: SESSION_SECRET");
}

export const env = {
  databaseUrl,
  sessionSecret,
  nodeEnv: process.env.NODE_ENV ?? "development",
};
