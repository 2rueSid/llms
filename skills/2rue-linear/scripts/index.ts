import {
  type Connection,
  type Issue,
  LinearClient,
  LinearError,
  type LinearDocument,
} from "@linear/sdk";
import { createCli } from "bunicl";

class InputError extends Error {}

function nonempty(value: string, option: string): string {
  if (!value.trim()) throw new InputError(`${option} must not be empty.`);
  return value;
}

function noPositionals(positionals: string[]): void {
  if (positionals.length) {
    throw new InputError(
      "Positional arguments are not supported. Use named options; see --help.",
    );
  }
}

function clientFromEnvironment(): LinearClient {
  const apiKey = Bun.env.LINEAR_API_TOKEN;
  if (!apiKey?.trim()) {
    throw new Error(
      "LINEAR_API_TOKEN is missing. Run through devbox run linear so SecretSpec can supply it.",
    );
  }
  return new LinearClient({ apiKey });
}

function print(value: unknown): void {
  console.log(JSON.stringify(value, null, 2));
}

async function allNodes<T>(connection: Connection<T>): Promise<T[]> {
  while (connection.pageInfo.hasNextPage) await connection.fetchNext();
  return connection.nodes;
}

const projectOption = {
  name: "project",
  description: "Project UUID from projects-list",
  required: true,
} as const;
const ticketOption = {
  name: "ticket",
  description: "Ticket identifier (ENG-123) or UUID",
  required: true,
} as const;
const paginationOptions = [
  { name: "limit", description: "Page size, 1–100", default: "50" },
  { name: "after", description: "endCursor from the previous page" },
  {
    name: "include-archived",
    type: "boolean",
    description: "Include archived results",
  },
] as const;
const editOptions = [
  {
    name: "description",
    description: "Markdown description; empty string clears it",
  },
  {
    name: "description-file",
    description: "Read Markdown description from a UTF-8 file",
  },
  {
    name: "priority",
    description: "0 none, 1 urgent, 2 high, 3 medium, 4 low",
  },
  {
    name: "state",
    description: "Exact workflow state name or UUID from the ticket's team",
  },
] as const;

type PageOptions = {
  limit: string;
  after?: string;
  "include-archived": boolean;
};
function pagination(options: PageOptions) {
  if (!/^(?:[1-9]\d?|100)$/.test(options.limit)) {
    throw new InputError("--limit must be an integer from 1 to 100.");
  }
  return {
    first: Number(options.limit),
    after:
      options.after === undefined
        ? undefined
        : nonempty(options.after, "--after"),
    includeArchived: options["include-archived"],
  };
}

type EditOptions = {
  title?: string;
  description?: string;
  "description-file"?: string;
  priority?: string;
  state?: string;
};

async function changes(
  options: EditOptions,
): Promise<LinearDocument.IssueUpdateInput> {
  const input: LinearDocument.IssueUpdateInput = {};
  if (options.title !== undefined)
    input.title = nonempty(options.title, "--title");
  if (
    options.description !== undefined &&
    options["description-file"] !== undefined
  ) {
    throw new InputError(
      "Use either --description or --description-file, not both.",
    );
  }
  if (options.description !== undefined)
    input.description = options.description;
  if (options["description-file"] !== undefined) {
    input.description = await Bun.file(
      nonempty(options["description-file"], "--description-file"),
    ).text();
  }
  if (options.priority !== undefined) {
    if (!/^[0-4]$/.test(options.priority)) {
      throw new InputError(
        "--priority must be 0 (none), 1 (urgent), 2 (high), 3 (medium), or 4 (low).",
      );
    }
    input.priority = Number(options.priority);
  }
  if (options.state !== undefined) nonempty(options.state, "--state");
  return input;
}

async function stateId(
  client: LinearClient,
  teamId: string,
  value: string,
): Promise<string> {
  const states = await allNodes(
    await client.workflowStates({
      first: 100,
      filter: { team: { id: { eq: teamId } } },
    }),
  );
  const matches = states.filter(
    (state) => state.id === value || state.name === value,
  );
  if (matches.length !== 1) {
    throw new InputError(
      `--state must identify one workflow state in the ticket's team. Available states: ${states.map((state) => `${state.name} (${state.id})`).join(", ")}.`,
    );
  }
  return matches[0]!.id;
}

