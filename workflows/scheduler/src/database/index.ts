import { Database } from "bun:sqlite";
import path from "node:path";
import { databaseLogger } from "../logger";
import {
	type ExecutionHistory,
	ExecutionHistory as ExecutionHistorySchema,
	type Task,
	Task as TaskSchema,
} from "./models";

type MarkTaskResultInput = {
	history: ExecutionHistory;
	lastExecution: string;
	nextExecution: string | null;
};

export * from "./models";

const DEFAULT_DB_FILE = "scheduler.db";

const getDefaultDatabasePath = () => path.join(process.cwd(), DEFAULT_DB_FILE);

const createTables = (db: Database) => {
	db.exec("PRAGMA foreign_keys = ON;");
	db.exec(`
		CREATE TABLE IF NOT EXISTS tasks (
			id TEXT PRIMARY KEY,
			name TEXT NOT NULL,
			command TEXT NOT NULL,
			enabled INTEGER NOT NULL DEFAULT 1,
			cron TEXT NOT NULL,
			next_execution TEXT,
			last_execution TEXT
		);

		CREATE TABLE IF NOT EXISTS execution_history (
			id TEXT PRIMARY KEY,
			task_id TEXT NOT NULL,
			execution_date TEXT NOT NULL,
			success INTEGER NOT NULL,
			FOREIGN KEY(task_id) REFERENCES tasks(id) ON DELETE CASCADE
		);
	`);
};

