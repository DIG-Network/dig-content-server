import { Request, Response, NextFunction } from "express";
import { renderUnknownChainView } from "../views";
import { DataStore } from "@dignetwork/dig-sdk";
import querystring from "querystring";

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

    // Extract udi from query parameter
    const udiParam = req.query.udi as string | undefined;

    const referrer = req.get("Referer") || "";
    const cookieData = req.cookies.udiData || null;

    let chainName: string | null = null;
    let storeId: string = "";
    let rootHash: string | null = null;
    let key = "";

    if (udiParam) {
      // Parse UDI from query parameter
      const [udiPrefix, ...rest] = udiParam.split("/");
      key = rest.length > 0 ? `/${rest.join("/")}` : "";

      const parts = udiPrefix.split(".");

      if (parts.length === 3) {
        chainName = parts[0];
        storeId = parts[1];
        rootHash = parts[2];
      } else if (parts.length === 2) {
        if (parts[0].length === 64) {
          // Assume storeId and rootHash
          storeId = parts[0];
          rootHash = parts[1];
        } else {
          chainName = parts[0];
          storeId = parts[1];
        }
      } else if (parts.length === 1) {
        storeId = parts[0];
      }
    } else {
      // udiParam does not exist
      // Check if path is just /<key> and cookie includes storeId
      const pathSegments = req.path.split("/").filter((segment) => segment.length > 0);

      if (pathSegments.length <= 1 && cookieData && cookieData.storeId) {
        // Use cookie data to build the UDI
        chainName = cookieData.chainName || "chia";
        storeId = cookieData.storeId;
        rootHash = cookieData.rootHash;

        key = pathSegments.length === 1 ? `/${pathSegments[0]}` : "";

        // Fetch rootHash if not in cookie
        if (!rootHash) {
          const dataStore = DataStore.from(storeId);
          const storeInfo = await dataStore.fetchCoinInfo();
          rootHash = storeInfo.latestStore.metadata.rootHash.toString("hex");
        }

        // Build the redirect URL with the UDI in the query parameter
        const existingQueryParams = { ...req.query };
        delete existingQueryParams.udi;

        const redirectQueryParams = {
          udi: `${chainName}.${storeId}.${rootHash}${key}`,
          ...existingQueryParams,
        };

        const redirectUrl = `?${querystring.stringify(redirectQueryParams)}`;

        console.log("Redirecting to:", redirectUrl);
        return res.redirect(302, redirectUrl);
      } else {
        // No UDI and no valid cookie data
        return res.status(400).send("Invalid or missing UDI.");
      }
    }

    // Fallback to cookie data if needed
    if (!chainName || !rootHash) {
      if (cookieData) {
        const {
          chainName: cookieChainName,
          storeId: cookieStoreId,
          rootHash: cookieRootHash,
        } = cookieData;

        // Only use cookie data if the storeId matches
        if (storeId === cookieStoreId) {
          console.log("Using cookie data as storeId matches:", storeId);
          chainName = chainName || cookieChainName;
          rootHash = rootHash || cookieRootHash;
        } else {
          console.log("StoreId changed, ignoring cookie data.");
        }
      }
    }

    // If chainName is missing, default to "chia"
    if (!chainName) {
      console.log("ChainName missing, defaulting to 'chia'.");
      chainName = "chia";

      // Build the redirect URL with the updated chainName
      const existingQueryParams = { ...req.query };
      delete existingQueryParams.udi;

      const udiValue = `${chainName}.${storeId}`;
      const udiWithKey = rootHash ? `${udiValue}.${rootHash}${key}` : `${udiValue}${key}`;

      const redirectQueryParams = {
        udi: udiWithKey,
        ...existingQueryParams,
      };

      const redirectUrl = `?${querystring.stringify(redirectQueryParams)}`;

      console.log("Redirecting to:", redirectUrl);
      return res.redirect(302, redirectUrl);
    }

    // Validate the chainName
    if (!validChainNames.includes(chainName)) {
      console.warn("Invalid chain name:", chainName);

      // Build the redirect URL with existing query parameters
      const existingQueryParams = { ...req.query };

      //const redirectUrl = `?${querystring.stringify(existingQueryParams)}`;
      return res.status(400).send(renderUnknownChainView(storeId, chainName));
    }

    // If rootHash is missing, fetch the latest one
    if (!rootHash) {
      console.log("RootHash missing, fetching the latest rootHash...");
      const dataStore = DataStore.from(storeId);
      const storeInfo = await dataStore.fetchCoinInfo();
      rootHash = storeInfo.latestStore.metadata.rootHash.toString("hex");

      // Build the redirect URL with the updated rootHash
      const existingQueryParams = { ...req.query };
      delete existingQueryParams.udi;

      const udiValue = `${chainName}.${storeId}.${rootHash}${key}`;

      const redirectQueryParams = {
        udi: udiValue,
        ...existingQueryParams,
      };

      const redirectUrl = `?${querystring.stringify(redirectQueryParams)}`;

      console.log("Redirecting to:", redirectUrl);
      return res.redirect(302, redirectUrl);
    }

    // Attach extracted components to the request object
    // @ts-ignore
    req.chainName = chainName;
    // @ts-ignore
    req.storeId = storeId;
    // @ts-ignore
    req.rootHash = rootHash;
    // @ts-ignore
    req.key = key;

    // Set the cookie with UDI data
    res.cookie(
      "udiData",
      { chainName, storeId, rootHash },
      {
        httpOnly: true,
        secure: false,
        maxAge: 5 * 60 * 1000, // Cookie expires after 5 minutes
        expires: new Date(Date.now() + 5 * 60 * 1000),
      }
    );

    next();
  } catch (error) {
    console.error("Error in parseUdi middleware:", error);
    res.status(500).send("An error occurred while verifying the identifier.");
  }
};
