import { Request, Response, NextFunction } from "express";
import { renderUnknownChainView } from "../views";
import { DataStore, Udi } from "@dignetwork/dig-sdk";

const validChainNames = ["chia"]; // List of valid chain names

// Extracts the UDI from the request URL or referrer
function getUdi(requestUrl: string, referrer: string): [boolean, Udi | null] {
  // Check if the request URL contains a valid UDI
  if (requestUrl) {
    try {
      return [false, Udi.fromUrn(requestUrl.replace(/^\/+/, ''))];
    } catch (error) {
    }
  }

  // Check if the referrer URL contains a valid UDI
  if (referrer) {
    try {
      const url = new URL(referrer);
      if (url.pathname) {
        let udi = Udi.fromUrn(url.pathname.replace(/^\/+/, ''));

        // now we have gotten the udi from the referrer, but we might have a path part in the request url
        // so use it to update the udi. The referrer udi might have a reosurce key which is where the request orginated from
        // like a script importing another script, NOT the resource being requested
        if (requestUrl) {
          udi = udi.withResourceKey(requestUrl.replace(/^\/+/, ''));
        }
        // return true because calling code needs to redirect
        return [true, udi];
      }
    } catch (error) {
    }
  }

  console.log('No UDI found in path or referrer: path:', requestUrl, 'referrer:', referrer);
  return [false, null];
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

    // strip off the query string as that is not part of the udi
    const [path, queryString] = req.originalUrl.split("?");
    const referrer = req.get("Referer") || "";

    const [redirect, udi] = getUdi(removeDuplicatePathPart(path), referrer);
    if (!udi) {
      return res.status(400).send("Invalid or missing Udi.");
    }

    // Validate the chainName
    if (!validChainNames.includes(udi.chainName)) {
      console.warn("Invalid chain name:", udi.chainName);
      return res.status(400).send(renderUnknownChainView(udi));
    }

    // Log extracted values
    console.log(`Extracted urn:`, udi.toUrn());

    if (redirect) {
      // the referred might be the storeId or it might be a resource within the storeId
      // like another script - in the code below we parse that and redirect to the storeId
      const url = new URL(referrer);
      const redirectUrl = `${url.origin}/${udi.toUrn()}`
      console.warn(`Redirecting to referrer:`, redirectUrl);
      return res.redirect(302, redirectUrl);
    }

    const dataStore = DataStore.from(udi.storeId);

    let rootHash: Buffer | null = udi.rootHash;
    // If rootHash is missing, fetch the latest one
    if (!rootHash) {
      console.log("RootHash omitted, fetching the latest rootHash...");
      const storeInfo = await dataStore.fetchCoinInfo();
      rootHash = storeInfo.latestStore.metadata.rootHash;
    }

    // Attach extracted components to the request object
    // @ts-ignore
    req.chainName = udi.chainName;
    // @ts-ignore
    req.storeId = udi.storeId.toString('hex');
    // @ts-ignore
    req.rootHash = rootHash ? rootHash.toString('hex') : null;

    next();
  } catch (error) {
    console.error("Error in parseUdi middleware:", error);
    res.status(500).send("An error occurred while verifying the identifier.");
  }
};

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