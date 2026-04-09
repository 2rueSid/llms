# Reminder Skill Dry-Run Fixtures

Use these fixtures to validate parsing, gating, tone, and output shape.

---

## Fixture 1: Todo-creation — no yesterday file

Input:

```json
{
  "timezone": "Europe/Kyiv",
  "now": "2026-04-09T08:00:00+03:00",
  "create": true
}
```

Expected:

- One `todo` action with today's file from template only (no carryover), date set to `Thursday April 9`.
- One `reminder` action with a friendly nudge to fill in the new todo.

---

## Fixture 2: Todo-creation — with yesterday's file (partial completion)

Input:

```json
{
  "timezone": "Europe/Kyiv",
  "now": "2026-04-09T08:00:00+03:00",
  "create": true,
  "todo": "# Wednesday April 8\n\n- [x] water plants\n- [ ] message brother # dont forget\n- [x] answer emails\n"
}
```

Expected:

- One `todo` action carrying over only `- [ ] message brother # dont forget`.
- Completed tasks are NOT carried over.
- One `reminder` action nudging user to review and fill in today's todo.

---

## Fixture 3: Reminder mode — unfilled todo (template shell, no real tasks)

Input:

```json
{
  "timezone": "Europe/Kyiv",
  "now": "2026-04-09T10:00:00+03:00",
  "create": false,
  "todo": "# Thursday April 9\n\n- [ ] task one # remind later today\n- [x] completed task\n\n---\n\n<Space for Notes>\n"
}
```

Expected:

- Detect that this is the unmodified template (placeholder tasks like "task one").
- One `reminder` action nudging the user to fill in today's todo.
- No `todo` action.

---

## Fixture 4: Reminder mode — early suppression for normal deadline

Input:

```json
{
  "timezone": "Europe/Kyiv",
  "now": "2026-04-09T12:00:00+03:00",
  "create": false,
  "todo": "# Thursday April 9\n\n- [ ] plant flowers # by 9pm\n"
}
```

Expected:

- No reminder action yet (deadline is later and no strong importance cue).

---

## Fixture 5: Reminder mode — repeated reminders for important deadline

Input:

```json
{
  "timezone": "Europe/Kyiv",
  "now": "2026-04-09T18:00:00+03:00",
  "create": false,
  "todo": "# Thursday April 9\n\n- [ ] submit report # by 9pm very important\n"
}
```

Expected:

- One reminder action (active window, high importance).
- Reminder is short and urgency-aware.

---

## Fixture 6: Reminder mode — completion context final push

Input:

```json
{
  "timezone": "Europe/Kyiv",
  "now": "2026-04-09T21:00:00+03:00",
  "create": false,
  "todo": "# Thursday April 9\n\n- [x] water plants\n- [x] answer emails\n- [ ] message brother # dont forget\n"
}
```

Expected:

- One reminder action for the remaining task.
- Tone includes final-push encouragement.

---

## Fixture 7: Reminder mode — mixed-language interpretation

Input:

```json
{
  "timezone": "Europe/Kyiv",
  "now": "2026-04-09T10:00:00+03:00",
  "create": false,
  "todo": "# Thursday April 9\n\n- [ ] walk dog # вранці, very important\n- [ ] buy milk # not urgent\n"
}
```

Expected:

- Correctly infers high importance for first task and low urgency for second.
- Output language style follows mixed input naturally.

---

## Fixture 8: Reminder mode — overdue with supportive quote policy

Input:

```json
{
  "timezone": "Europe/Kyiv",
  "now": "2026-04-09T22:00:00+03:00",
  "create": false,
  "todo": "# Thursday April 9\n\n- [ ] call mom # by 6pm please do it\n"
}
```

Expected:

- Overdue reminder is concise and supportive.
- Optional quote is present only if selected with attribution.
