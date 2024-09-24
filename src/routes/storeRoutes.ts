import { Router } from "express";
import {
  getStoresIndex,
  getKeysIndex,
  getKey,
  headKey,
  headStore
} from "../controllers/storeController";
import { parseUdi } from "../middleware/parseUdi";
import { getWellKnown, getKnownStores } from "../controllers/wellKnown";

const router = Router();

router.get("/.well-known", getWellKnown);
router.get("/.well-known/stores", getKnownStores);

// Route to display the index of all stores
router.get("/", getStoresIndex);


// Route to display the index of keys or serve the index.html file if it exists
router.head("/:storeId", parseUdi, headStore);
router.get("/:storeId", parseUdi, getKeysIndex);

// Route to stream the value of a specific key
router.get("/:storeId/*", parseUdi, getKey);
router.head("/:storeId/*", parseUdi, headKey);

export { router as storeRoutes };
