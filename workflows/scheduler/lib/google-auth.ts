import path from "node:path";
import process from "node:process";
import { authenticate } from "@google-cloud/local-auth";

const SCOPES = ["https://www.googleapis.com/auth/gmail.readonly"];
const CREDENTIALS_PATH = path.join(process.cwd(), "credentials.json");

// Use this once to get google refresh token
async function refreshToken() {
	console.log(CREDENTIALS_PATH);

	const auth = await authenticate({
		scopes: SCOPES,
		keyfilePath: CREDENTIALS_PATH,
	});

	console.log(auth);
}

await refreshToken();
