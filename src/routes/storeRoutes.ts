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

// Route to display the index of all stores or serve the index.html file if it exists
router.get("/", getKeysIndex);
router.head("/", headStore);

// Route to stream the value of a specific key
router.get("*", getKey);
router.head("*", headKey);

export { router as storeRoutes };
