import { Request, Response, NextFunction } from "express";
import { renderUnknownChainView } from "../views";
import { DataStore } from "@dignetwork/dig-sdk";

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

    const referrer = req.get("Referer") || "";

    let cookieData = req.cookies.udiData || null;

    let chainName: string | null = null;
    let storeId: string = "";
    let rootHash: string | null = null;

    // Extract the first path part as the storeId (assumed app identifier)
    const pathSegment = req.params.storeId || ""; // Expecting storeId to be the first path segment
    const originalPath = req.originalUrl.split("/").slice(2).join("/"); // Removes the first segment, which is the storeId part
    const appendPath = originalPath ? `/${originalPath}` : "";

    // Split the pathSegment by periods to extract potential components
    const parts = pathSegment.split(".");

    if (parts.length === 3) {
      chainName = parts[0];
      storeId = parts[1];
      rootHash = parts[2]; // rootHash provided in the URL
    } else if (parts.length === 2) {
      if (parts[0].length === 64) {
        storeId = parts[0];
        rootHash = parts[1]; // rootHash provided in the URL
      } else {
        chainName = parts[0];
        storeId = parts[1];
      }
    } else if (parts.length === 1) {
      storeId = parts[0];
    }

    if (cookieData) {
      const {
        chainName: cookieChainName,
        storeId: cookieStoreId,
        rootHash: cookieRootHash,
      } = cookieData;

      if (!chainName) {
        chainName = cookieChainName;
      }

      if (!rootHash || rootHash.length !== 64) {
        rootHash = cookieRootHash;
      }

      if (!storeId || storeId.length != 64) {
        storeId = cookieStoreId;
      }
    }

    // Log extracted values
    console.log(
      "Extracted values - Chain Name:",
      chainName,
      "Store ID:",
      storeId,
      "Root Hash:",
      rootHash
    );

    // Validate storeId length
    if (!storeId || storeId.length !== 64) {
      if (referrer) {
        console.warn("Invalid storeId, redirecting to referrer:", referrer);
        return res.redirect(302, referrer + req.originalUrl);
      }
      return res.status(400).send("Invalid or missing storeId.");
    }

    // Fallback to cookie only if storeId matches the cookie's storeId
    if (!chainName || !rootHash) {
      if (cookieData) {
        const {
          chainName: cookieChainName,
          storeId: cookieStoreId,
          rootHash: cookieRootHash,
        } = cookieData;

        // Only use cookie data if the storeId matches
        if (!storeId || cookieStoreId === storeId) {
          console.log("Using cookie data as storeId matches:", storeId);
          chainName = chainName || cookieChainName;
          rootHash = rootHash || cookieRootHash;
        } else {
          console.log("StoreId changed, ignoring cookie data.");
        }
      }
    }

    const dataStore = DataStore.from(storeId);

    // Early exit: If both chainName and rootHash are missing, fetch rootHash and redirect with both added
    if (!chainName && !rootHash) {
      console.log("Both chainName and rootHash missing, fetching rootHash...");
      const storeInfo = await dataStore.fetchCoinInfo();
      rootHash = storeInfo.latestStore.metadata.rootHash.toString("hex");

      const redirect = `/chia.${storeId}.${rootHash}${appendPath}`;
      console.log("Redirecting to:", redirect);
      return res.redirect(302, redirect);
    }

    // If chainName is missing, assume "chia"
    if (!chainName) {
      console.log("ChainName missing, defaulting to 'chia'.");
      return res.redirect(302, `/chia.${pathSegment}${appendPath}`);
    }

    // Validate the chainName
    if (!validChainNames.includes(chainName)) {
      console.warn("Invalid chain name:", chainName);
      return res.status(400).send(renderUnknownChainView(storeId, chainName));
    }

    // If rootHash is missing, fetch the latest one
    if (!rootHash) {
      console.log("RootHash missing, fetching the latest rootHash...");
      const storeInfo = await dataStore.fetchCoinInfo();
      rootHash = storeInfo.latestStore.metadata.rootHash.toString("hex");
    }

    // Attach extracted components to the request object
    // @ts-ignore
    req.chainName = chainName;
    // @ts-ignore
    req.storeId = storeId;
    // @ts-ignore
    req.rootHash = rootHash;

    res.cookie(
      "udiData",
      { chainName, storeId, rootHash },
      {
        httpOnly: true,
        secure: false,
        maxAge: 5 * 60 * 1000, // Cookie expires after 5 minutes (5 * 60 * 1000 ms)
        expires: new Date(Date.now() + 5 * 60 * 1000), // Expiry date explicitly set for 5 minutes
      }
    );

    next();
  } catch (error) {
    console.error("Error in parseUdi middleware:", error);
    res.status(500).send("An error occurred while verifying the identifier.");
  }
};
