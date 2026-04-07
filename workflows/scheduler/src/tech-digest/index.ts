import { streamResponse } from "../codex";
import { type Delivery, FSDelivery } from "../delivery";
import { initLogger, techDigestLogger } from "../logger";
import { fetchPosts, fetchPostsForTopics } from "./fetch-hackernews";

export async function techDigest(delivery: Delivery) {
	const hnData = await getHackernews();

	const totalLen = Object.values(hnData).reduce(
		(acc, v) => acc + v?.length || 0,
		0,
	);

	console.log(hnData);

	if (!totalLen) {
		techDigestLogger.warning("No news found from Hacker News");
		return;
	}

	techDigestLogger.info(`Total articles to process: ${totalLen}`);

	techDigestLogger.info(
		`Tech Digest Data: mostPopularShowcases: ${hnData.mostPopularShowcases.length}; mostPopularStories: ${hnData.mostPopularStories.length}; showcasesPerTopic: ${hnData.showcasesPerTopic.length}; storiesPerTopic: ${hnData.storiesPerTopic.length}`,
	);

	const { data } = await streamResponse([
		{ type: "text", text: "use tech-digest SKILL to create a tech-digest" },
		{ type: "text", text: JSON.stringify(hnData) },
		// {
		// 	type: "text",
		// 	text: "use send notification skill with skip frontmost flag set to true to send me a system notification, that operation is completed",
		// },
	]);

	if (!data) {
		techDigestLogger.warning("No digest content returned from model");
		return;
	}

	techDigestLogger.info(`Digest generated: ${data.length} characters`);

	const outputName = `tech-digest-${new Date().toISOString().slice(0, 10)}`;
	const delivered = await delivery.deliver(data, outputName);

	if (!delivered) {
		techDigestLogger.error("Failed to write digest to destination");
		return;
	}

	techDigestLogger.info(`Data is stored as ${outputName}.md`);
}

async function getHackernews() {
	const topics = ["Rust", "War", "AWS", "Ukraine", "Drones", "Miltech"];

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
		20,
	);

	const mostPopularShowcases = await fetchPosts(
		"show_hn",
		undefined,
		oneDayAgo,
		20,
	);

	return {
		storiesPerTopic,
		showcasesPerTopic,
		mostPopularShowcases,
		mostPopularStories,
	};
}

(async () => {
	await initLogger();

	const delivery = new FSDelivery(
		"/Users/2ruesid/workbench/notes/tech-digest",
		"markdown",
	);

	await techDigest(delivery);
})();
