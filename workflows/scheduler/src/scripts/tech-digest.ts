import { createOpencodeClient } from "@opencode-ai/sdk/v2";
import { fetchPosts, fetchPostsForTopics } from "./fetch-hackernews";

const client = createOpencodeClient();

export async function techDigest() {
	const {
		storiesPerTopic,
		showcasesPerTopic,
		mostPopularShowcases,
		mostPopularStories,
	} = await getHackernews();

	// const session = await client.session.create();
	// const sessionId = session.data?.id;
	//
	// if (!sessionId) throw new Error("session id is not defined");
	// const response = await client.session.promptAsync({
	// 	sessionID: sessionId,
	//
	// 	model: {
	// 		providerID: "openai",
	// 		modelID: "gpt-5.4",
	// 	},
	// 	format: {
	// 		type: "json_schema",
	// 		schema: {},
	// 		retryCount: 5,
	// 	},
	// 	agent: "",
	// 	parts: [],
	// });
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
