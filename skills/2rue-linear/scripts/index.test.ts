import { expect, test } from "bun:test";
import { LinearClient } from "@linear/sdk";
import { runCli } from "./index";

test("get, edit, and delete refuse a ticket from another project without writing", async () => {
	let writes = 0;
	const server = Bun.serve({
		port: 0,
		hostname: "127.0.0.1",
		async fetch(request) {
			const { query } = (await request.json()) as { query: string };
			if (/mutation\s/.test(query)) {
				writes++;
				return Response.json({ errors: [{ message: "Unexpected mutation" }] });
			}
			if (/query project\(/.test(query)) {
				return Response.json({ data: { project: { id: "selected-project" } } });
			}
			return Response.json({
				data: {
					issue: {
						id: "ticket-id",
						identifier: "ENG-123",
						project: { id: "different-project" },
						sharedAccess: { isShared: false, sharedWithUsers: [] },
						reactions: [],
					},
				},
			});
		},
	});
	const client = new LinearClient({
		apiKey: "fixture-token",
		apiUrl: server.url.toString(),
	});
	try {
		for (const command of [
			["tickets", "get"],
			["tickets", "edit", "--title", "Changed"],
			["tickets", "delete", "--yes"],
		]) {
			expect(
				await runCli(
					[...command, "--project", "selected-project", "--ticket", "ENG-123"],
					() => client,
				),
			).toBe(2);
		}
		expect(writes).toBe(0);
	} finally {
		await server.stop(true);
	}
});

test("nested commands reject missing required options before creating a client", async () => {
	let clients = 0;

	expect(
		await runCli(["tickets", "get"], () => {
			clients++;
			throw new Error("client should not be created");
		}),
	).toBe(2);
	expect(clients).toBe(0);
});