export const initDatabase = () => {
	const resolvedPath = getDefaultDatabasePath();
	databaseLogger.info(`Initializing database at ${resolvedPath}`);

	const db = new Database(resolvedPath, {
		create: true,
	});

	createTables(db);
	databaseLogger.debug("Database tables are ready");

	const addTaskStmt = db.query(
		`INSERT INTO tasks (id, name, command, enabled, cron, next_execution, last_execution)
		 VALUES (?, ?, ?, ?, ?, ?, ?)`,
	);
	const listTasksStmt = db.query(
		"SELECT id, name, command, enabled, cron, next_execution, last_execution FROM tasks",
	);
	const listExecutionHistoryStmt = db.query(
		"SELECT id, task_id, execution_date, success FROM execution_history",
	);
	const listDueTasksStmt = db.query(
		`SELECT id, name, command, enabled, cron, next_execution, last_execution
		 FROM tasks
		 WHERE enabled = 1
		   AND next_execution IS NOT NULL
		   AND next_execution <= ?
		 ORDER BY next_execution ASC`,
	);
	const addHistoryRecordStmt = db.query(
		"INSERT INTO execution_history (id, task_id, execution_date, success) VALUES (?, ?, ?, ?)",
	);
	const claimTaskStmt = db.query(
		`UPDATE tasks
		 SET next_execution = NULL
		 WHERE id = ?
		   AND enabled = 1
		   AND (
			 (? IS NULL AND next_execution IS NULL)
			 OR next_execution = ?
		   )`,
	);
	const updateTaskExecutionStmt = db.query(
		"UPDATE tasks SET last_execution = ?, next_execution = ? WHERE id = ?",
	);
	const scheduleTaskStmt = db.query(
		`UPDATE tasks
		 SET next_execution = ?
		 WHERE id = ?
		   AND enabled = 1
		   AND (
			 (? IS NULL AND next_execution IS NULL)
			 OR next_execution = ?
		   )`,
	);
	const deleteTaskStmt = db.query("DELETE FROM tasks WHERE id = ?");
	const toggleTaskStmt = db.query(
		"UPDATE tasks SET enabled = CASE WHEN enabled = 1 THEN 0 ELSE 1 END WHERE id = ?",
	);

	return {
		close: () => {
			try {
				databaseLogger.debug("Closing database connection");
				db.close(false);
				databaseLogger.info("Database connection closed");
			} catch (error) {
				databaseLogger.error(`Failed to close database connection: ${error}`);
				throw error;
			}
		},
		dbPath: resolvedPath,

		addTask: (task: Task) => {
			try {
				databaseLogger.debug(`Adding task ${task.id}`);
				addTaskStmt.run(
					task.id,
					task.name,
					task.command,
					task.enabled,
					task.cron,
					task.next_execution,
					task.last_execution,
				);
				databaseLogger.info(`Task added ${task.id}`);
			} catch (error) {
				databaseLogger.error(`Failed to add task ${task.id}: ${error}`);
				throw error;
			}
		},
		listTasks: (): Task[] => {
			try {
				databaseLogger.debug("Listing tasks");
				const rows = listTasksStmt.all() as unknown[];
				const tasks = TaskSchema.array().parse(rows);

				databaseLogger.info(`Loaded ${tasks.length} tasks`);
				return tasks;
			} catch (error) {
				databaseLogger.error(`Failed to list tasks: ${error}`);
				throw error;
			}
		},
		listExecutionHistory: (): ExecutionHistory[] => {
			try {
				databaseLogger.debug("Listing execution history");
				const rows = listExecutionHistoryStmt.all() as unknown[];
				const history = ExecutionHistorySchema.array().parse(rows);

				databaseLogger.info(
					`Loaded ${history.length} execution history records`,
				);

				return history;
			} catch (error) {
				databaseLogger.error(`Failed to list execution history: ${error}`);
				throw error;
			}
		},
		listDueTasks: (nowIso: string): Task[] => {
			try {
				databaseLogger.debug(`Listing due tasks at ${nowIso}`);
				const rows = listDueTasksStmt.all(nowIso) as unknown[];
				const tasks = TaskSchema.array().parse(rows);

				databaseLogger.info(`Loaded ${tasks.length} due tasks`);
				return tasks;
			} catch (error) {
				databaseLogger.error(`Failed to list due tasks at ${nowIso}: ${error}`);
				throw error;
			}
		},
		claimTask: (id: string, expectedNextExecution: string | null): boolean => {
			try {
				databaseLogger.debug(
					`Claiming task ${id} for next_execution ${expectedNextExecution ?? "null"}`,
				);
				const result = claimTaskStmt.run(
					id,
					expectedNextExecution,
					expectedNextExecution,
				) as { changes?: number };
				const claimed = (result.changes ?? 0) > 0;

				if (claimed) {
					databaseLogger.info(`Task claimed ${id}`);
				} else {
					databaseLogger.debug(`Task claim missed ${id}`);
				}

				return claimed;
			} catch (error) {
				databaseLogger.error(`Failed to claim task ${id}: ${error}`);
				throw error;
			}
		},
		markTaskResult: ({
			history,
			lastExecution,
			nextExecution,
		}: MarkTaskResultInput) => {
			try {
				databaseLogger.debug(
					`Marking result for task ${history.task_id} with history ${history.id}`,
				);
				db.exec("BEGIN IMMEDIATE");

				try {
					addHistoryRecordStmt.run(
						history.id,
						history.task_id,
						history.execution_date,
						history.success,
					);
					updateTaskExecutionStmt.run(
						lastExecution,
						nextExecution,
						history.task_id,
					);

					db.exec("COMMIT");
				} catch (error) {
					db.exec("ROLLBACK");
					throw error;
				}

				databaseLogger.info(
					`Marked result for task ${history.task_id} with history ${history.id}`,
				);
			} catch (error) {
				databaseLogger.error(
					`Failed to mark result for task ${history.task_id} with history ${history.id}: ${error}`,
				);
				throw error;
			}
		},
		scheduleTask: (
			id: string,
			expectedNextExecution: string | null,
			nextExecution: string,
		): boolean => {
			try {
				databaseLogger.debug(
					`Scheduling task ${id} from ${expectedNextExecution ?? "null"} to ${nextExecution}`,
				);
				const result = scheduleTaskStmt.run(
					nextExecution,
					id,
					expectedNextExecution,
					expectedNextExecution,
				) as { changes?: number };
				const scheduled = (result.changes ?? 0) > 0;

				if (scheduled) {
					databaseLogger.info(`Task scheduled ${id} for ${nextExecution}`);
				} else {
					databaseLogger.debug(`Task schedule missed ${id}`);
				}

				return scheduled;
			} catch (error) {
				databaseLogger.error(`Failed to schedule task ${id}: ${error}`);
				throw error;
			}
		},
		addHistoryRecord: (history: ExecutionHistory) => {
			try {
				databaseLogger.debug(
					`Adding history record ${history.id} for task ${history.task_id}`,
				);
				addHistoryRecordStmt.run(
					history.id,
					history.task_id,
					history.execution_date,
					history.success,
				);
				databaseLogger.info(`History record added ${history.id}`);
			} catch (error) {
				databaseLogger.error(
					`Failed to add history record ${history.id} for task ${history.task_id}: ${error}`,
				);
				throw error;
			}
		},
		deleteTask: (id: string) => {
			try {
				databaseLogger.debug(`Deleting task ${id}`);
				deleteTaskStmt.run(id);
				databaseLogger.info(`Task deleted ${id}`);
			} catch (error) {
				databaseLogger.error(`Failed to delete task ${id}: ${error}`);
				throw error;
			}
		},
		toggleTask: (id: string) => {
			try {
				databaseLogger.debug(`Toggling task ${id}`);
				toggleTaskStmt.run(id);
				databaseLogger.info(`Task toggled ${id}`);
			} catch (error) {
				databaseLogger.error(`Failed to toggle task ${id}: ${error}`);
				throw error;
			}
		},
	};
};

export const withDatabase = async <T>(
	operation: string,
	cb: (db: ReturnType<typeof initDatabase>) => Promise<T> | T,
): Promise<T> => {
	databaseLogger.debug(`Opening database for '${operation}'`);
	const db = initDatabase();

	try {
		return await cb(db);
	} finally {
		databaseLogger.debug(`Closing database for '${operation}'`);
		db.close();
	}
};
