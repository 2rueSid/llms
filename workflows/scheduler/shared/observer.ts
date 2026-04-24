export interface Observer {
	update(subject: Subject): Promise<void>;
}

export interface Subject {
	attach(id: string, observer: Observer): void;

	detach(id: string): void;

	notify(): Promise<void>;
}
