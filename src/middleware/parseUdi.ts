import { Request, Response, NextFunction } from "express";
import { renderUnknownChainView } from "../views";
import { DataStore } from "@dignetwork/dig-sdk";
import qs from "qs"; // Use 'qs' instead of 'querystring'

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
    const cookieData = req.cookies.udiData || null;

    let chainName: string | null = null;
    let storeId: string = "";
    let rootHash: string | null = null;
    let key = req.path !== "/" ? req.path : "";

    // Extract udi from query parameter
    const udiParam = req.query.udi as string | undefined;

    if (udiParam) {
      // Parse UDI from query parameter
      const [udiPrefix, ...rest] = udiParam.split("/");

      // The key may be included in the UDI after the '/'
      key = rest.length > 0 ? `/${rest.join("/")}` : key;

      const parts = udiPrefix.split(".");

      if (parts.length === 3) {
        chainName = parts[0];
        storeId = parts[1];
        rootHash = parts[2];
      } else if (parts.length === 2) {
        chainName = parts[0];
        storeId = parts[1];
      } else if (parts.length === 1) {
        storeId = parts[0];
      }

      // Do not redirect; process the request as is
    } else {
      // udiParam does not exist
      // Check if there's a storeId in the cookie
      if (cookieData && cookieData.storeId) {
        // Use cookie data to build the UDI
        chainName = cookieData.chainName || "chia";
        storeId = cookieData.storeId;
        rootHash = cookieData.rootHash;

        // Build the UDI including the key (path)
        const udiValue = `${chainName}.${storeId}${key}`;

        // Build the redirect URL with the UDI in the query parameter
        const existingQueryParams = { ...req.query, udi: udiValue };

        const redirectUrl = `${req.path}?${qs.stringify(
          existingQueryParams
        )}`;

        console.log("Redirecting to:", redirectUrl);
        return res.redirect(302, redirectUrl);
      } else {
        // No UDI and no valid cookie data
        return res.status(400).send("Invalid or missing UDI.");
      }
    }

    // Fallback to cookie data if needed
    if (!chainName || !storeId) {
      if (cookieData) {
        const {
          chainName: cookieChainName,
          storeId: cookieStoreId,
          rootHash: cookieRootHash,
        } = cookieData;

        // Use cookie data if storeId matches or storeId is missing
        if (storeId === cookieStoreId || !storeId) {
          chainName = chainName || cookieChainName;
          storeId = storeId || cookieStoreId;
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

      // Rebuild the UDI
      const udiValue = `${chainName}.${storeId}${key}`;

      // Build the redirect URL with the updated UDI
      const existingQueryParams = { ...req.query, udi: udiValue };

      const redirectUrl = `${req.path}?${qs.stringify(
        existingQueryParams
      )}`;

      console.log("Redirecting to:", redirectUrl);
      return res.redirect(302, redirectUrl);
    }

    // Validate the chainName
    if (!validChainNames.includes(chainName)) {
      console.warn("Invalid chain name:", chainName);
      return res.status(400).send(renderUnknownChainView(storeId, chainName));
    }

    // Attach extracted components to the request object
    // @ts-ignore
    req.chainName = chainName;
    // @ts-ignore
    req.storeId = storeId;
    // @ts-ignore
    req.rootHash = rootHash; // May be null if not provided
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
    res
      .status(500)
      .send("An error occurred while verifying the identifier.");
  }
};
