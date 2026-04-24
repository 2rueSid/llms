import { CodexRunner } from "@lib/llm-runner";
import { Task, type TaskModule } from "@shared/task-abs";
import z from "zod";

const schema = z.object({});

class TestTask extends Task<typeof schema> {
	override async run(): Promise<void> {
		console.log("tick");
	}
}

const runner = new CodexRunner();

const testTask = new TestTask([], runner);

export default {
	task: testTask,
} satisfies TaskModule;
