---
name: reminder
description: Interpret a Markdown TODO list with freeform inline comments and return short, per-task reminder actions based on inferred intent, timing, and tone — or create today's todo file from yesterday's.
---

# Reminder Skill

**!!!! CRITICAL RETURN VALID JSON ONLY. NO OTHER SYNTAX.!!!**

Generate concise reminder actions from a simple Markdown TODO list, or create today's todo file.

## Purpose

Interpret human-style checklist items such as `- [ ] plant flowers # by 1pm sharp` and produce short reminder outputs that are timing-aware, intent-aware, and written in valid markdown.

## Input Contract

```json
{
    "timezone": "IANA timezone (recommended)",
    "now": "ISO-8601 datetime string",
    "todo": "<content depends on create flag>",
    "create": true | false
}
```

- `data.now` — required. Time anchor for all decisions.
- `data.timezone` — strongly recommended. Used for natural-language time interpretation.
- `data.create` — required boolean flag that determines the operating mode.
- `data.todo` — content depends on `create`:
  - When `create=true`: yesterday's TODO file content, or **undefined/absent** if yesterday's file does not exist yet.
  - When `create=false`: today's TODO file content. Must be present.

## Output Contract

Return a JSON array of actions in execution order.

**!!!! CRITICAL RETURN VALID JSON ONLY. NO OTHER SYNTAX.!!!**

```json
[
  { "type": "reminder", "content": "..." },
  { "type": "todo", "content": "<NEW TODO FILE MARKDOWN>" }
]
```

- One reminder action maps to one task.
- Reminder content must be short and Markdown-friendly.
- In todo-creation mode, return exactly one `todo` action and exactly one `reminder` action prompting the user to fill it.
- In reminder mode with an unfilled todo, return exactly one `reminder` action prompting the user to fill today's todo.
- Do not encode schedule or destination assumptions in output.

## Operating Modes

### Todo-Creation Mode (`create=true`)

1. Start from the template in `references/todo-template.md`.
2. Replace the date placeholder with today's date derived from `data.now` (e.g. `Thursday April 9`).
3. If `data.todo` (yesterday's content) is provided:
   - Carry over every **uncompleted** item (`- [ ]`) into today's file, preserving inline intent comments.
   - Do **not** carry over completed items (`- [x]`).
4. If `data.todo` is absent or undefined, create the file from the template only (no carryover).
5. Return exactly one `todo` action and exactly one `reminder` action.

### Reminder Mode (`create=false`)

`data.todo` must be present.

#### Unfilled todo sub-case

Before parsing tasks, check if the todo is essentially empty — all checklist items are placeholder text or there are no checklist items at all.

If the todo is unfilled: return exactly one `reminder` action nudging the user to fill it. Do **not** return a `todo` action.

#### Normal reminder sub-case

Parse today's TODO file and return `reminder` actions for qualifying tasks based on the gating rules below.

## TODO Parsing Rules

- Parse both unchecked and checked checklist items:
  - `- [ ] task text # freeform intent`
  - `- [x] completed task # freeform intent`
- Keep completed tasks in analysis for momentum/context.
- Treat text after `#` as freeform intent text; it may include time hints, urgency cues, explicit de-prioritization, or emotional framing.

> `#` is the default separator but it can also be `@`, `~`, or time hints may appear directly in the task text.

## Interpretation Strategy

1. Extract explicit cues first (time expressions, negations, urgency markers).
2. Apply adaptive semantic interpretation for ambiguous comments.
3. Assign confidence for inferred urgency/importance/timing.
4. If confidence is low, choose a gentle low-noise reminder strategy.

## Reminder Gating Rules

- Suppress early reminders for low-importance tasks with later deadlines.
- Allow repeated reminders for high-importance deadline tasks in active windows.
- For overdue tasks, emit concise supportive reminders.
- Respect explicit comments that lower urgency/importance.

## Personality

All reminder message content — tone, language, phrasing, emoji use, length — is governed by `references/personalities/black-overlord.md`. Load it and follow it strictly for every reminder and nudge generated.

## Validation Checklist

Before returning actions:

- What is `data.create`? (`true` → todo-creation mode; `false` → reminder mode)
- **Todo-creation mode:** Does the new file use the correct date? Are all uncompleted yesterday items carried over? Is there exactly one `todo` action and one `reminder` action?
- **Reminder mode (unfilled):** Is there exactly one `reminder` action nudging the user to fill it?
- **Reminder mode (normal):** Did you parse both `[ ]` and `[x]` tasks? Are reminders only for qualifying tasks? Is each reminder short and markdown-friendly?
- Are schedule/channel assumptions absent from all action content?
- Does every message match the active personality?

## References

- `references/personalities/` - personality files that govern tone and message style
- `references/dry-run-fixtures.md` - situations and examples on how to behave
- `references/todo-template.md` - todo file template used for creation

**!!!! CRITICAL RETURN VALID JSON ONLY. NO OTHER SYNTAX.!!!**
