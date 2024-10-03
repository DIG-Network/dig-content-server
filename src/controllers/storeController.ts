import { Request, Response } from "express";
import fs from "fs";

import {
  getStoresList,
  getCoinState,
  DataIntegrityTree,
  DataIntegrityTreeOptions,
  DataStore,
  DigChallenge,
  DigNetwork,
} from "@dignetwork/dig-sdk";
import { formatBytes } from "../utils/formatBytes";
import {
  renderIndexView,
  renderStoreView,
  renderKeysIndexView,
  renderStoreSyncingView,
  renderStoreNotFoundView,
} from "../views";
import { extname } from "path";
import { executeChialisp } from "../utils/chialisp";
import { mimeTypes } from "../utils/mimeTypes";
import { hexToUtf8 } from "../utils/hexUtils";
import { getStorageLocation } from "../utils/storage";
import NodeCache from "node-cache";
import { Readable } from "stream";

const digFolderPath = getStorageLocation();
const chiaLispCache = new NodeCache({ stdTTL: 180 });

// Utility function to read a stream and return its contents as a string
const streamToString = (stream: Readable): Promise<string> => {
  const chunks: Buffer[] = [];
  return new Promise((resolve, reject) => {
    stream.on("data", (chunk) => {
      chunks.push(Buffer.from(chunk));
    });
    stream.on("error", (err) => {
      reject(err);
    });
    stream.on("end", () => {
      resolve(Buffer.concat(chunks).toString("utf-8"));
    });
  });
};

export const headStore = async (req: Request, res: Response) => {
  // @ts-ignore
  let { storeId } = req;

  const hasRootHash = req.query.hasRootHash as string;

  const dataStore = DataStore.from(storeId);

  if (hasRootHash) {
    const rootHistory = await dataStore.getRootHistory();
    res.setHeader(
      "X-Has-RootHash",
      rootHistory?.some(
        (history) => history.root_hash === hasRootHash && history.synced
      )
        ? "true"
        : "false"
    );
  }

  const { latestStore: state } = await dataStore.fetchCoinInfo();
  res.setHeader("X-Generation-Hash", state.metadata.rootHash.toString("hex"));
  res.setHeader("X-Store-Id", storeId);
  res.setHeader("X-Synced", (await dataStore.isSynced()) ? "true" : "false");
  res.status(200).end();
};

export const getStoresIndex = async (req: Request, res: Response) => {
  // @ts-ignore
  let { chainName } = req;
  const storeList = getStoresList();
  const rows = await Promise.all(
    storeList.map(async (storeId: string) => {
      const state = await getCoinState(storeId);
      const formattedBytes = formatBytes(Number(state.metadata.bytes));
      return renderIndexView(
        chainName || "chia",
        storeId,
        state,
        formattedBytes
      );
    })
  );
  res.send(renderStoreView(rows.join("")));
};

