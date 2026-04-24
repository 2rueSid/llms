import { mkdir, readFile } from "node:fs/promises";
import { DiscordDelivery, FSDelivery } from "@lib/delivery";
import { CodexRunner } from "@lib/llm-runner";
import { Config } from "@shared/config";
import { initLogger, reminderLogger } from "@shared/logger";
import { Task, type TaskModule } from "@shared/task-abs";
import { DateTime } from "luxon";
import z from "zod";

await initLogger();

const TODO_DIR = Config.TODO_DIRECTORY;

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

const schema = z.object({
	items: z.array(zOutputItem).default([]),
});

class ReminderTask extends Task<typeof schema> {
	override async run(): Promise<void> {
		const now = DateTime.now().setZone(Config.TIMEZONE);
		const todayFilename = this.getTodoFilename(now);

		if (now.hour < 7) {
			reminderLogger.info("Before 7am — skipping");
			return;
		}

		await mkdir(TODO_DIR, { recursive: true });

		const todayFile = await this.findTodoFile(now);
		const yesterdayFile = await this.findTodoFile(now.minus({ days: 1 }));

		const llmRequest: LLMRequest = {
			now: now.toISO() ?? now.toString(),
			timezone: Config.TIMEZONE,
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
			reminderLogger.info(
				`Processing today's todo for reminders: ${todayFile}`,
			);
		} else {
			reminderLogger.info("Todo exists but before 9am — skipping reminders");
			return;
		}

		const { data } = await this.runner.streamResponse([
			{ type: "text", text: "use reminder skill to process my todo" },
			{ type: "text", text: JSON.stringify({ data: llmRequest }) },
		]);

		if (!data) {
			reminderLogger.warning("No response from model");
			return;
		}

		const output = zOutputSchema.safeParse(JSON.parse(data));
		if (!output.success) {
			reminderLogger.error(`Error parsing output ${output.error}`);
			return;
		}
		if (!output.data.length) return;

		this.state = schema.parse({});
		this.state.items = output.data;

		for (const action of this.state.items) {
			const transport = this.transports.find((v) =>
				action.type === "todo"
					? v instanceof FSDelivery
					: v instanceof DiscordDelivery,
			);
			if (!transport) continue;

			await transport.deliver(action.content, todayFilename);
		}
	}

	private getTodoFilename(date: DateTime): string {
		return `todo-${date.toFormat("dd.MM")}.md`;
	}

	private async findTodoFile(date: DateTime): Promise<string | undefined> {
		const filepath = `${TODO_DIR}${this.getTodoFilename(date)}`;
		const file = Bun.file(filepath);
		return (await file.exists()) ? filepath : undefined;
	}
}
const fsDelivery = new FSDelivery(TODO_DIR, "markdown");
const discordDelivery = new DiscordDelivery(
	Config.DISCORD_REMINDER_WEBHOOK ?? "",
	"markdown",
);
const runner = new CodexRunner();

const reminder = new ReminderTask([fsDelivery, discordDelivery], runner);

// (async () => {
// 	await reminder.run();
// })();

export default {
	task: reminder,
} satisfies TaskModule;
