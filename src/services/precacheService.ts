// @ts-ignore
import { DataStore, getStoresList } from "dig-sdk";

export const precacheStoreInfo = async () => {
  const storeList = getStoresList();
  for (const storeId of storeList) {
    try {
      console.log(`Precaching store info for ${storeId}`);
      const dataStore = DataStore.from(storeId);
      await dataStore.fetchCoinInfo();
    } catch (e) {
      console.error(`Error precaching store info for ${storeId}`, e);
    }

  }
};
