import * as z from "zod";

const sqliteBoolean = z.int().min(0).max(1);

export const Task = z.object({
	id: z.uuidv4(),
	name: z.string(),
	command: z.string(),
	enabled: sqliteBoolean.default(1),
	cron: z.string(),
	next_execution: z.string().datetime().nullable().default(null),
	last_execution: z.string().datetime().nullable().default(null),
});

export const ExecutionHistory = z.object({
	id: z.uuidv4(),
	task_id: z.uuidv4(),
	execution_date: z.string().datetime(),
	success: sqliteBoolean.default(1),
});

export type Task = z.infer<typeof Task>;
export type ExecutionHistory = z.infer<typeof ExecutionHistory>;
