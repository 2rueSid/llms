/*
 *
 * # Task

Each Task implements a Task Abstract class. Task class implements Subject interface that follows the Observer Design Patter.

Observer pattern is being used to provide a clean, extendable interface to manage subscriptions without updating the core logic.

## Signature

Each task accepts:

- List of transports - for example discord, FS
- LLMRunner - interface that executes the request, it needs to be aware of skills

And exposes these methods:

attach - to attach the Observer
detach - to detach observer
notify - notify observers
run - executes task main function
*/

import type { Delivery } from "@lib/delivery";
import type { LLMRunner } from "@lib/llm-runner";
import type { Observer, Subject } from "@shared/observer";
import type z from "zod";

export abstract class Task<TSchema extends z.ZodTypeAny> implements Subject {
	readonly transports: Delivery[];
	readonly runner: LLMRunner;

	state: z.infer<TSchema> | undefined;

	private observers: Map<string, Observer> = new Map();

	constructor(transports: Delivery[], runner: LLMRunner) {
		this.transports = transports;
		this.runner = runner;
	}

	attach(id: string, observer: Observer): void {
		if (this.observers.has(id)) {
			return;
		}

		this.observers.set(id, observer);
	}

	detach(id: string): void {
		if (this.observers.has(id)) {
			this.observers.delete(id);
		}
	}

	async notify(): Promise<void> {
		await Promise.allSettled(
			Array.from(this.observers.values()).map((observer) =>
				observer.update(this),
			),
		);
	}

	abstract run(): Promise<void>;
}

export type TaskModule = {
	task: Task<z.ZodTypeAny>;
};
