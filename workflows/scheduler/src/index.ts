import { command, exec } from "./cli";
import { Task, withDatabase } from "./database";
import { cliLogger, initLogger } from "./logger";
import { runSchedulerLoop } from "./scheduler";

const HELP_TEXT = `Scheduler DB CLI

Commands:
  help
    Show this help output.

  add-task --name <value> --command <value> --cron <value>
    Create a task record.
    Defaults: id auto-generated, enabled=1, next_execution=null, last_execution=null.

  list-tasks
    List all task records.

  list-history
    List all execution history records.

  delete-task --id <uuid>
    Delete a task by id.

  toggle-task --id <uuid>
    Flip task enabled state by id.
`;

const print = (data: unknown) => {
	console.log(JSON.stringify(data, null, 2));
};

await initLogger();

cliLogger.info("CLI logger initialized");
cliLogger.debug(`CLI args: ${JSON.stringify(Bun.argv.slice(2))}`);

command("help", async () => {
	cliLogger.info("Showing CLI help");
	console.log(HELP_TEXT);
});

command("loop", async () => {
	await runSchedulerLoop();
});

command(
	"add-task",
	async ({ name, command: taskCommand, cron }) => {
		cliLogger.info(`Starting 'add-task' for '${name}'`);
		const taskId = crypto.randomUUID();

		await withDatabase("add-task", async (db) => {
			db.addTask(
				Task.parse({
					id: taskId,
					name,
					command: taskCommand,
					enabled: 1,
					cron,
					next_execution: Bun.cron.parse(cron)?.toISOString(),
					last_execution: null,
				}),
			);
		});

		cliLogger.info(`Task created with id '${taskId}'`);
		print({ ok: true, id: taskId });
	},
	[
		{
			name: "name",
			required: true,
			description: "Human-readable task name.",
		},
		{
			name: "command",
			required: true,
			description: "Shell command to execute for the task.",
		},
		{
			name: "cron",
			required: true,
			description: "Cron expression used by the scheduler.",
		},
	] as const,
);

command("list-tasks", async () => {
	cliLogger.info("Starting 'list-tasks'");

	const tasks = await withDatabase("list-tasks", async (db) => db.listTasks());

	cliLogger.info(`Returning ${tasks.length} tasks`);
	print(tasks);
});

command("list-history", async () => {
	cliLogger.info("Starting 'list-history'");

	const history = await withDatabase("list-history", async (db) =>
		db.listExecutionHistory(),
	);

	cliLogger.info(`Returning ${history.length} history records`);
	print(history);
});

command(
	"delete-task",
	async ({ id }) => {
		cliLogger.info(`Starting 'delete-task' for '${id}'`);

		await withDatabase("delete-task", async (db) => {
			db.deleteTask(id);
		});

		cliLogger.info(`Deleted task '${id}'`);
		print({ ok: true, id });
	},
	[
		{
			name: "id",
			required: true,
			description: "Task UUID to delete.",
		},
	] as const,
);

command(
	"toggle-task",
	async ({ id }) => {
		cliLogger.info(`Starting 'toggle-task' for '${id}'`);

		await withDatabase("toggle-task", async (db) => {
			db.toggleTask(id);
		});

		cliLogger.info(`Toggled task '${id}'`);
		print({ ok: true, id });
	},
	[
		{
			name: "id",
			required: true,
			description: "Task UUID to toggle enabled state for.",
		},
	] as const,
);

try {
	await exec();
} catch (error) {
	cliLogger.error(`CLI execution failed: ${error}`);
	throw error;
}
