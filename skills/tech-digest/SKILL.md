---
name: tech-digest
description: Create a polished, emoji-enhanced Markdown tech digest from a provided Hacker News JSON payload and Gmail mails. Use this whenever the user wants a structured digest, newsletter-style summary, categorized HN recap, or readable topic-based report from pre-fetched post data and email newsletters.
---

# Tech Digest Skill

**CRITICAL: Return valid JSON only — no other text.**

```json
{
  "digest": "<markdown string>",
  "gh_urls": ["https://github.com/..."]
}
```

## Input

```ts
type Input = {
  storiesPerTopic: HNPost[];
  showcasesPerTopic: HNPost[];
  mostPopularShowcases: HNPost[];
  mostPopularStories: HNPost[];
  mails: Mail[];
};

type HNPost = {
  id: string;
  title: string;
  url: string | null;
  ogUrl?: string; // Hacker News item URL
  author: string;
  points: number;
  comments: number;
  createdAt: string;
  createdAtUnix: number;
  topic?: string;
  metaTitle?: string;
  metaDescription?: string;
};

type Mail = { subject: string; body: string; from: string };
```

Missing arrays → treat as `[]`.

## Processing Rules

**Global deduplication:**

- Track every rendered post `id` across all sections. Once a post is rendered, skip it in all subsequent sections. Never render the same post twice.

**Posts (topic sections):**

- Merge `storiesPerTopic` + `showcasesPerTopic`. Deduplicate by `id`. Group by `topic` (fallback: `General`).
- Sort within each topic: points desc → comments desc → createdAtUnix desc.
- `primaryUrl = url ?? ogUrl`. Render title as link; always append `[post](ogUrl)` when `ogUrl` exists.
- Filter off-topic entries only when BOTH true: no keyword match in title/meta AND low-signal (points < 20 AND comments < 10). Keep high-engagement outliers.
- **Render ALL posts that pass the filter — never truncate or cap the number of items per topic.**

**Most Popular on HN:**

- Merge `mostPopularShowcases` + `mostPopularStories`. Deduplicate by `id`. Sort: points desc.
- Skip any post whose `id` was already rendered in a topic section (global dedup).
- **Render ALL remaining posts — never truncate or cap.**

**Mails:**

- If a mail clearly overlaps a topic (keyword/subject match), render it inside that topic section — skip it in Mail Subscriptions.
- Normalize sender: extract display name from `from` field (e.g. `TLDR AI <dan@...>` → `TLDR AI`). Group items under one sender heading.
- **Parse each mail body and extract every individual article/item as a separate entry.** Each item has its own title, URL, and description. Do NOT render the newsletter itself as a single entry — render each article inside it.
- **NEVER translate content.** Keep all titles and descriptions in their original language. Do not translate Ukrainian, Russian, German, or any other non-English content — render it verbatim.
- **Render ALL items found in each mail body — never truncate or summarize to a subset.**

**Summarization:**

- Use provided data only. Priority: `metaDescription` → `metaTitle` + `title` → `title` + metadata.
- Never invent details or fetch external URLs.

**GitHub URLs:**

- Collect all `https://github.com/...` from every post field and mail body. Deduplicate exact strings.

## Output Format

See `references/digest-format.md` for the exact markdown structure and rendering rules.

Escape the digest string for JSON: newlines as `\n`, quotes as `\"`.

## References

- `references/digest-format.md` — output format and rendering rules
- `references/input-output-exampl.md` — complete input/output example

**!!!!!!!!!!!CRITICAL: Return valid JSON only — no other text.!!!!!!!!!!!!**

```json
{
  "digest": "<markdown string>",
  "gh_urls": ["https://github.com/..."]
}
```
