import { Codex, type UserInput } from "@openai/codex-sdk";
import { schedulerLogger } from "./logger";

const codex = new Codex();

interface response {
	data: string | null;
}

export async function streamResponse(input: UserInput[]): Promise<response> {
	const thread = codex.startThread();

	const { events } = await thread.runStreamed(input);

	let response: string | null = null;

	for await (const event of events) {
		if (!event) {
			continue;
		}

		schedulerLogger.debug(`New event type: ${event.type}`);
		switch (event.type) {
			case "item.completed":
				if (event.item.type === "reasoning") {
					schedulerLogger.info(`Agent Reasoning: ${event.item.text}`);
				}
				if (event.item.type === "agent_message") {
					schedulerLogger.info(`Agent message: ${event.item.text}`);

					response = event.item.text;
				}
				break;
			case "turn.completed":
				schedulerLogger.info("Request completed");
				schedulerLogger.info(`usage ${JSON.stringify(event.usage)}`);
				break;
			default:
				break;
		}
	}
	return {
		data: response,
	};
}
