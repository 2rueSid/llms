import { configure, getConsoleSink, getLogger } from "@logtape/logtape";
import { prettyFormatter } from "@logtape/pretty";

const SCHEDULER_LOGGER = "scheduler";
const TECH_DIGEST_LOGGER = "tech-digest";

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
		],
	});

export const schedulerLogger = getLogger(SCHEDULER_LOGGER);
export const techDigestLogger = getLogger(TECH_DIGEST_LOGGER);
