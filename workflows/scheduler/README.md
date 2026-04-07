# scheduler

To install dependencies:

```bash
bun install
```

To run:

```bash
bun run index.ts
```

This project was created using `bun init` in bun v1.3.10. [Bun](https://bun.com) is a fast all-in-one JavaScript runtime.

---

bun run src/index.ts add-task --name tech-digest --command "bun run src/tech-digest/index.ts" --cron "_/5 _ \* \* \*"

---

future:
add PM2 support or other daemon manager
