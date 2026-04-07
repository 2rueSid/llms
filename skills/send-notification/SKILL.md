---
name: send-notification
description: Send a macOS notification from the terminal when the user asks for a completion ping, desktop alert, notification on finish, or similar on-demand reminder. Use this whenever the user wants you to notify them after an agent task or coding task completes, especially when they mention macOS, Terminal, osascript, or a tiny completion summary.
---

# Send Notification

Use this skill only on demand, after the requested work is done or immediately before handing off completion.

## Goal

Send a short macOS desktop notification from the terminal with a tiny summary of what finished.

## Workflow

1. Finish the user's requested task first.
2. Write a tiny summary, ideally 3-8 words.
3. By default, check the frontmost macOS app.
4. If `Ghostty` or `Terminal` is focused, skip the notification.
5. If the user wants to force delivery while in terminal apps, add `--skip-frontmost-check`.
6. Run the bundled AppleScript from the terminal.
7. Tell the user the work is done and include the same short summary in your reply.

## Notification format

- Title: `Agent task complete`
- Body: tiny summary of the completed work
- Keep the body short enough to scan at a glance.
- Escape or simplify quotes if needed so the shell command stays valid.

## Command

Use the bundled AppleScript with `osascript`:

```bash
osascript scripts/notify_if_not_terminal.applescript "<tiny summary>"
```

Optional flag to force notification even when `Ghostty`/`Terminal` is frontmost:

```bash
osascript scripts/notify_if_not_terminal.applescript "<tiny summary>" --skip-frontmost-check
```

The frontmost app check defaults to enabled. When you pass `--skip-frontmost-check`, the script skips that check and sends the notification anyway.

## Notes

- Prefer plain ASCII in the notification text.
- If the summary is long, shorten it instead of sending a verbose message.
- The focus check is app-level, not cursor-level.
- `--skip-frontmost-check` defaults to false unless explicitly provided.
- If the notification command fails, mention that in the final reply and still provide the completion summary in chat.
