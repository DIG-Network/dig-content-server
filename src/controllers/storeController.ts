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
  renderStoreNotFoundView
} from "../views";
import { extname } from "path";

import { mimeTypes } from "../utils/mimeTypes";
import { hexToUtf8 } from "../utils/hexUtils";
import { getStorageLocation } from "../utils/storage";

const digFolderPath = getStorageLocation();

export const headStore = async (req: Request, res: Response) => {
  // @ts-ignore
  let { storeId } = req;

  console.log('!!!', storeId, req.query);

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

// Controller for handling the /:storeId route
export const getKeysIndex = async (req: Request, res: Response) => {
  // @ts-ignore
  let { chainName, storeId, rootHash } = req;

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

      return res.status(400).send(renderStoreNotFoundView(storeId, rootHash, chainName, peerRedirect?.IpAddress));
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
        const stream = datalayer.getValueStream(indexKey, rootHash);
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

        stream.pipe(res);

        stream.on("error", (err: any) => {
          console.error("Stream error:", err);
          res.status(500).send("Error streaming file.");
        });

        return;
      }
    }

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
  // @ts-ignore
  let { chainName, storeId, rootHash } = req;
  const catchall = req.params[0];

  const key = Buffer.from(decodeURIComponent(catchall), "utf-8").toString(
    "hex"
  );

  try {
    // Extract the challenge from query parameters
    const challengeHex = req.query.challenge as string; // Expecting a hex string here

    // If rootHash is not provided, fetch it from DataStore
    if (!rootHash) {
      const dataStore = DataStore.from(storeId);
      const storeInfo = await dataStore.fetchCoinInfo();
      rootHash = storeInfo.latestStore.metadata.rootHash.toString("hex");
    }

    console.log("Fetching key:", key);

    const options: DataIntegrityTreeOptions = {
      storageMode: "local",
      storeDir: `${digFolderPath}/stores`,
      disableInitialize: true,
      rootHash,
    };

    const datalayer = new DataIntegrityTree(storeId, options);

    if (!datalayer.hasKey(key, rootHash)) {
      res.setHeader("X-Key-Exists", "false");
      return getKeysIndex(req, res);
    }

    // If a challenge hex is present, deserialize and create a challenge response
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

    // Otherwise, stream the file and return proof of inclusion
    const stream = datalayer.getValueStream(key, rootHash);
    const fileExtension = extname(catchall).toLowerCase();
    const sha256 = datalayer.getSHA256(key, rootHash);

    if (!sha256) {
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
