import { mkdir, writeFile } from "node:fs/promises";
import * as path from "node:path";
import { fetch } from "bun";
import { cliLogger } from "./logger";

export type DeliveryFormat = "markdown" | "plain";

export abstract class Delivery {
	readonly destination: string;
	readonly type: DeliveryFormat;
	readonly apiUrl?: string;

	constructor(destination: string, type: DeliveryFormat) {
		if (!destination.trim()) {
			throw new Error("Delivery destination must not be empty");
		}

		this.destination = destination;
		this.type = type;
	}

	abstract deliver(content: string, title: string): Promise<boolean>;
}

export class DiscordDelivery extends Delivery {
	override async deliver(content: string, _title: string): Promise<boolean> {
		if (!this.destination) throw new Error(`Discord API Token is not set`);

		const totalLen = content.length;
		const discordLimit = 2000;

		const chunks = [] as string[];

		for (let chunk = 0; chunk < totalLen; chunk += discordLimit) {
			chunks.push(content.slice(chunk, chunk + discordLimit));
		}

		console.log(chunks.length);
		console.log(this.destination);

		try {
			for await (const chunk of chunks) {
				await fetch(this.destination, {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						content: chunk,
					}),
				});
			}
			return true;
		} catch (err) {
			cliLogger.warning(`Error: ${err}`);

			return false;
		}
	}
}

export class FSDelivery extends Delivery {
	override async deliver(content: string, title: string): Promise<boolean> {
		const outputPath = this.getOutputPath(title);

		try {
			await mkdir(this.destination, { recursive: true });
			await writeFile(outputPath, content, "utf8");
			return true;
		} catch {
			return false;
		}
	}

	private getOutputPath(title: string): string {
		if (!title.trim()) {
			throw new Error("Delivery title must not be empty");
		}

		if (path.basename(title) !== title) {
			throw new Error("FSDelivery title must be a file name, not a path");
		}

		const expectedExtension = this.type === "markdown" ? ".md" : ".txt";
		const parsedTitle = path.parse(title);
		const fileName =
			parsedTitle.ext === expectedExtension
				? title
				: `${parsedTitle.name}${expectedExtension}`;

		return path.join(this.destination, fileName);
	}
}
