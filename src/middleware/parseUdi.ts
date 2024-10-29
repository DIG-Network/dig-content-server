import { Request, Response, NextFunction } from "express";
import { renderUnknownChainView } from "../views";
import { DataStore } from "@dignetwork/dig-sdk";
import { Udi } from "../utils/udi";

const validChainNames = ["chia"]; // List of valid chain names

function removeDuplicatePathPart(path: string): string {
  // Split the path into segments, ignoring leading/trailing slashes
  const parts = path.split('/').filter(part => part.length > 0);

  // Check if the path has at least two segments
  if (parts.length >= 2) {
    const firstPart = parts[0];
    const secondPart = parts[1];

    // Check if the first two parts are identical and at least 64 characters long
    if (firstPart === secondPart && firstPart.length >= 64) {
      // Remove the duplicate second part
      parts.splice(1, 1);
    }
  }

  const modifiedPath = '/' + parts.join('/');
  if (path !== modifiedPath) {
    console.log('Original path:', path);
    console.log('Modified path:', modifiedPath);
  }

  // Reconstruct the path with a leading slash
  return modifiedPath;
}

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

    // Extract the path and query string separately
    const [path, queryString] = req.originalUrl.split("?");

    // Apply removeDuplicatePathPart to the request path
    const modifiedPath = removeDuplicatePathPart(path);

    const referrer = req.get("Referer") || "";

    let chainName: string | null = null;
    let storeId: string = "";
    let rootHash: string | null = null;

    // Use modifiedPath instead of req.originalUrl
    const pathSegments = modifiedPath.split("/").filter(segment => segment.length > 0);

    // Extract the first path part as the storeId (assumed app identifier)
    const pathSegment = pathSegments[0] || ""; // Expecting storeId to be the first path segment
    const originalPathSegments = pathSegments.slice(1); // Remove the first segment, which is the storeId part
    let appendPath =
      originalPathSegments.length > 0
        ? `/${originalPathSegments.join("/")}`
        : "";

    // Split the pathSegment by periods to extract potential components
    const parts = pathSegment.split(":");

    if (parts.length === 1 && parts[0].length !== 64) {
      appendPath = `/${parts[0]}${appendPath}`;
    }

    if (parts.length === 5) {
      chainName = parts[2];
      storeId = parts[3];
      rootHash = parts[4]; // rootHash provided in the URL   
    }
    else if (parts.length === 4) {
      chainName = parts[2];
      storeId = parts[3];
    }
    else if (parts.length === 3) {
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
        // the referred might be the storeId or it might be a resource within the storeId
        // like another script - in the code below we parse that and redirect to the storeId
        const url = new URL(referrer);
        const pathParts = url.pathname.split('/').filter(part => part.length > 0);
        const store = pathParts.length > 0 ? `/${pathParts[0]}` : "";

        console.warn(`Invalid storeId [${storeId}], redirecting to referrer:`, `${url.origin}${store}`);
        return res.redirect(302, `${url.origin}${store}${appendPath}`);
      }

      return res.status(400).send("Invalid or missing storeId.");
    }

    const dataStore = DataStore.from(storeId);

    // Early exit: If both chainName and rootHash are missing, fetch rootHash and redirect with both added
    if (!chainName && !rootHash) {
      console.log("Both chainName and rootHash omitted, fetching rootHash...");
      const storeInfo = await dataStore.fetchCoinInfo();
      rootHash = storeInfo.latestStore.metadata.rootHash.toString("hex");

      const udi = new Udi("chia", storeId, rootHash, `${appendPath}${queryString ? '?' + queryString : ''}`);
      const redirect = `/${udi.toUrn()}`;
      console.log("Redirecting to:", redirect);
      return res.redirect(302, redirect);
    }

    // If chainName is missing, assume "chia"
    if (!chainName) {
      console.log("ChainName omitted, defaulting to 'chia'.");
      const udi = new Udi("chia", pathSegment, null, `${appendPath}${queryString ? '?' + queryString : ''}`);
      const redirect = `/${udi.toUrn()}`;
      console.log("Redirecting to:", redirect);
      return res.redirect(302, redirect);
    }

    // Validate the chainName
    if (!validChainNames.includes(chainName)) {
      console.warn("Invalid chain name:", chainName);
      return res.status(400).send(renderUnknownChainView(storeId, chainName));
    }

    // If rootHash is missing, fetch the latest one
    if (!rootHash) {
      console.log("RootHash omitted, fetching the latest rootHash...");
      const storeInfo = await dataStore.fetchCoinInfo();
      rootHash = storeInfo.latestStore.metadata.rootHash.toString("hex");
    }

    // Attach extracted components to the request object
    // @ts-ignore
    req.chainName = chainName;
    // @ts-ignore
    req.storeId = storeId;
    // @ts-ignore
    req.rootHash = rootHash

    next();
  } catch (error) {
    console.error("Error in parseUdi middleware:", error);
    res.status(500).send("An error occurred while verifying the identifier.");
  }
};
