// This script fetches HackerNews posts. It uses HackerNews Angolia API
// https://hn.algolia.com/api
//
//
// It fetches:
//  - stories - news, posts, what's happened in the industry ...
//  - show tab - tools showcase, things to share, new approaches ...
//  - ask - top conversations, most hot topics ...
//
// Rate limit is 10_000 requests per hour.
//

import { stringify as querystring } from "node:querystring";
import { getMetadata } from "@lib/html-page-metadata";
import { Config } from "@shared/config";
import { fetch } from "bun";

const HN_API_BASE_URL = Config.HN_API_BASE_URL;

type HNTag = "story" | "show_hn" | "ask_hn";

type HNHit = {
	objectID: string;
	title: string | null;
	url: string | null;
	author: string;
	points: number;
	num_comments: number;
	created_at: string;
	created_at_i: number;
	story_text: string | null;
};

type HNResponse = {
	hits: HNHit[];
};

type HNPost = {
	id: string;
	title: string;
	url: string | null;
	ogURL: string;
	author: string;
	points: number;
	comments: number;
	createdAt: string;
	createdAtUnix: number;
	topic?: string;
	metaTitle?: string;
	metaDescription?: string;
};

export async function getHackernews() {
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

// Sorted by relevance, then points, then number of comments
async function fetchPosts(
	tag: HNTag,
	query?: string,
	nOfDaysAgoUnix?: number,
	limit?: number,
): Promise<HNPost[]> {
	const url = queryBuilder({
		query,
		tags: tag,
		hitsPerPage: limit,
		numericFilters: `created_at_i>${nOfDaysAgoUnix}`,
	});

	const response = await fetch(url);

	if (!response.ok) {
		throw new Error(`HN API request failed with status ${response.status}`);
	}

	const data = (await response.json()) as HNResponse;
	const posts = data.hits.map((hit) => mapHitToPost(hit, query));

	await Promise.all(
		posts.map(async (post) => {
			if (!post.url) return post;

			const metadata = await getMetadata(post.url);

			post.metaDescription = metadata.description;
			post.metaTitle = metadata.title;

			return post;
		}),
	);

	return posts;
}

async function fetchPostsForTopics(
	tag: HNTag,
	topicList: readonly string[],
	nOfDaysAgoUnix?: number,
	limit?: number,
): Promise<HNPost[]> {
	const postsByTopic = (
		await Promise.all(
			topicList.map(
				async (topic) =>
					await fetchPosts(tag, topic, nOfDaysAgoUnix ?? 10, limit ?? 10),
			),
		)
	).flat();

	return deduplicateHN(postsByTopic);
}

function queryBuilder(
	params: Record<string, string | number | undefined>,
): string {
	return `${HN_API_BASE_URL}?${querystring(params)}`;
}

function mapHitToPost(hit: HNHit, topic?: string): HNPost {
	return {
		id: hit.objectID,
		title: hit.title ?? "Untitled",
		ogURL: `https://news.ycombinator.com/item?id=${hit.objectID}`,
		url: hit.url,
		author: hit.author,
		points: hit.points,
		comments: hit.num_comments,
		createdAt: hit.created_at,
		createdAtUnix: hit.created_at_i,
		topic,
	};
}

function deduplicateHN(list: HNPost[]) {
	return [...new Map(list.map((item) => [item.id, item])).values()];
}
