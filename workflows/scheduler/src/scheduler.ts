import { sleep } from "bun";
import type { ExecutionHistory, Task } from "./database";
import { withDatabase } from "./database";
import { schedulerLogger } from "./logger";

const INTERVAL_MS = 1000 * 60; // every minute
const TASK_TIMEOUT = 1000 * 60 * 10; // 10 minutes
const RunningTasks = new Map<string, Promise<void>>();

export async function runSchedulerLoop() {
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
		while (!controller.signal.aborted) {
			const startedMs = Date.now();
			const startedAt = new Date();

			try {
				await processDueTasks(startedAt, controller.signal);
			} catch (error) {
				schedulerLogger.error(`Scheduler tick failed: ${error}`);
			}

			const elapsed = Date.now() - startedMs;
			const wait = Math.max(0, INTERVAL_MS - elapsed);
			await sleep(wait);
		}
	} finally {
		process.off("SIGINT", stop);
		process.off("SIGTERM", stop);

		await Promise.allSettled([...RunningTasks.values()]);

		schedulerLogger.info("Scheduler loop stopped");
	}
}

const processDueTasks = async (now: Date, signal: AbortSignal) => {
	const nowIso = now.toISOString();
	const dueTasks = await withDatabase("scheduler-list-due-tasks", (db) =>
		db.listDueTasks(nowIso),
	);

	if (dueTasks.length === 0) return;

	schedulerLogger.info(`Found ${dueTasks.length} due task(s)`);

	for (const task of dueTasks) {
		if (RunningTasks.has(task.id)) continue;

		const claimed = await withDatabase("scheduler-claim-task", (db) =>
			db.claimTask(task.id, task.next_execution),
		);

		if (!claimed) {
			schedulerLogger.debug(`Task '${task.id}' was claimed by another worker`);
			continue;
		}

		const promise = runClaimedTask(task, signal)
			.catch((error) => {
				schedulerLogger.error(
					`Task '${task.id}' failed unexpectedly: ${error}`,
				);
			})
			.finally(() => {
				RunningTasks.delete(task.id);
			});

		RunningTasks.set(task.id, promise);
	}
};

async function runClaimedTask(task: Task, signal: AbortSignal): Promise<void> {
	const executionTime = new Date();
	const executionIso = executionTime.toISOString();
	let success = false;

	try {
		success = await executeTask(task, signal);
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

async function executeTask(task: Task, signal: AbortSignal): Promise<boolean> {
	schedulerLogger.info(`Executing task '${task.id}' (${task.name})`);

	const proc = Bun.spawn({
		cmd: ["/bin/sh", "-lc", task.command],
		stdout: "pipe",
		stderr: "pipe",
		signal,
		timeout: TASK_TIMEOUT,
	});

	const [exitCode, stdout, stderr] = await Promise.all([
		proc.exited,
		proc.stdout.text(),
		proc.stderr.text(),
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
}

function computeNextExecution(task: Task, from: Date): string | null {
	const next = Bun.cron.parse(task.cron, from);

	if (!next) {
		schedulerLogger.error(
			`Task '${task.id}' has no future cron occurrence: '${task.cron}'`,
		);
		return null;
	}

	return next.toISOString();
}
