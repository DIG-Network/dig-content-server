import { app, PORT } from "./app";
import { precacheStoreInfo } from "./services/precacheService";

const startContentServer = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    try {
      const server = app.listen(PORT, async () => {
        console.log(`DIG Server Started`);
        console.log(`Preview your store at: http://localhost:${PORT}`);
        await precacheStoreInfo();
      });

      server.on("close", resolve);
    } catch (error) {
      reject(error);
    }
  });
};

export { startContentServer };
