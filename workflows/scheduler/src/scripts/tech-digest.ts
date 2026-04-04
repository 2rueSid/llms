import { createOpencode } from "@opencode-ai/sdk/v2";
import { fetchPosts, fetchPostsForTopics } from "./fetch-hackernews";

const { client } = await createOpencode();

export async function techDigest() {
	const session = await client.session.create();

	const sessionId = session.data?.id;

	if (!sessionId) throw new Error("session id is not defined");

	const data = await getHackernews();

	const event = await client.event.subscribe();

	const response = await client.session.prompt({
		sessionID: sessionId,

		model: {
			providerID: "openai",
			modelID: "gpt-5.4",
		},
		format: {
			type: "json_schema",
			schema: { markdown: "string" },
			retryCount: 5,
		},
		agent: "",
		parts: [
			{
				type: "text",
				text: "Use tech-digest skill to create a tech digest based on the input JSON",
			},
			{
				type: "text",
				text: JSON.stringify(data),
			},
		],
	});

	console.log(response.data?.info.structured);
	console.log("\n\n\n\n");

	console.log(response.data?.info);
}

async function getHackernews() {
	const topics = ["Rust", "AWS", "Ukraine", "Drones", "Miltech"];
	const oneDayAgo = Math.floor(Date.now() / 1000) - 60 * 60 * 24;

	const limitPerTopic = 5;

	const storiesPerTopic = await fetchPostsForTopics(
		"story",
		topics,
		oneDayAgo,
		limitPerTopic,
	);
	const showcasesPerTopic = await fetchPostsForTopics(
		"show_hn",
		topics,
		oneDayAgo,
		limitPerTopic,
	);
	const mostPopularStories = await fetchPosts(
		"story",
		undefined,
		oneDayAgo,
		15,
	);
	const mostPopularShowcases = await fetchPosts(
		"show_hn",
		undefined,
		oneDayAgo,
		15,
	);

	return {
		storiesPerTopic,
		showcasesPerTopic,
		mostPopularShowcases,
		mostPopularStories,
	};
}
