import os from "os";
import path from "path";

export const getStorageLocation = (): string => {
  // If DIG_STORAGE_LOCATION is set, use it; otherwise, fallback to the default location
  return process.env.DIG_FOLDER_PATH || path.join(os.homedir(), ".dig");
};
