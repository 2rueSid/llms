import { homedir } from "node:os";
import { z } from "zod";

export const ConfigSchema = z.object({
	// SECRETS
	DISCORD_WEBHOOK: z.httpUrl(),
	DISCORD_REMINDER_WEBHOOK: z.httpUrl(),
	GOOGLE_CLIENT_ID: z.string(),
	GOOGLE_CLIENT_SECRET: z.string(),
	GOOGLE_REFRESH_TOKEN: z.string(),

	// DATABASE CONFIGURATION
	DEFAULT_DB_FILE: z.string().default("scheduler.db"),
	DB_PATH: z.string().default(process.cwd()),

	// GENERAL
	TIMEZONE: z.string().default("America/New_York"),
	// TODOS
	TODO_DIRECTORY: z.string().default(`${homedir()}/workbench/notes/todos/`),

	// EMAILS
	GREP_EMAILS: z
		.array(z.string())
		.default([
			"dan@tldrnewsletter.com",
			"support@dou.ua",
			"codingchallenges@substack.com",
		]),
	EMAILS_TIME_RANGE: z.string().default("1d"),

	// Digest
	HN_API_BASE_URL: z.httpUrl().default("https://hn.algolia.com/api/v1/search"),
	TECH_DIGEST_SKILL_NAME: z.string().default("tech-digest"),
	DIGEST_TOPICS: z
		.array(z.string())
		.default(["Rust", "War", "AWS", "Ukraine", "Drones", "Miltech"]),
	LIMIT_PER_TOPIC: z.int().min(1).max(30).default(5),
	LIMIT_PER_CATEGORY: z.int().min(1).max(30).default(20),
	DIGEST_FS_DELIVERY_LOCATION: z
		.string()
		.default(`${homedir()}/workbench/notes/tech-digest`),

	// LOGGERS

	SCHEDULER_LOGGER: z.string().default("scheduler"),
	TECH_DIGEST_LOGGER: z.string().default("tech-digest"),
	DATABASE_LOGGER: z.string().default("database"),
	CLI_LOGGER: z.string().default("cli"),
	REMINDER_LOGGER: z.string().default("reminder"),

	// SCHEDULER
	RUN_INTERVAL: z
		.int()
		.min(10000)
		.default(1000 * 60),
	TASK_TIMEOUT: z
		.int()
		.min(1000 * 10)
		.default(1000 * 60 * 10),
});

export type Config = z.infer<typeof ConfigSchema>;

export const Config = Object.freeze(ConfigSchema.parse(Bun.env));
