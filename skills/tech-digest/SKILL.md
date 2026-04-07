---
name: tech-digest
description: Create a polished, emoji-enhanced Markdown tech digest from a provided Hacker News JSON payload. Use this whenever the user wants a structured digest, newsletter-style summary, categorized HN recap, or readable topic-based report from pre-fetched post data.
---

# Tech Digest Skill

**!!!CRITICAL -- RETURN A VALID MARKDOWN DOCUMENT!!!!!**

## Purpose

Turn a structured Hacker News payload into a polished, readable Markdown tech digest that is quick to scan and pleasant to read.

## Input Contract

The skill receives one JSON object:

```json
{
  "storiesPerTopic": [HNPost],
  "showcasesPerTopic": [HNPost],
  "mostPopularShowcases": [HNPost],
  "mostPopularStories": [HNPost]
}
```

```ts
type HNPost = {
  id: string;
  title: string;
  url: string | null;
  ogUrl?: string;
  author: string;
  points: number;
  comments: number;
  createdAt: string;
  createdAtUnix: number;
  topic?: string;
  metaTitle?: string;
  metaDescription?: string;
};
```

### Input Handling Rules

- Treat missing top-level arrays as empty arrays.
- Keep input order by default; if ordering is missing/unstable, sort by points desc, comments desc, then createdAtUnix desc.
- Normalize whitespace in title/meta fields.
- Define `primaryUrl` for each post as `url ?? ogUrl`.
- Render the title as a link to `primaryUrl` when available.
- Always append a separate Hacker News link as `[post url](ogUrl)` for every rendered post.
- If `ogUrl` is missing, omit `[post url](ogUrl)` only for that post and do not invent a URL.
- Prefer `topic` when present; otherwise group under `General`.
- Build a merged topic feed from `storiesPerTopic` + `showcasesPerTopic`.
- Deduplicate merged topic items by `id`.

### Topic Relevance Guardrails

The payload can occasionally include off-topic matches for a topic query. Apply these conservative filtering rules before rendering topic buckets:

- Build a lowercase `relevanceText` from `title`, `metaTitle`, `metaDescription`, and `url`.
- Build dynamic `topicTokens` from the topic label itself (split on spaces, `/`, `-`, `_`, remove punctuation, drop trivial stopwords, keep tokens with length >= 3).
- Expand `topicTokens` with simple morphology (singular/plural, common adjective form when obvious, e.g. `ukraine` -> `ukrainian`) and acronym form when the topic appears acronym-like.
- Determine `topicMatch` by checking whether `relevanceText` contains at least one `topicTokens` value.
- If token matching is weak, apply a second pass using title+metadata meaning: keep posts that are clearly topically aligned even without literal token overlap.
- Drop a post from a topic bucket only when BOTH are true:
  1. `topicMatch` is false.
  2. The post is low-signal (`points < 20` AND `comments < 10`).
- Keep high-engagement outliers even when `topicMatch` is false to avoid over-filtering potentially relevant posts.

### Section Inclusion Rules

- Render all entries from `mostPopularShowcases` and `mostPopularStories` in a single merged section named `Most Popular on HN`.
- Merge then deduplicate by `id`.
- Do not cap the merged section to 5 or 10 items unless the input arrays themselves are that size.
- Do not remove merged-most-popular entries because they also appeared in topic sections.
- Deduplication by `id` applies to merged topic items and merged-most-popular items separately.
- For the merged-most-popular section, preserve stable ordering using points desc, comments desc, then createdAtUnix desc.

## Output Contract

Return one Markdown document only. The output must be deterministic and use this section order:

1. Top Posts by Topic
2. Most Popular on HN
3. Quick Stats

## Rendering Style

Make the digest eye-catching but still clean:

- Use emojis in headings and in selective body text where it improves readability and makes sense.
- Use short section intros with friendly cues (for example: "What is trending right now", "Worth a quick read", "Builder spotlight").
- Use compact bullet entries for each post with:
  - title (linked to `primaryUrl`),
  - one extra link line with `[post url](ogUrl)` when available,
  - metadata line (author, points, comments, topic, and source label `Story` or `Show HN` for merged topic section),
  - one-line summary.
- Keep summaries concise and factual.
- Use clear empty-state lines for empty buckets/topics.
- DON'T RENDER CATEGORY IF IT'S EMPTY.
- Avoid duplicate rendering within the same section.
- In `Top Posts by Topic`, render topic subsections and list both stories and showcases together under each topic.
- In each topic subsection, sort by points desc, comments desc, then createdAtUnix desc.
- Repetition across sections is allowed when a post appears in `Most Popular on HN`; that section is the canonical leaderboard view.
- Do not add operational/tooling status text (for example notification success/failure logs) into the digest body.

## Summarization Rules

- Do not fetch, crawl, or inspect external URLs.
- Summarize using only provided data.
- Summary source priority:
  1. `metaDescription`
  2. `metaTitle` + `title`
  3. `title` + available metadata (`topic`, `points`, `comments`)
- Never invent implementation details not present in the payload.

## Quick Stats Requirements

- Always include these counters in `Quick Stats`:
  - `Most Popular Showcases input: <input length>`
  - `Most Popular Stories input: <input length>`
  - `Most Popular on HN rendered: <rendered>/<unique merged input>`
- These counters must match the actual number of bullets rendered in the merged leaderboard section.

## References

- `references/input-output-exampl.md`

**!!!CRITICAL -- RETURN A VALID MARKDOWN DOCUMENT!!!!!**
