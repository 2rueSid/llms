---
name: tech-digest
description: Create a polished, emoji-enhanced Markdown tech digest from a provided Hacker News JSON payload and Gmail mails. Use this whenever the user wants a structured digest, newsletter-style summary, categorized HN recap, or readable topic-based report from pre-fetched post data and email newsletters.
---

# Tech Digest Skill

**!!!! CRITICAL RETURN VALID JSON ONLY. NO OTHER SYNTAX.!!!**

```json
{
  "digest": "...",
  "gh_urls": ["https://github.com/..."]
}
```

## Purpose

Turn a structured Hacker News payload and Gmail mails into a polished, readable Markdown tech digest that is quick to scan and pleasant to read. Return the result as a JSON object containing the digest markdown and a deduplicated list of all GitHub URLs found in the input.

## Input Contract

The skill receives one JSON object:

```json
{
  "storiesPerTopic": [HNPost],
  "showcasesPerTopic": [HNPost],
  "mostPopularShowcases": [HNPost],
  "mostPopularStories": [HNPost],
  "mails": [Mail]
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

type Mail = {
  subject: string;
  body: string;
  from: string;
};
```

### Input Handling Rules

- Treat missing top-level arrays/fields as empty (arrays → `[]`, mails → `[]`).
- Keep input order by default; if ordering is missing/unstable, sort by points desc, comments desc, then createdAtUnix desc.
- Normalize whitespace in title/meta fields.
- Define `primaryUrl` for each post as `url ?? ogUrl`.
- Render the title as a link to `primaryUrl` when available.
- Always append a separate Hacker News link as `[post url](ogUrl)` for every rendered post.
- If `ogUrl` is missing, omit `[post url](ogUrl)` only for that post and do not invent a URL.
- Prefer `topic` when present; otherwise group under `General`.
- Build a merged topic feed from `storiesPerTopic` + `showcasesPerTopic`.
- Deduplicate merged topic items by `id`.

### Mail Handling Rules

- Treat `mails` as supplementary newsletter/email content alongside HN data.
- For each mail, extract the subject, sender (`from`), and body text.
- When a mail is clearly related to an existing HN topic (by keyword or subject matter overlap), include it within that topic section rather than in the standalone mail section.
- In topic sections, mail items appear after HN posts for that topic.
- If a mail item is included in a topic section, do NOT render it again in the standalone Mail News section (deduplicate by subject+from).
- In the standalone Mail News section, keep entries brief: subject as a heading, one-line summary, links extracted from the body if any, and sender.
- If a mail is in a language other than English, render it in its original language — DO NOT translate.

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

Return one valid JSON object — never raw markdown. Structure:

```json
{
  "digest": "...",
  "gh_urls": ["https://github.com/..."]
}
```

**!!!! CRITICAL RETURN VALID JSON ONLY. NO OTHER SYNTAX.!!!**

- `digest`: the full tech digest as a Markdown string (escape newlines as `\n`, quotes as `\"`).
- `gh_urls`: a deduplicated array of every GitHub URL (`https://github.com/...`) found anywhere in the input data (HN `url`, `ogUrl`, body links in mails, etc.). Order does not matter; uniqueness is required.

The `digest` markdown must be deterministic and use this section order:

1. Top Posts by Topic (with related mail items merged in)
2. Most Popular on HN
3. Mail News (mails not already rendered in a topic section)
4. Quick Stats

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
- In `Top Posts by Topic`, render topic subsections and list both stories and showcases together under each topic, followed by any related mail items.
- In each topic subsection, sort by points desc, comments desc, then createdAtUnix desc.
- Repetition across sections is allowed when a post appears in `Most Popular on HN`; that section is the canonical leaderboard view.
- Do not add operational/tooling status text (for example notification success/failure logs) into the digest body.

### Mail News Section Rendering

- Render a `## 📬 Mail News` section after `Most Popular on HN`.
- Omit the section entirely if all mails were already rendered in topic sections.
- For each mail entry:
  - Use the subject as the item heading (bold or sub-bullet header).
  - Include a brief one-line summary derived from the body.
  - If the body contains any links, include the most relevant one.
  - Include sender on a metadata line: `_From: <from>_`.
  - If the mail is not in English, keep it in its original language — do NOT translate.

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
  - `Mails input: <mails array length>`
  - `Mails rendered in topics: <count merged into topic sections>`
  - `Mails rendered in Mail News: <count rendered in standalone section>`
  - `GitHub URLs collected: <gh_urls length>`
- These counters must match the actual number of bullets rendered in the respective sections.

## GitHub URL Collection Rules

- Scan every HN post field (`url`, `ogUrl`) and every mail `body` for URLs matching `https://github.com/...`.
- Collect all such URLs into the `gh_urls` output array.
- Deduplicate by exact URL string (case-sensitive).
- Do not invent or expand URLs; only include URLs explicitly present in the input.

## References

- `references/input-output-exampl.md`

**!!!! CRITICAL RETURN VALID JSON ONLY. NO OTHER SYNTAX.!!!**

```json
{
  "digest": "...",
  "gh_urls": ["https://github.com/..."]
}
```
