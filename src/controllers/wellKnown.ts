import { Request, Response } from "express";
// @ts-ignore
import { Wallet, getStoresList } from "dig-sdk";

/**
 * Handles the /well-known endpoint to retrieve the owner's public key
 * and the known stores endpoint URL.
 * 
 * @param req - The request object.
 * @param res - The response object.
 * @returns A JSON object containing the public key and known stores endpoint.
 */
export const getWellKnown = async (req: Request, res: Response) => {
    try {
        // Get the owner's public key
        const wallet = await Wallet.load("default");
        const publicKey = await wallet.getOwnerPublicKey();

        // Construct the known stores endpoint using the request host
        const knownStoresEndpoint = `${req.protocol}://${req.get('host')}/.well-known/stores`;

        // Send the response with the public key and known stores endpoint
        return res.json({
            xch_address: publicKey,
            known_stores_endpoint: knownStoresEndpoint
        });
    } catch (error) {
        // Handle errors and send a 500 response
        return res.status(500).json({ error: "Failed to retrieve well-known information." });
    }
};

/**
 * Handles the /well-known/stores endpoint to retrieve a list of known stores.
 * 
 * @param req - The request object.
 * @param res - The response object.
 * @returns A JSON object containing the list of known stores.
 */
export const getKnownStores = async (req: Request, res: Response) => { 
    try {
        // Get the list of stores
        const storeList = getStoresList();

        // Send the response with the store list as a JSON object
        return res.json(storeList);
    } catch (error) {
        // Handle errors and send a 500 response
        return res.status(500).json({ error: "Failed to retrieve known stores." });
    }
};
