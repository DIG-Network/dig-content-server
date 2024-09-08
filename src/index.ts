import fs from "fs";
// @ts-ignore
import { STORE_PATH } from "dig-sdk";
import { startContentServer } from "./server";

if (!fs.existsSync(STORE_PATH)) {
  fs.mkdirSync(STORE_PATH, { recursive: true });
}

startContentServer();