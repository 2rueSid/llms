import { mkdir, readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { DateTime } from "luxon";
import z from "zod";
import { streamResponse } from "../codex";
import { DiscordDelivery, FSDelivery } from "../delivery";
import { initLogger, reminderLogger } from "../logger";

const TIMEZONE = "America/New_York";
const TODO_DIR = `${homedir()}/workbench/notes/todos/`;

type LLMRequest = {
	todo?: string;
	create: boolean;
	now: string;
	timezone: string;
};

const zOutputItem = z.object({
	type: z.enum(["reminder", "todo"]),
	content: z.string(),
});

const zOutputSchema = z.array(zOutputItem);

type OutputItem = z.infer<typeof zOutputItem>;

///

async function process(now: DateTime): Promise<OutputItem[] | null> {
	if (now.hour < 7) {
		reminderLogger.info("Before 7am — skipping");
		return null;
	}

	await mkdir(TODO_DIR, { recursive: true });

	const todayFile = await findTodoFile(now);
	const yesterdayFile = await findTodoFile(now.minus({ days: 1 }));

	const llmRequest: LLMRequest = {
		now: now.toISO() ?? now.toString(),
		timezone: TIMEZONE,
		create: false,
		todo: undefined,
	};

	if (!todayFile) {
		// create mode: build today's todo from yesterday's if available
		llmRequest.create = true;
		if (yesterdayFile) {
			llmRequest.todo = await readFile(yesterdayFile, "utf8");
			reminderLogger.info(`Carrying over yesterday's todo: ${yesterdayFile}`);
		}
	} else if (now.hour >= 9) {
		// reminder mode: process today's existing todo
		llmRequest.todo = await readFile(todayFile, "utf8");
		reminderLogger.info(`Processing today's todo for reminders: ${todayFile}`);
	} else {
		reminderLogger.info("Todo exists but before 9am — skipping reminders");
		return null;
	}

	const { data } = await streamResponse([
		{ type: "text", text: "use reminder skill to process my todo" },
		{ type: "text", text: JSON.stringify({ data: llmRequest }) },
	]);

	if (!data) {
		reminderLogger.warning("No response from model");
		return null;
	}

	const parsedData = zOutputSchema.safeParse(JSON.parse(data));
	if (!parsedData.success) {
		reminderLogger.error(`Error parsing output ${parsedData.error}`);
		return null;
	}

	return parsedData.data;
}

(async () => {
	await initLogger();

	const now = DateTime.now().setZone(TIMEZONE);
	const todayFilename = getTodoFilename(now);

	const fsDelivery = new FSDelivery(TODO_DIR, "markdown");
	const discordDelivery = new DiscordDelivery(
		Bun.env.DISCORD_REMINDER_WEBHOOK ?? "",
		"markdown",
	);

	const actions = await process(now);

	if (!actions) return;

	for (const action of actions) {
		if (action.type === "todo") {
			await fsDelivery.deliver(action.content, todayFilename);
			reminderLogger.info(`Todo saved: ${todayFilename}`);
		} else if (action.type === "reminder") {
			await discordDelivery.deliver(action.content, "");
			reminderLogger.info("Reminder sent to Discord");
		}
	}
})();

/// helpers

function getTodoFilename(date: DateTime): string {
	return `todo-${date.toFormat("dd.MM")}.md`;
}

async function findTodoFile(date: DateTime): Promise<string | undefined> {
	const filepath = `${TODO_DIR}${getTodoFilename(date)}`;
	const file = Bun.file(filepath);
	return (await file.exists()) ? filepath : undefined;
}
