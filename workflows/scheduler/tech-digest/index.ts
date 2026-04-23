import { streamResponse } from "@lib/codex";
import { type Delivery, DiscordDelivery, FSDelivery } from "@lib/delivery";
import { Config } from "@shared/config";
import { initLogger, techDigestLogger } from "@shared/logger";
import z from "zod";
import { getMails } from "./gmail";
import { fetchPosts, fetchPostsForTopics } from "./hackernews";

const outputSchema = z.object({
	gh_urls: z.array(z.string()),
	digest: z.string(),
});

export async function techDigest(delivery: Delivery[]) {
	const hnData = await getHackernews();
	const mailData = await getMails();

	const totalLenHN = Object.values(hnData).reduce(
		(acc, v) => acc + v?.length || 0,
		0,
	);
	const totalLenMail = mailData.length;

	if (!totalLenHN && !totalLenMail) {
		techDigestLogger.warning("No news found from Hacker News");
		techDigestLogger.warning("No mails found by that query");
		return;
	}

	techDigestLogger.info(`Total articles to process: ${totalLenHN}`);
	techDigestLogger.info(`Total Mail to process ${mailData}`);

	techDigestLogger.info(
		`Tech Digest Data: mostPopularShowcases: ${hnData.mostPopularShowcases.length}; mostPopularStories: ${hnData.mostPopularStories.length}; showcasesPerTopic: ${hnData.showcasesPerTopic.length}; storiesPerTopic: ${hnData.storiesPerTopic.length}`,
	);

	const { data } = await streamResponse([
		{
			type: "text",
			text: `use ${Config.TECH_DIGEST_SKILL_NAME} SKILL to create a tech-digest. RETURN A VALID JSON ONLY`,
		},
		{
			type: "text",
			text: JSON.stringify({ ...hnData, mails: mailData }),
		},
	]);

	if (!data) {
		techDigestLogger.warning("No digest content returned from model");
		return;
	}

	console.log(data);
	const parsedData = outputSchema.parse(JSON.parse(data));

	techDigestLogger.info(
		`Digest generated: ${parsedData.digest.length} characters`,
	);

	for await (const transport of delivery) {
		const outputName = `tech-digest-${new Date().toISOString().slice(0, 10)}`;
		const delivered = await transport.deliver(parsedData.digest, outputName);
		if (!delivered) {
			techDigestLogger.error("Failed to write digest to destination");
			continue;
		}
		techDigestLogger.info(`Data is stored as ${outputName}.md`);
	}
}

async function getHackernews() {
	const topics = Config.DIGEST_TOPICS;

	const oneDayAgo = Math.floor(Date.now() / 1000) - 60 * 60 * 24;

	const limitPerTopic = Config.LIMIT_PER_TOPIC;
	const limitPerCategory = Config.LIMIT_PER_CATEGORY;

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
		limitPerCategory,
	);

	const mostPopularShowcases = await fetchPosts(
		"show_hn",
		undefined,
		oneDayAgo,
		limitPerCategory,
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

	const fsDelivery = new FSDelivery(
		Config.DIGEST_FS_DELIVERY_LOCATION,
		"markdown",
	);

	const discordDelivery = new DiscordDelivery(
		Config.DISCORD_WEBHOOK,
		"markdown",
	);

	await techDigest([fsDelivery, discordDelivery]);
})();
