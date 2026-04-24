import { Config } from "@shared/config";
import { schedulerLogger } from "@shared/logger";
import type { ExecutionHistory, Task } from "./database";
import { withDatabase } from "./database";

const TASK_TIMEOUT = Config.TASK_TIMEOUT;
const RunningTasks = new Map<string, Worker>();

export async function schedulerLoop() {
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

	const intervalId = setInterval(async () => {
		try {
			await processDueTasks(new Date(), controller.signal);
		} catch (error) {
			schedulerLogger.error(`Scheduler tick failed: ${error}`);
		}
	}, Config.RUN_INTERVAL);

	const { promise, resolve } = Promise.withResolvers<void>();
	controller.signal.addEventListener("abort", () => resolve(), { once: true });
	await promise;

	clearInterval(intervalId);
	for (const worker of RunningTasks.values()) worker.terminate();
	RunningTasks.clear();

	process.off("SIGINT", stop);
	process.off("SIGTERM", stop);

	schedulerLogger.info("Scheduler loop stopped");
}

const processDueTasks = async (now: Date, signal: AbortSignal) => {
	if (signal.aborted) return;

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

		runClaimedTask(task).catch((error) => {
			schedulerLogger.error(`Task '${task.id}' failed unexpectedly: ${error}`);
		});
	}
};

async function runClaimedTask(task: Task): Promise<void> {
	const executionTime = new Date();
	const executionIso = executionTime.toISOString();
	let success = false;

	try {
		success = await runTaskInWorker(task);
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

function runTaskInWorker(task: Task): Promise<boolean> {
	schedulerLogger.info(`Executing task '${task.id}' (${task.name})`);

	const worker = new Worker(new URL("./worker-runner.ts", import.meta.url));
	RunningTasks.set(task.id, worker);

	return new Promise<boolean>((resolve) => {
		const timeoutId = setTimeout(() => {
			schedulerLogger.error(
				`Task '${task.id}' timed out after ${TASK_TIMEOUT}ms`,
			);
			worker.terminate();
			RunningTasks.delete(task.id);
			resolve(false);
		}, TASK_TIMEOUT);

		worker.onmessage = (
			e: MessageEvent<{ success: boolean; error?: string }>,
		) => {
			clearTimeout(timeoutId);
			RunningTasks.delete(task.id);
			worker.terminate();

			const { success, error } = e.data;
			if (success) {
				schedulerLogger.info(`Task '${task.id}' completed successfully`);
			} else {
				schedulerLogger.error(`Task '${task.id}' failed: ${error}`);
			}
			resolve(success);
		};

		worker.onerror = (e: ErrorEvent) => {
			clearTimeout(timeoutId);
			RunningTasks.delete(task.id);
			worker.terminate();
			schedulerLogger.error(`Task '${task.id}' worker error: ${e.message}`);
			resolve(false);
		};

		worker.postMessage({ taskId: task.id, workerPath: task.worker_path });
	});
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
