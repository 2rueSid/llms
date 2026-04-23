import { configure, getConsoleSink, getLogger } from "@logtape/logtape";
import { prettyFormatter } from "@logtape/pretty";
import { Config } from "@shared/config";

const {
	SCHEDULER_LOGGER,
	TECH_DIGEST_LOGGER,
	DATABASE_LOGGER,
	CLI_LOGGER,
	REMINDER_LOGGER,
} = Config;

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
