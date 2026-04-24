# agentic-setup

Personal Agent Harness configuration: skills, agents, and autonomous workflows.

---

## Skills

| Skill                      | Description                                                                                                                           |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `skill-creator`            | Create, iterate, and benchmark new skills. Runs evals, helps analyze quality, and guides you through the draft → test → improve loop. |
| `template-skill`           | Starter template for authoring new skills.                                                                                            |
| `create-gh-project-ticket` | _(in progress)_ Create GitHub project tickets.                                                                                        |
| `ask-my-notes`             | _(in progress)_ Query personal notes.                                                                                                 |

Skills from the `anthropics/skills` registry are tracked in `skills-lock.json`.

---

## Agents

Custom sub-agent definitions in `agents/`:

- **`plan-in-obsidian`** — Plans and writes structured notes into Obsidian.
- **`cv-helper`** — Assists with CV/resume editing and tailoring.

---

## Workflows

### `workflows/scheduler/`

A cron-based task scheduler built on [Bun](https://bun.sh). It runs an event loop that polls a SQLite database for due tasks and executes each one in an isolated Bun Worker.

**Architecture:**

- **Database** — SQLite stores task definitions (`id`, `name`, `worker_path`, `cron`, `enabled`, `next_execution`, `last_execution`) and an execution history log.
- **Scheduler loop** — Ticks on a configurable interval, claims due tasks atomically, spawns a Worker per task, enforces a per-task timeout, and records success/failure + the next scheduled run.
- **CLI** (`bun run scheduler`) — Manage tasks via subcommands: `add-task`, `list-tasks`, `list-history`, `delete-task`, `toggle-task`, `loop`.

**Built-in tasks:**

| Task          | Schedule | What it does                                                                                                                                                                    |
| ------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `reminder`    | Periodic | Reads today's todo file, calls an LLM with a reminder skill, and delivers action items to Discord and the filesystem. Carries over unfinished items from yesterday.             |
| `tech-digest` | Periodic | Fetches top Hacker News stories and relevant Gmail threads, passes them to an LLM with a digest skill, and delivers a formatted Markdown summary to Discord and the filesystem. |
