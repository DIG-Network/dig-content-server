import { Request, Response, NextFunction } from "express";
import { renderUnknownChainView } from "../views";
import { DataStore, Udi } from "@dignetwork/dig-sdk";

const validChainNames = ["chia"]; // List of valid chain names

export const parseUdi = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Skip verification if the route is under the .well-known root
    if (req.originalUrl.startsWith("/.well-known")) {
      return next();
    }

    // strip off the query string as that is not part of the udi
    const [path] = req.originalUrl.replace(/^\//, "").split("?");
    console.log('path:', path);
    const udi = Udi.fromUrn(path);

    // Validate the chainName
    if (!validChainNames.includes(udi.chainName)) {
      console.warn("Invalid chain name:", udi.chainName);
      return res.status(400).send(renderUnknownChainView(udi));
    }

    // Log extracted values
    console.log(`Extracted urn:`, udi.toUrn());

    const dataStore = DataStore.from(udi.storeId);

    let rootHash = udi.rootHash;
    // If rootHash is missing, fetch the latest one
    if (!rootHash) {
      console.log("RootHash omitted, fetching the latest rootHash...");
      const storeInfo = await dataStore.fetchCoinInfo();
      rootHash = storeInfo.latestStore.metadata.rootHash.toString('hex');
    }

    // Attach extracted components to the request object
    // @ts-ignore
    req.chainName = udi.chainName;
    // @ts-ignore
    req.storeId = udi.storeId;
    // @ts-ignore
    req.rootHash = rootHash;
    //@ts-ignore
    req.udi = udi;

    //@ts-ignore
    console.log('!!!!', req.chainName, req.storeId, req.rootHash);

    next();
  } catch (error) {
    console.error("Error in parseUdi middleware:", error);
    res.status(500).send("An error occurred while verifying the identifier.");
  }
};
