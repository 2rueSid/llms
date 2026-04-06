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
- If `url` is null, render the title as plain text (no link).
- Prefer `topic` when present; otherwise group under `General`.

## Output Contract

Return one Markdown document only. The output must be deterministic and use this section order:

1. Top Stories by Topic
2. Top Showcases by Topic
3. Most Popular Showcases
4. Most Popular Stories
5. Quick Stats

## Rendering Style

Make the digest eye-catching but still clean:

- Use emojis in headings and in selective body text where it improves readability (not only titles).
- Use short section intros with friendly cues (for example: "What is trending right now", "Worth a quick read", "Builder spotlight").
- Use compact bullet entries for each post with:
  - title (linked when URL exists),
  - metadata line (author, points, comments, age/topic),
  - one-line summary.
- Keep summaries concise and factual.
- Use clear empty-state lines for empty buckets/topics.

## Summarization Rules

- Do not fetch, crawl, or inspect external URLs.
- Summarize using only provided data.
- Summary source priority:
  1. `metaDescription`
  2. `metaTitle` + `title`
  3. `title` + available metadata (`topic`, `points`, `comments`)
- Never invent implementation details not present in the payload.

## De-duplication

- Avoid rendering the same post multiple times when sections overlap.
- Use `id` as the primary dedupe key.
- If `id` is missing, fallback key is `title + author + createdAtUnix`.

## Quality Checklist

- All 5 sections are present and in fixed order.
- Every rendered item has title, metadata, and a one-line summary.
- No external fetch is used.
- Emoji usage improves scanability in both headings and body copy.
- Empty states are explicit and friendly.

## References

- `references/input-output-exampl.md`

**!!!CRITICAL -- RETURN A VALID MARKDOWN DOCUMENT!!!!!**
