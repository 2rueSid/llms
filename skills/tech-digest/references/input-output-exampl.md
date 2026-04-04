# Input -> Output Example

## Example Input

```json
{
  "storiesPerTopic": [
    {
      "id": "420001",
      "title": "A practical guide to Rust memory profiling",
      "url": "https://example.dev/rust-memory-profiling",
      "author": "anna",
      "points": 312,
      "comments": 68,
      "createdAt": "2026-04-03T14:20:00Z",
      "createdAtUnix": 1775226000,
      "topic": "Programming",
      "metaTitle": "Rust memory profiling in production",
      "metaDescription": "A hands-on walkthrough for finding leaks and reducing peak memory in Rust services."
    },
    {
      "id": "420002",
      "title": "How teams are using local-first sync in SaaS apps",
      "url": null,
      "author": "milo",
      "points": 198,
      "comments": 41,
      "createdAt": "2026-04-03T09:00:00Z",
      "createdAtUnix": 1775206800,
      "topic": "Architecture",
      "metaTitle": "Local-first sync patterns"
    }
  ],
  "showcasesPerTopic": [
    {
      "id": "420101",
      "title": "Show HN: Terminal UI kit for data dashboards",
      "url": "https://example.dev/tui-dashboard-kit",
      "author": "jorge",
      "points": 141,
      "comments": 22,
      "createdAt": "2026-04-03T11:45:00Z",
      "createdAtUnix": 1775216700,
      "topic": "DevTools",
      "metaDescription": "Composable widgets for building keyboard-first monitoring dashboards."
    }
  ],
  "mostPopularShowcases": [
    {
      "id": "420101",
      "title": "Show HN: Terminal UI kit for data dashboards",
      "url": "https://example.dev/tui-dashboard-kit",
      "author": "jorge",
      "points": 141,
      "comments": 22,
      "createdAt": "2026-04-03T11:45:00Z",
      "createdAtUnix": 1775216700,
      "topic": "DevTools"
    },
    {
      "id": "420102",
      "title": "Show HN: Browser extension for API contract diffing",
      "url": "https://example.dev/api-diff-extension",
      "author": "nina",
      "points": 121,
      "comments": 17,
      "createdAt": "2026-04-03T08:15:00Z",
      "createdAtUnix": 1775204100,
      "topic": "Productivity",
      "metaDescription": "Highlights breaking API changes inline before deployments go live."
    }
  ],
  "mostPopularStories": [
    {
      "id": "420001",
      "title": "A practical guide to Rust memory profiling",
      "url": "https://example.dev/rust-memory-profiling",
      "author": "anna",
      "points": 312,
      "comments": 68,
      "createdAt": "2026-04-03T14:20:00Z",
      "createdAtUnix": 1775226000,
      "topic": "Programming"
    },
    {
      "id": "420003",
      "title": "What changed in modern CSS layout engines",
      "url": "https://example.dev/css-layout-engines",
      "author": "liam",
      "points": 176,
      "comments": 29,
      "createdAt": "2026-04-02T19:10:00Z",
      "createdAtUnix": 1775147400,
      "topic": "Frontend",
      "metaDescription": "A practical breakdown of engine-level behavior that affects Grid and Flex rendering."
    }
  ]
}
```

## Example Output

```markdown
# Tech Digest - Apr 4, 2026

Your quick pulse check on what the HN crowd is reading and building today. Grab a coffee and skim the highlights.

## Top Stories by Topic

Fresh ideas and deep dives worth a closer look.

### Programming
- [A practical guide to Rust memory profiling](https://example.dev/rust-memory-profiling)
  - 👤 anna | ▲ 312 | 💬 68 | 🏷️ Programming
  - 🧠 A hands-on walkthrough for finding leaks and reducing peak memory in Rust services.

### Architecture
- How teams are using local-first sync in SaaS apps
  - 👤 milo | ▲ 198 | 💬 41 | 🏷️ Architecture
  - ✨ A focused look at local-first sync patterns and where teams apply them in SaaS products.

## Top Showcases by Topic

Builder spotlight: practical tools people shipped this week.

### DevTools
- [Show HN: Terminal UI kit for data dashboards](https://example.dev/tui-dashboard-kit)
  - 👤 jorge | ▲ 141 | 💬 22 | 🏷️ DevTools
  - 🛠️ Composable widgets for building keyboard-first monitoring dashboards.

## Most Popular Showcases

Momentum picks with strong community engagement.

- [Show HN: Browser extension for API contract diffing](https://example.dev/api-diff-extension)
  - 👤 nina | ▲ 121 | 💬 17 | 🏷️ Productivity
  - 🚦 Highlights breaking API changes inline before deployments go live.

## Most Popular Stories

Big conversations and broadly useful reads.

- [What changed in modern CSS layout engines](https://example.dev/css-layout-engines)
  - 👤 liam | ▲ 176 | 💬 29 | 🏷️ Frontend
  - 🎯 A practical breakdown of engine-level behavior that affects Grid and Flex rendering.

## Quick Stats

- 📌 Total stories considered: 4
- 🧰 Total showcases considered: 3
- 🔥 Highest score: 312 points
- 💬 Most discussed: 68 comments
```

## Notes

- Duplicate posts are not repeated across sections in the final digest.
- Summaries are created from the payload fields only (`metaDescription`, `metaTitle`, `title`, and metadata).
- No external URL fetch is used.