export const getKeysIndex = async (req: Request, res: Response) => {
  // Extract variables from the request object
  let { chainName, storeId, rootHash } = req as any;

  try {
    if (!rootHash) {
      const dataStore = DataStore.from(storeId);
      const storeInfo = await dataStore.fetchCoinInfo();
      rootHash = storeInfo.latestStore.metadata.rootHash.toString("hex");
    }

    const showKeys = req.query.showKeys === "true";

    const storeList = getStoresList();

    if (!storeList.includes(storeId)) {
      const peerRedirect = await DigNetwork.findPeerWithStoreKey(
        storeId,
        rootHash
      );

      return res
        .status(400)
        .send(
          renderStoreNotFoundView(
            storeId,
            rootHash,
            chainName,
            peerRedirect?.IpAddress
          )
        );
    }

    const options: DataIntegrityTreeOptions = {
      storageMode: "local",
      storeDir: `${digFolderPath}/stores`,
      disableInitialize: true,
      rootHash,
    };

    const datalayer = new DataIntegrityTree(storeId, options);

    res.setHeader("X-Synced", "false");
    res.setHeader("X-Generation-Hash", rootHash);
    res.setHeader("X-Store-Id", storeId);

    if (process.env.CACHE_ALL_STORES === "") {
      fs.mkdirSync(`${digFolderPath}/stores/${storeId}`, { recursive: true });
    }

    if (!showKeys) {
      const indexKey = Buffer.from("index.html").toString("hex");
      const hasIndex = datalayer.hasKey(indexKey, rootHash);

      if (hasIndex) {
        const fileExtension = extname("index.html").toLowerCase();
        const sha256 = datalayer.getSHA256(indexKey);

        if (!sha256) {
          res.status(500).send("Error retrieving file.");
          return;
        }

        const proofOfInclusion = datalayer.getProof(indexKey, sha256, rootHash);
        res.setHeader("x-proof-of-inclusion", proofOfInclusion);

        const mimeType = mimeTypes[fileExtension] || "application/octet-stream";
        res.setHeader("Content-Type", mimeType);

        // Get a readable stream of the index.html file
        const stream = datalayer.getValueStream(indexKey, rootHash);

        // Helper function to read the stream into a string
        const streamToString = (
          stream: NodeJS.ReadableStream
        ): Promise<string> => {
          const chunks: Buffer[] = [];
          return new Promise((resolve, reject) => {
            stream.on("data", (chunk) => {
              chunks.push(Buffer.from(chunk));
            });
            stream.on("error", (err) => {
              reject(err);
            });
            stream.on("end", () => {
              resolve(Buffer.concat(chunks).toString("utf-8"));
            });
          });
        };

        try {
          // Prepare the script tag to inject
          const baseUrl = `${chainName}.${storeId}.${rootHash}`;

          // Read the stream and get the index.html content
          const indexContent = await streamToString(stream);

          // Prepare the base tag to inject
          const baseTag = `<udi href="${baseUrl}" />`;

          // Inject the base tag immediately after the opening <head> tag
          const finalContent = indexContent.replace(
            /<head>/i,
            `<head>\n  ${baseTag}\n`
          );

          // Send the modified content
          res.send(finalContent);
        } catch (err) {
          console.error("Error reading or modifying index.html:", err);
          res.status(500).send("Error processing index.html file.");
        }

        return;
      }
    }

    // If no index.html or showKeys is true, render the keys index view
    const keys = datalayer.listKeys(rootHash);
    const links = keys.map((key: string) => {
      const utf8Key = hexToUtf8(key);
      const link = `/${chainName}.${storeId}.${rootHash}/${utf8Key}`;
      return { utf8Key, link };
    });

    res.send(renderKeysIndexView(storeId, links));
  } catch (error: any) {
    if (error.code === 404) {
      res.setHeader("X-Synced", "false");
      const state = await getCoinState(storeId);
      return res.status(202).send(renderStoreSyncingView(storeId, state));
    } else {
      console.error("Error in getKeysIndex controller:", error);
      res.status(500).send("An error occurred while processing your request.");
    }
  }
};


