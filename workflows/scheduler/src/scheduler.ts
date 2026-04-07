import { sleep } from "bun";
import type { ExecutionHistory, Task } from "./database";
import { withDatabase } from "./database";
import { schedulerLogger } from "./logger";

const INTERVAL_MS = 5000;

const computeNextExecution = (task: Task, from: Date): string | null => {
	const next = Bun.cron.parse(task.cron, from);

	if (!next) {
		schedulerLogger.error(
			`Task '${task.id}' has no future cron occurrence: '${task.cron}'`,
		);
		return null;
	}

	return next.toISOString();
};

const executeTask = async (task: Task): Promise<boolean> => {
	schedulerLogger.info(`Executing task '${task.id}' (${task.name})`);

	const proc = Bun.spawn({
		cmd: ["/bin/sh", "-lc", task.command],
		stdout: "pipe",
		stderr: "pipe",
	});

	const [exitCode, stdout, stderr] = await Promise.all([
		proc.exited,
		new Response(proc.stdout).text(),
		new Response(proc.stderr).text(),
	]);

	if (stdout.trim()) {
		schedulerLogger.debug(`Task '${task.id}' stdout: ${stdout.trim()}`);
	}

	if (stderr.trim()) {
		schedulerLogger.warn(`Task '${task.id}' stderr: ${stderr.trim()}`);
	}

	if (exitCode !== 0) {
		schedulerLogger.error(
			`Task '${task.id}' failed with exit code ${exitCode}`,
		);
		return false;
	}

	schedulerLogger.info(`Task '${task.id}' completed successfully`);
	return true;
};

async function schedulerLoop(cb: () => Promise<void>, signal: AbortSignal) {
	while (!signal.aborted) {
		const startedAt = Date.now();

		try {
			await cb();
		} catch (error) {
			schedulerLogger.error(`Scheduler tick failed: ${error}`);
		}

		const elapsed = Date.now() - startedAt;
		const wait = Math.max(0, INTERVAL_MS - elapsed);
		await sleep(wait);
	}
}

const scheduleUninitializedTasks = async (now: Date) => {
	const tasks = await withDatabase("scheduler-list-tasks", (db) =>
		db.listTasks(),
	);

	for (const task of tasks) {
		if (!task.enabled || task.next_execution) {
			continue;
		}

		const nextExecution = computeNextExecution(task, now);

		if (!nextExecution) {
			continue;
		}

		await withDatabase("scheduler-schedule-task", (db) =>
			db.scheduleTask(task.id, null, nextExecution),
		);
	}
};

const processDueTasks = async (now: Date) => {
	const nowIso = now.toISOString();
	const dueTasks = await withDatabase("scheduler-list-due-tasks", (db) =>
		db.listDueTasks(nowIso),
	);

	if (dueTasks.length === 0) {
		return;
	}

	schedulerLogger.info(`Found ${dueTasks.length} due task(s)`);

	for (const task of dueTasks) {
		const claimed = await withDatabase("scheduler-claim-task", (db) =>
			db.claimTask(task.id, task.next_execution),
		);

		if (!claimed) {
			schedulerLogger.debug(`Task '${task.id}' was claimed by another worker`);
			continue;
		}

		const executionTime = new Date();
		const executionIso = executionTime.toISOString();
		let success = false;

		try {
			success = await executeTask(task);
		} catch (error) {
			schedulerLogger.error(
				`Task '${task.id}' crashed during execution: ${error}`,
			);
		}

		const nextExecution = computeNextExecution(task, executionTime);
		const history: ExecutionHistory = {
			id: crypto.randomUUID(),
			task_id: task.id,
			execution_date: executionIso,
			success: success ? 1 : 0,
		};

		await withDatabase("scheduler-mark-task-result", (db) =>
			db.markTaskResult({
				history,
				lastExecution: executionIso,
				nextExecution,
			}),
		);
	}
};

export const runSchedulerLoop = async () => {
	const controller = new AbortController();
	const stop = () => {
		if (!controller.signal.aborted) {
			schedulerLogger.info("Shutdown signal received, stopping scheduler loop");
			controller.abort();
		}
	};

	process.on("SIGINT", stop);
	process.on("SIGTERM", stop);

	schedulerLogger.info("Scheduler initialized, starting event loop");

	try {
		await schedulerLoop(async () => {
			const now = new Date();
			await scheduleUninitializedTasks(now);
			await processDueTasks(now);
		}, controller.signal);
	} finally {
		process.off("SIGINT", stop);
		process.off("SIGTERM", stop);
		schedulerLogger.info("Scheduler loop stopped");
	}
};
