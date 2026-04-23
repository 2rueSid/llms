import { fetch } from "bun";
import * as cheerio from "cheerio";

type Metadata = {
	title: string;
	description: string;
};
const processedUrls = new Map() as Map<string, Metadata>;

export async function getMetadata(url: string): Promise<Metadata> {
	try {
		if (!URL.canParse(url)) throw new Error("URL Is invalid \t" + url);

		if (processedUrls.has(url)) {
			return processedUrls.get(url) as Metadata;
		}

		// Fetch the HTML content of the URL
		const response = await fetch(url);
		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`);
		}
		const html = await response.text();

		const $ = cheerio.load(html);

		// Extract metadata
		const metadata = {
			title: $("title").first().text().trim() || "",
			description:
				$('meta[name="description"]').attr("content") ||
				$('meta[property="og:description"]').attr("content") ||
				"",
		};

		processedUrls.set(url, metadata);

		return metadata;
	} catch (error) {
		console.error("Error fetching metadata:", error);
		return {
			title: "",
			description: "",
		};
	}
}
