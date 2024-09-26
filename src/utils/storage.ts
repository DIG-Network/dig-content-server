import os from "os";
import path from "path";
import { Environment } from "@dignetwork/dig-sdk";

export const getStorageLocation = (): string => {
  // If DIG_STORAGE_LOCATION is set, use it; otherwise, fallback to the default location
  return Environment.DIG_FOLDER_PATH || path.join(os.homedir(), ".dig");
};
