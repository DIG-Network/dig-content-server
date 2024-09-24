import { Router } from "express";
import {
  getStoresIndex,
  getKeysIndex,
  getKey,
  headKey,
  headStore,
} from "../controllers/storeController";
import { parseUdi } from "../middleware/parseUdi";
import { getWellKnown, getKnownStores } from "../controllers/wellKnown";

const router = Router();

// Routes that don't require UDI parsing
router.get("/.well-known", getWellKnown);
router.get("/.well-known/stores", getKnownStores);

// Apply the parseUdi middleware to all routes that require UDI
router.use(parseUdi);

// Middleware to choose the appropriate controller based on the presence of 'key'
router.use((req, res, next) => {
  const method = req.method.toLowerCase(); // 'get' or 'head'

  if (method === 'get' || method === 'head') {
    // Determine if 'key' is present and not just '/'
    // @ts-ignore
    const hasKey = req.key && req.key !== '/';

    if (hasKey) {
      // Key is present; use the appropriate key controller
      if (method === 'get') {
        return getKey(req, res, next);
      } else if (method === 'head') {
        return headKey(req, res, next);
      }
    } else {
      // No key; use the store index controllers
      if (method === 'get') {
        return getKeysIndex(req, res, next);
      } else if (method === 'head') {
        return headStore(req, res, next);
      }
    }
  } else {
    // For other HTTP methods, proceed to the next middleware or route handler
    next();
  }
});

export { router as storeRoutes };