async function scopedTicket(
  client: LinearClient,
  projectId: string,
  ticketId: string,
): Promise<Issue> {
  nonempty(projectId, "--project");
  nonempty(ticketId, "--ticket");
  const project = await client.project(projectId);
  const ticket = await client.issue(ticketId);
  if (ticket.projectId !== project.id) {
    throw new InputError(
      `Ticket ${ticket.identifier} does not belong to project ${project.id}. Use its current project; no changes were made.`,
    );
  }
  return ticket;
}

function ticketData(ticket: Issue) {
  return {
    id: ticket.id,
    identifier: ticket.identifier,
    title: ticket.title,
    description: ticket.description ?? null,
    url: ticket.url,
    projectId: ticket.projectId ?? null,
    teamId: ticket.teamId ?? null,
    stateId: ticket.stateId ?? null,
    assigneeId: ticket.assigneeId ?? null,
    priority: ticket.priority,
    priorityLabel: ticket.priorityLabel,
    createdAt: ticket.createdAt,
    updatedAt: ticket.updatedAt,
    archivedAt: ticket.archivedAt ?? null,
  };
}

export async function runCli(
  args: readonly string[] = Bun.argv.slice(2),
  getClient: () => LinearClient = clientFromEnvironment,
): Promise<number> {
  const cli = createCli({
    name: "linear",
    version: "1.0.0",
    description:
      "Project-scoped Linear tickets. Successful commands write JSON to stdout.",
  });

  cli.command("projects-list", {
    description: "List one page of projects and their teams",
    options: paginationOptions,
    run: async ({ options, positionals }) => {
      noPositionals(positionals);
      const variables = pagination(options);
      const projects = await getClient().projects(variables);
      const data = [];
      for (const project of projects.nodes) {
        const teams = await allNodes(await project.teams({ first: 100 }));
        data.push({
          id: project.id,
          name: project.name,
          description: project.description,
          url: project.url,
          archivedAt: project.archivedAt ?? null,
          teams: teams.map((team) => ({
            id: team.id,
            key: team.key,
            name: team.name,
          })),
        });
      }
      print({
        projects: data,
        pageInfo: {
          hasNextPage: projects.pageInfo.hasNextPage,
          endCursor: projects.pageInfo.endCursor ?? null,
        },
      });
    },
  });

  cli.command("tickets-list", {
    description: "List one page of tickets belonging to a project",
    options: [projectOption, ...paginationOptions] as const,
    run: async ({ options, positionals }) => {
      noPositionals(positionals);
      const variables = pagination(options);
      const project = await getClient().project(
        nonempty(options.project, "--project"),
      );
      const tickets = await project.issues(variables);
      print({
        tickets: tickets.nodes.map(ticketData),
        pageInfo: {
          hasNextPage: tickets.pageInfo.hasNextPage,
          endCursor: tickets.pageInfo.endCursor ?? null,
        },
      });
    },
  });

  cli.command("tickets-get", {
    description: "Get a ticket after checking its project membership",
    options: [projectOption, ticketOption] as const,
    run: async ({ options, positionals }) => {
      noPositionals(positionals);
      const ticket = await scopedTicket(
        getClient(),
        options.project,
        options.ticket,
      );
      print({ ticket: ticketData(ticket) });
    },
  });

  cli.command("tickets-add", {
    description: "Create a ticket in a project",
    options: [
      projectOption,
      { name: "title", description: "Ticket title", required: true },
      {
        name: "team",
        description:
          "Project team UUID or key; required for multi-team projects",
      },
      ...editOptions,
    ] as const,
    run: async ({ options, positionals }) => {
      noPositionals(positionals);
      const input = await changes(options);
      const client = getClient();
      const project = await client.project(
        nonempty(options.project, "--project"),
      );
      const teams = await allNodes(await project.teams({ first: 100 }));
      const matches =
        options.team === undefined
          ? teams
          : teams.filter(
              (team) => team.id === options.team || team.key === options.team,
            );
      if (matches.length !== 1) {
        throw new InputError(
          `Choose one of this project's teams with --team. Available teams: ${teams.map((team) => `${team.key} (${team.id})`).join(", ") || "none"}.`,
        );
      }
      const teamId = matches[0]!.id;
      if (options.state !== undefined)
        input.stateId = await stateId(client, teamId, options.state);
      const result = await client.createIssue({
        ...input,
        teamId,
        projectId: project.id,
      });
      if (!result.success)
        throw new Error(
          "Linear did not confirm ticket creation. Inspect the project's tickets before retrying.",
        );
      const ticket = await result.issue;
      if (!ticket)
        throw new Error(
          "Linear confirmed creation but returned no ticket. List the project's tickets before retrying.",
        );
      print({ ticket: ticketData(ticket) });
    },
  });

  cli.command("tickets-edit", {
    description: "Update only the supplied ticket fields",
    options: [
      projectOption,
      ticketOption,
      { name: "title", description: "Replacement ticket title" },
      ...editOptions,
    ] as const,
    run: async ({ options, positionals }) => {
      noPositionals(positionals);
      const input = await changes(options);
      if (!Object.keys(input).length && options.state === undefined) {
        throw new InputError(
          "Supply at least one edit: --title, --description, --description-file, --priority, or --state.",
        );
      }
      const client = getClient();
      const ticket = await scopedTicket(
        client,
        options.project,
        options.ticket,
      );
      if (options.state !== undefined) {
        if (!ticket.teamId)
          throw new Error(
            `Linear returned no team for ticket ${ticket.identifier}; cannot resolve --state.`,
          );
        input.stateId = await stateId(client, ticket.teamId, options.state);
      }
      const result = await client.updateIssue(ticket.id, input);
      if (!result.success)
        throw new Error(
          `Linear did not confirm the update to ${ticket.identifier}. Get the ticket before retrying.`,
        );
      const updated = await result.issue;
      if (!updated)
        throw new Error(
          `Linear confirmed the update to ${ticket.identifier} but returned no ticket. Get it before retrying.`,
        );
      print({ ticket: ticketData(updated) });
    },
  });

  cli.command("tickets-delete", {
    description: "Delete (trash) a ticket; requires --yes",
    options: [
      projectOption,
      ticketOption,
      {
        name: "yes",
        type: "boolean",
        description: "Confirm deletion of this ticket",
      },
    ] as const,
    run: async ({ options, positionals }) => {
      noPositionals(positionals);
      if (!options.yes)
        throw new InputError(
          "Deletion requires --yes. Verify the project and ticket with tickets-get first.",
        );
      const client = getClient();
      const ticket = await scopedTicket(
        client,
        options.project,
        options.ticket,
      );
      const result = await client.deleteIssue(ticket.id);
      if (!result.success)
        throw new Error(
          `Linear did not confirm deletion of ${ticket.identifier}. Check the ticket before retrying.`,
        );
      print({
        deleted: true,
        id: ticket.id,
        identifier: ticket.identifier,
        projectId: ticket.projectId,
      });
    },
  });

  try {
    return await cli.run(args);
  } catch (error) {
    const detail =
      error instanceof LinearError
        ? {
            message:
              error.errors?.map((item) => item.message).join("; ") ||
              "Linear API request failed. Check connectivity, credentials, and workspace permissions.",
            type: error.type,
            status: error.status,
          }
        : {
            message:
              error instanceof Error
                ? error.message
                : "Command failed with an unknown error.",
          };
    // SDK raw errors include request data; expose only the diagnostic fields above.
    const output = JSON.stringify({ error: detail });
    const token = Bun.env.LINEAR_API_TOKEN;
    console.error(token ? output.replaceAll(token, "[REDACTED]") : output);
    return error instanceof InputError ? 2 : 1;
  }
}

if (import.meta.main) process.exitCode = await runCli();
