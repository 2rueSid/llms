import { DiscordDelivery, FSDelivery } from "@lib/delivery";
import { CodexRunner } from "@lib/llm-runner";
import { Config } from "@shared/config";
import { initLogger, techDigestLogger } from "@shared/logger";
import { Task, type TaskModule } from "@shared/task-abs";
import z from "zod";
import { getMails } from "./gmail";
import { getHackernews } from "./hackernews";

await initLogger();

const schema = z.object({
	gh_urls: z.array(z.string()).default([]),
	digest: z.string().default(""),

	notificationTitle: z.string().default(""),
	notificationBody: z.string().default(""),
});

class TechDigestTask extends Task<typeof schema> {
	override async run(): Promise<void> {
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

		console.log("sending stuff to llm");

		const { data } = await this.runner.streamResponse([
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

		console.log("got the data");

		this.state = schema.parse(JSON.parse(data));

		techDigestLogger.info(
			`Digest generated: ${this.state.digest.length} characters`,
		);

		const outputName = `tech-digest-${new Date().toISOString().slice(0, 10)}`;

		await Promise.all(
			this.transports.map(async (transport) => {
				if (!this.state?.digest) return;

				const delivered = await transport.deliver(
					this.state.digest,
					outputName,
				);

				if (!delivered) {
					techDigestLogger.error("Failed to write digest to destination");
				}
				techDigestLogger.info(`Data is stored as ${outputName}.md`);
			}),
		);

		await this.notify();
	}
}

const fsDelivery = new FSDelivery(
	Config.DIGEST_FS_DELIVERY_LOCATION,
	"markdown",
);

const discordDelivery = new DiscordDelivery(Config.DISCORD_WEBHOOK, "markdown");

const runner = new CodexRunner();

const techDigest = new TechDigestTask([fsDelivery, discordDelivery], runner);

// (async () => {
// 	await techDigest.run();
// })();

export default {
	task: techDigest,
} satisfies TaskModule;