// Controller for handling the /:storeId/* route
export const getKey = async (req: Request, res: Response) => {
  let { chainName, storeId, rootHash } = req as any;
  const catchall = req.params[0]; // This is the key name, i.e., the file path

  const key = Buffer.from(decodeURIComponent(catchall), "utf-8").toString("hex");

  try {
    // Extract the challenge from query parameters
    const challengeHex = req.query.challenge as string; // Expecting a hex string here

    const options: DataIntegrityTreeOptions = {
      storageMode: "local",
      storeDir: `${digFolderPath}/stores`,
      disableInitialize: true,
      rootHash,
    };

    const datalayer = new DataIntegrityTree(storeId, options);

    // Check if the file exists
    if (!datalayer.hasKey(key, rootHash)) {
      res.setHeader("X-Key-Exists", "false");
      return getKeysIndex(req, res);
    }

    const sha256 = datalayer.getSHA256(key, rootHash);
    if (!sha256) {
      return res.status(500).send("Error retrieving file.");
    }

    const proofOfInclusion = datalayer.getProof(key, sha256, rootHash);

    // Process the challenge if present
    if (challengeHex) {
      try {
        // Deserialize the hex string back into a challenge object
        const parsedChallenge = DigChallenge.deserializeChallenge(challengeHex);

        if (parsedChallenge.storeId !== storeId) {
          res.status(400).send("Invalid challenge store ID.");
          return;
        }

        if (parsedChallenge.key !== key) {
          res.status(400).send("Invalid challenge key.");
          return;
        }

        if (parsedChallenge.rootHash !== rootHash) {
          res.status(400).send("Invalid challenge root hash.");
          return;
        }

        // Use the DigChallenge class to create a challenge response
        const digChallenge = new DigChallenge(storeId, key, rootHash);
        const challengeResponse = await digChallenge.createChallengeResponse(
          parsedChallenge
        );

        res.status(200).send(challengeResponse);
        return;
      } catch (error) {
        console.error("Error deserializing challenge:", error);
        res.status(400).send("Invalid challenge format.");
        return;
      }
    }

    // Check if the file extension is `.clsp.run`
    if (catchall.endsWith(".clsp.run")) {
      console.log("Executing Chialisp code...");
      // Extract params from the query if present (e.g., ?params=5,2,4)
      const paramsQuery = req.query.params as string;
      const params = paramsQuery ? paramsQuery.split(",") : [];

      // Cache by the key name (file path)
      const cacheKey = `${catchall}-${params.join(",")}`;
      const cachedResult = chiaLispCache.get(cacheKey);

      // Get the contents of the `.clsp.run` file via stream
      const clspStream = datalayer.getValueStream(key, rootHash);
      if (!clspStream) {
        return res.status(404).send("CLSP file not found.");
      }

      // Convert the stream to a string
      const clspCode = await streamToString(clspStream);

      if (cachedResult) {
        // Return cached result with necessary headers and response structure
        res.setHeader("x-proof-of-inclusion", proofOfInclusion);
        res.setHeader("X-Generation-Hash", rootHash);
        res.setHeader("X-Store-Id", storeId);
        res.setHeader("X-Key-Exists", "true");
        res.setHeader("Content-Type", "application/json");
        return res.json({
          clsp: clspCode,
          params: params,
          result: cachedResult,
        });
      }

      // Execute the Chialisp code using the extracted params
      const result = await executeChialisp(clspCode, params);

      // Cache the result based on the key name (file path) for 3 minutes
      chiaLispCache.set(cacheKey, result);

      // Return the result along with necessary headers and the structure
      res.setHeader("x-proof-of-inclusion", proofOfInclusion);
      res.setHeader("X-Generation-Hash", rootHash);
      res.setHeader("X-Store-Id", storeId);
      res.setHeader("X-Key-Exists", "true");
      res.setHeader("Content-Type", "application/json");
      return res.json({
        clsp: clspCode,
        params: params,
        result: result,
      });
    }

    // If it's not a `.clsp.run` file, proceed with the regular file handling
    const stream = datalayer.getValueStream(key, rootHash);
    const fileExtension = extname(catchall).toLowerCase();
    const mimeType = mimeTypes[fileExtension] || "application/octet-stream";

    res.setHeader("x-proof-of-inclusion", proofOfInclusion);
    res.setHeader("Content-Type", mimeType);
    res.setHeader("X-Generation-Hash", rootHash);
    res.setHeader("X-Store-Id", storeId);
    res.setHeader("X-Key-Exists", "true");

    stream.pipe(res);

    stream.on("error", (err: any) => {
      res.setHeader("X-Key-Exists", "false");
      console.error("Stream error:", err);
      res.status(500).send("Error streaming file.");
    });
  } catch (error) {
    res.setHeader("X-Key-Exists", "false");
    console.error("Error in getKey controller:", error);
    res.status(500).send("Error retrieving the requested file.");
  }
};


// Controller for handling HEAD requests to /:storeId/*
export const headKey = async (req: Request, res: Response) => {
  try {
    // @ts-ignore
    let { storeId, rootHash } = req;
    const catchall = req.params[0];

    if (!rootHash) {
      const dataStore = DataStore.from(storeId);
      const storeInfo = await dataStore.fetchCoinInfo();
      rootHash = storeInfo.latestStore.metadata.rootHash.toString("hex");
    }

    const key = Buffer.from(catchall, "utf-8").toString("hex");

    const options: DataIntegrityTreeOptions = {
      storageMode: "local",
      storeDir: `${digFolderPath}/stores`,
      disableInitialize: true,
      rootHash,
    };

    const datalayer = new DataIntegrityTree(storeId, options);

    if (!datalayer.hasKey(key, rootHash)) {
      res.setHeader("X-Key-Exists", "false");
      res.status(404).send("File not found.");
      return;
    }

    const fileExtension = extname(catchall).toLowerCase();
    const sha256 = datalayer.getSHA256(key, rootHash);

    if (!sha256) {
      res.setHeader("X-Key-Exists", "false");
      res.status(500).send("Error retrieving file.");
      return;
    }

    const proofOfInclusion = datalayer.getProof(key, sha256, rootHash);
    res.setHeader("x-proof-of-inclusion", proofOfInclusion);

    const mimeType = mimeTypes[fileExtension] || "application/octet-stream";
    res.setHeader("Content-Type", mimeType);
    res.setHeader("X-Generation-Hash", rootHash);
    res.setHeader("X-Store-Id", storeId);
    res.setHeader("X-Key-Exists", "true");

    res.status(200).end(); // Respond with headers only, no content
  } catch (error) {
    res.setHeader("X-Key-Exists", "false");
    console.error("Error in headKey controller:", error);
    res.status(500).send("Error retrieving the requested file.");
  }
};
