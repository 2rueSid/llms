import { exit } from "node:process";
import { Config } from "@shared/config";
import { google } from "googleapis";

const oauth2Client = new google.auth.OAuth2(
	Config.GOOGLE_CLIENT_ID,
	Config.GOOGLE_CLIENT_SECRET,
);

oauth2Client.setCredentials({
	refresh_token: Config.GOOGLE_REFRESH_TOKEN,
});

function buildQuery() {
	const grepEmails = Config.GREP_EMAILS;

	const timeRange = Config.EMAILS_TIME_RANGE;

	return `${grepEmails
		.map((v) => "from:" + v)
		.join(" OR ")
		.trim()} newer_than:${timeRange}`;
}

const gmail = google.gmail({
	version: "v1",
	auth: oauth2Client,
});

const res = await gmail.users.messages.list({
	userId: "me",
	q: buildQuery(),
});

console.log(res.data.messages);

if (!res.data.messages) exit(1);

for await (const msg of res.data.messages) {
	const details = await gmail.users.messages.get({
		id: msg.id || "",
		userId: "me",
		format: "full",
	});

	const headers = details.data.payload?.headers;

	const from = headers?.find((v) => v.name?.toLowerCase() === "from");
	const subject = headers?.find((v) => v.name?.toLowerCase() === "subject");

	const body = getBody(details.data.payload);
	console.log(body);
	console.log(from);
	console.log(subject);
}

function getBody(payload) {
	const decode = (data) =>
		Buffer.from(data.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString(
			"utf8",
		);

	if (!payload) return "";

	// direct body
	if (payload.body?.data) {
		return decode(payload.body.data);
	}

	// multipart → recurse
	if (payload.parts) {
		for (const part of payload.parts) {
			const result = getBody(part);
			if (result) return result;
		}
	}

	return "";
}
