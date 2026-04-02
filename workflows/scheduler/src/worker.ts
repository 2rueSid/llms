import { appendFile } from "node:fs/promises";
import path from "node:path";

export default {
	scheduled(controller: Bun.CronController) {
		appendFile(path.join(__dirname, "test.txt"), `${Date.now()}`, "utf8");
	},
};
