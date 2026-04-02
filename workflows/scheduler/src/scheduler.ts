import { appendFile } from "node:fs/promises";
import path from "node:path";

const cronschedule = "*/1 * * * *"; // every minute

const testfn = () => {
	appendFile(path.join(__dirname, "test.txt"), `${Date.now()}`, "utf8");
};

const tasks = [
	{
		expression: cronschedule,
		nextRun: null,
		cb: testfn,
		previousRun: null,
		log: [],
	},
];

setInterval(() => {
	console.log("tick");
	for (const task of tasks) {
		console.log(task);

		const next = Bun.cron.parse(task.expression);

		// if the previous run is not defined - schedule a new run
		if (!task.previousRun && !task.nextRun) {
			console.log("both prev & next not defined scheduling a new run...");
			tasks[0].nextRun = next;
			continue;
		}

		// If not next run is not defined - create a next run and return
		if (!task.nextRun) {
			console.log("next run is not defined scheduling a new run...");

			tasks[0].nextRun = Bun.cron.parse(task.expression);
			continue;
		}

		// if previous run is not defined and current date is bigger than the next date -- execute
		// if current date is smaller than the next date and previous date is not defined -- return
		// if current date is bigger than the previous date && smaller than the next run -- return
		// if current date is bigger than the previous date and bigger thatn the next run -- run cb

		const now = new Date();
		console.log(now);

		if (!task.previousRun && now > task.nextRun) {
			console.log(
				"previous run is not defined and it's time to execute next run...",
			);
			setTimeout(() => {
				task.cb();
				tasks[0].previousRun = now;
				tasks[0].nextRun = Bun.cron.parse(task.expression);
				task.log.push(tasks[0]?.previousRun);
			}, 0);
		}

		if (!task.previousRun && now < task.nextRun) {
			console.log(
				"previous run is not defined and it's not yet time to execute next run...",
			);

			continue;
		}

		if (task.previousRun < now && now < task.nextRun) {
			console.log(
				"previous run is defined but it's not yet time to execute next run...",
			);

			continue;
		}

		if (task.previousRun < now && now >= task.nextRun) {
			console.log("it's time to execute task...");

			setTimeout(() => {
				task.cb();
				tasks[0].previousRun = now;
				tasks[0].nextRun = Bun.cron.parse(task.expression);
				task.log.push(tasks[0]?.previousRun);
			}, 0);
		}
	}
}, 1000); // every second
