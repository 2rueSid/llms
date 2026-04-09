import { configure, getConsoleSink, getLogger } from "@logtape/logtape";
import { prettyFormatter } from "@logtape/pretty";

const SCHEDULER_LOGGER = "scheduler";
const TECH_DIGEST_LOGGER = "tech-digest";
const DATABASE_LOGGER = "database";
const CLI_LOGGER = "cli";
const REMINDER_LOGGER = "reminder";

export const initLogger = async () =>
	await configure({
		sinks: {
			console: getConsoleSink({
				formatter: prettyFormatter,
			}),
		},
		loggers: [
			{ category: SCHEDULER_LOGGER, lowestLevel: "debug", sinks: ["console"] },
			{
				category: TECH_DIGEST_LOGGER,
				lowestLevel: "debug",
				sinks: ["console"],
			},
			{ category: DATABASE_LOGGER, lowestLevel: "debug", sinks: ["console"] },
			{ category: CLI_LOGGER, lowestLevel: "debug", sinks: ["console"] },
			{ category: REMINDER_LOGGER, lowestLevel: "debug", sinks: ["console"] },
		],
	});

export const schedulerLogger = getLogger(SCHEDULER_LOGGER);
export const techDigestLogger = getLogger(TECH_DIGEST_LOGGER);
export const databaseLogger = getLogger(DATABASE_LOGGER);
export const cliLogger = getLogger(CLI_LOGGER);
export const reminderLogger = getLogger(REMINDER_LOGGER);
