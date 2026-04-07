import { Database } from "bun:sqlite";
import path from "node:path";
import { databaseLogger } from "../logger";
import {
	type ExecutionHistory,
	ExecutionHistory as ExecutionHistorySchema,
	type Task,
	Task as TaskSchema,
} from "./models";

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
	const addHistoryRecordStmt = db.query(
		"INSERT INTO execution_history (id, task_id, execution_date, success) VALUES (?, ?, ?, ?)",
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
