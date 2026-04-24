# Digest Output Format

## Structure

```
# Tech Digest <Month Day>

<SHORT SUMMARY — 1-2 sentences covering the main themes>

## News by topic

### <EMOJI> <TOPIC NAME>

**[Sanitized Title](primaryUrl)**
_author · points · comments · [post](ogUrl)_
Short description (1-2 sentences from metaDescription or title+meta).

...more posts...

### <EMOJI> <TOPIC NAME>

...

## Most Popular on Hacker News

**[Sanitized Title](primaryUrl)**
_author · points · comments · [post](ogUrl)_
_labels: generated, topic, labels_
Short description.

...

## Mail Subscriptions

### <Sender Name>

**[Sanitized Title](url)**
_labels: generated, labels_
Short description.

...more items from same sender...

### <Sender Name>

...
```

## Rendering Rules

**Titles:**
- Strip submission prefixes: `Show HN:`, `Ask HN:`, `Launch HN:`, `Tell HN:`
- Remove noise/spam words unrelated to the actual topic
- Keep title concise and meaningful

**Metadata line** (italic, under each entry):
- HN posts: `_author · points · comments · [post](ogUrl)_`
  - Omit `points` entirely if value is `0`
  - Omit `comments` entirely if value is `0`
- Mail items: `_labels: label1, label2_` (generate relevant labels yourself)
- All fields optional — omit if unavailable

**Sender normalization for Mail Subscriptions headers:**
- `TLDR AI <dan@tldrnewsletter.com>` → `TLDR AI`
- `This Week in Rust <hello@this-week-in-rust.org>` → `This Week in Rust`
- Group all items from the same sender under one `###` heading

**Topic emojis** (examples — pick fitting ones):
- Rust → 🦀
- AWS → ☁️
- AI/ML → 🤖
- Security → 🔐
- Web → 🌐
- General → 📌

**Empty topics:** omit entirely — do not render empty sections.

**Descriptions:** 1-2 sentences max, factual, from provided data only. Never invent details.
