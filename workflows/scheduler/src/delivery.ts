import { mkdir, writeFile } from "node:fs/promises";
import * as path from "node:path";

export type DeliveryFormat = "markdown" | "plain";

export abstract class Delivery {
	readonly destination: string;
	readonly type: DeliveryFormat;

	protected constructor(destination: string, type: DeliveryFormat) {
		if (!destination.trim()) {
			throw new Error("Delivery destination must not be empty");
		}

		this.destination = destination;
		this.type = type;
	}

	abstract deliver(content: string, title: string): Promise<boolean>;
}

export class FSDelivery extends Delivery {
	constructor(destination: string, type: DeliveryFormat) {
		super(destination, type);
	}

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
