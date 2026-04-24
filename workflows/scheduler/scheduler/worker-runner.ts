declare var self: Worker;

import type { TaskModule } from "@shared/task-abs";

type WorkerInput = {
	taskId: string;
	workerPath: string;
};

self.onmessage = async (event: MessageEvent<WorkerInput>) => {
	const { workerPath } = event.data;

	try {
		const mod = (await import(workerPath)) as { default: TaskModule };
		await mod.default.task.run();
		self.postMessage({ success: true });
	} catch (error) {
		self.postMessage({ success: false, error: String(error) });
	}
};
