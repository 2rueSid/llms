import { Config } from "@shared/config";
import { techDigestLogger } from "@shared/logger";
import { google } from "googleapis";

type Mail = {
	subject: string;
	body: string;
	from: string;
};

export async function getMails(): Promise<Mail[]> {
	const oauth2Client = new google.auth.OAuth2(
		Config.GOOGLE_CLIENT_ID,
		Config.GOOGLE_CLIENT_SECRET,
	);

	oauth2Client.setCredentials({
		refresh_token: Config.GOOGLE_REFRESH_TOKEN,
	});

	techDigestLogger.info("Google authenticated.");

	const query = buildQuery(Config.GREP_EMAILS, Config.EMAILS_TIME_RANGE);

	techDigestLogger.debug(`GMAIL Query built: ${query}`);

	try {
		const gmail = google.gmail({
			version: "v1",
			auth: oauth2Client,
		});

		const res = await gmail.users.messages.list({
			userId: "me",
			q: query,
		});

		if (!res.data.messages) {
			techDigestLogger.warning(`No mail is returned...`);
			return [];
		}

		const messages = res.data.messages;
		techDigestLogger.info(`Found ${messages.length}`);

		const details = await Promise.allSettled(
			messages.map(async ({ id }) => {
				if (!id) return;

				const { data } = await gmail.users.messages.get({
					id,
					userId: "me",
					format: "full",
				});

				const payload = data.payload;
				const headers = payload?.headers;

				const from = headers?.find(
					(v) => v.name?.toLowerCase() === "from",
				)?.value;
				const subject = headers?.find(
					(v) => v.name?.toLowerCase() === "subject",
				)?.value;

				const body = getBody(payload);

				return {
					subject,
					body,
					from,
				} as Mail;
			}),
		);

		return details
			.filter((mail) => mail.status === "fulfilled")
			.map((mail) => mail.value) as Mail[];
	} catch (e) {
		techDigestLogger.error(
			`Error while authenticating GMail. Check refresh token`,
		);
		throw e;
	}
}

function getBody(payload: any): string {
	if (!payload) return "";

	if (payload.body?.data) {
		return decodeBody(payload.body.data);
	}

	if (payload.parts) {
		for (const part of payload.parts) {
			const result = getBody(part);
			if (result) return result;
		}
	}

	return "";
}

function decodeBody(data: string) {
	return Buffer.from(
		data.replace(/-/g, "+").replace(/_/g, "/"),
		"base64",
	).toString("utf8");
}

function buildQuery(emails: string[], timeRange: string) {
	return `${emails
		.map((v) => "from:" + v)
		.join(" OR ")
		.trim()} newer_than:${timeRange}`;
}

(async () => {
	const r = await getMails();
	console.log(r);
})();
