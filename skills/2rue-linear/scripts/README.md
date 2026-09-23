# 2rue-linear

Run from this skill's root directory through Devbox:

```sh
devbox run setup
devbox run linear -- projects-list
devbox run linear -- tickets-list --project "$PROJECT_ID"
```

The CLI uses `@linear/sdk` and the local `bunicl` checkout declared in
`package.json` (`../../../../bunicl` relative to this directory).
SecretSpec supplies `LINEAR_API_TOKEN` from the configured 1Password item.
Do not put the token in source files or command arguments.

See [the agent skill](../SKILL.md) for prerequisites, all six commands,
pagination, output formats, and mutation safety.

## Development

These checks need no Linear credentials and make no requests to Linear:

```sh
devbox run typecheck
devbox run test
devbox run -- bun run scripts/index.ts --help
```

The regression test uses the real SDK against a local HTTP fixture to verify
that cross-project get, edit, and delete are refused without a mutation.
