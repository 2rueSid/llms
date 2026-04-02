import { parseArgs } from "util";

type CLIArgument = {
	name: string;
	description: string;
	short?: string;
	type?: "string" | "boolean";
	required?: boolean;
	default?: string | boolean;
};

type ParsedArgValue<TArg extends CLIArgument> = TArg["type"] extends "boolean"
	? boolean
	: string;

type ParsedArgs<TInput extends readonly CLIArgument[]> = {
	[K in TInput[number] as K["name"]]: ParsedArgValue<K>;
};

type CommandDefinition = {
	run: () => Promise<void>;
};

type CLIOptions<TInput extends readonly CLIArgument[]> = {
	[K in TInput[number] as K["name"]]: {
		multiple: boolean;
		short?: string;
		default?: string | boolean;
		type: "string" | "boolean";
	};
};

const commands: Record<string, CommandDefinition> = {};

export const command = <TInput extends readonly CLIArgument[]>(
	name: string,
	cb: (args: ParsedArgs<TInput>) => void | Promise<void>,
	schema?: TInput,
) => {
	const options = {} as CLIOptions<TInput>;

	if (schema) {
		Object.assign(
			options,
			schema.reduce(
				(acc, v) => {
					const option = {
						multiple: false,
						short: v.short ?? undefined,
						default: v.default ?? undefined,
						type: v.type ?? "string",
					} as CLIOptions<TInput>[keyof CLIOptions<TInput>];

					acc[v.name as keyof CLIOptions<TInput>] = option;

					return acc;
				},
				{} as CLIOptions<TInput>,
			),
		);
	}

	const run = async () => {
		const { values } = parseArgs({
			args: Bun.argv,
			options,
			strict: true,
			allowPositionals: true,
		});
		const parsedValues = values as Record<string, unknown>;

		if (schema) {
			for (const arg of schema) {
				if (arg.required && parsedValues[arg.name] === undefined) {
					throw new Error(`Missing required argument: --${arg.name}`);
				}
			}
		}

		await cb(parsedValues as unknown as ParsedArgs<TInput>);
	};

	const def: CommandDefinition = {
		run,
	};

	commands[name] = def;

	return def;
};

export async function exec() {
	if (Object.keys(commands).length <= 0) {
		throw "No commands specified";
	}

	if (!Bun.argv[2] || !(Bun.argv[2] in commands)) {
		throw "Command not found";
	}

	const commandData = commands[Bun.argv[2]];

	commandData?.run();
}
