## Overview

Scheduler is a workflow that runs AI tasks on schedule (duh).

For example:

> Summarize me my emails and write summary into my obsidian notes vault; do this every day on 12 PM

Let's break it down:

1. task to summarize emails and write summary
2. schedule expression "every day at 12pm", agent should parse it to the valid cron expression

The idea is pretty simple: I define a task (think about it as a skill), tell the Agent scheduler when to run it and this system should take care of the rest.

## Core Components

- notification on completion
- retry logic
- persistent storage for keeping the task data - name, description, expression, delivery method...
- nlp component to parse the human language schedule expression (9pm every day)
- delivery methods: file system (obsidian vault), discord (discord channel), telegram
- configuration parsing - 1Password integration

## Stages

### Initial task

The initial task would be to create a task that will pull my email to summarize emails and save them to my obsidian vault.
summarization includes:

- categorization
- labels
- priority ordering

it needs to support these features:

- pull emails from google
- summarize, categorize, add labels
- delivery it to obsidian vault

#### Steps

1. Initialize Opencode using Bun
2. Define a basic agent and run it programatically
3. Add ability to run agent on schedule
   scheduler should evaluate all registered agents, determine which ones are due to run, execute them, and then wait for the next tick. When multiple agents are due at the same time, they should all run - don’t let one agent’s execution block another. Agents should also have an enabled/disabled flag so you can pause an agent’s schedule without deleting it.
4. add natural language schedule parsing so users can describe when they want an agent to run in plain English instead of writing cron expressions. Expressions like “every weekday at 9am”, “every Monday at 8am”, “twice a day”, “every 3 hours”, or “the first of every month” should be parsed into the corresponding cron expression. You can use your LLM to handle this translation, or a dedicated natural language parsing library - either approach works
5. Add fallbacks, retries, error hadnling, Your agents need to handle this gracefully. Each agent should have a configurable execution timeout - if the task hasn’t completed within that time, it should be terminated cleanly. A sensible default is 60 seconds, but agents that do heavier processing might need longer.

Q: _ How system's inactive state will be handled?_

---

### Further automation

- Hackernews + TLDR mail + blogs summarization daily or weekly; process, store into the vector db and add ability to query it for further iteractions with content
- Daily todo creator - obsidian vault TODO template creator, brief of what was not completed yesterday + move them to "today"
- Awesome \* (nvim, rust, ...) parsing + summarization; process and store into the vector db for further querying
- Trivy scan weekly for repos changed last week
- Weekly notes vectorization and storing (checks git for changed/added/deleted content to see wether it needs to run and what should be vectorized)
- Add OS level notifications using Skill
