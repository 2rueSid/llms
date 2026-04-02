// import { createOpencode } from "@opencode-ai/sdk";
//
// const { client, server } = await createOpencode({
// 	config: {
// 		model: "openai/gpt-5.4",
// 	},
// });
//
// const session = await client.session.create();
//
// const sessionid = session.data?.id;
//
// const res = await client.session.prompt({
// 	path: { id: sessionid },
// 	body: {
// 		agent: "build",
// 		parts: [{ type: "text", text: "what skills do you have?" }],
// 		system: "",
// 	},
// });
//
// console.log(res.data);
//
// // server.close();
//
//v
// import { parseArguments } from "./cli";
//
// const test = () => {
// 	const args = parseArguments(
// 		[
// 			{
// 				name: "cron",
// 				short: "c",
// 				description: "Valid cron expression",
// 			},
// 		],
// 		Bun.argv,
// 	);
// 	console.log(args);
// };
//
// test();
//

import { command, exec } from "./cli";

command(
	"create",
	async ({ schedule, path, action }) => {
		try {
			if (!Bun.cron.parse(schedule)) throw "";
		} catch {
			throw new Error("Schedule cron expression is invalid");
		}

		await Bun.cron(path, schedule, action);
	},
	[
		{
			name: "schedule",
			short: "s",
			description: "Valid cron schedule expression",
		},
		{
			name: "path",
			short: "p",
			description: "Path to the file that contains code to schedule",
		},
		{
			name: "action",
			short: "a",
			description:
				"name of the action to schedule. It will be used as a schedule id.",
		},
	] as const,
);

command("list", async () => {});

(async () => {
	await exec();
})();
