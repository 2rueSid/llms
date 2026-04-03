// import { command, exec } from "./cli";
//
// command(
// 	"create",
// 	async ({ schedule, path, action }) => {
// 		try {
// 			if (!Bun.cron.parse(schedule)) throw "";
// 		} catch {
// 			throw new Error("Schedule cron expression is invalid");
// 		}
//
// 		await Bun.cron(path, schedule, action);
// 	},
// 	[
// 		{
// 			name: "schedule",
// 			short: "s",
// 			description: "Valid cron schedule expression",
// 		},
// 		{
// 			name: "path",
// 			short: "p",
// 			description: "Path to the file that contains code to schedule",
// 		},
// 		{
// 			name: "action",
// 			short: "a",
// 			description:
// 				"name of the action to schedule. It will be used as a schedule id.",
// 		},
// 	] as const,
// );
//
// command("list", async () => {});
//
// (async () => {
// 	await exec();

import { fetchPosts, fetchPostsForTopics } from "./scripts/fetch-hackernews";
import { techDigest } from "./scripts/tech-digest";

// })();
(async () => {
	await techDigest();
})();
