import * as urns from 'urns';

class Udi {
    readonly chainName: string;
    readonly storeId: string;
    readonly rootHash: string | null;
    readonly resourceKey: string | null;
    static readonly nid: string = "dig";
    static readonly namespace: string = `urn:${Udi.nid}`;

    constructor(chainName: string, storeId: string, rootHash: string | null = null, resourceKey: string | null = null) {
        this.chainName = chainName ?? "chia";
        this.storeId = storeId;
        this.rootHash = rootHash;
        this.resourceKey = resourceKey;
    }

    fromRootHash(rootHash: string): Udi {
        return new Udi(this.chainName, this.storeId, rootHash, this.resourceKey);
    }

    static fromUrn(urn: string): Udi {
        const parsedUrn = urns.parseURN(urn);
        if (parsedUrn.nid !== Udi.nid) {
            throw new Error(`Invalid namespace: ${parsedUrn.nid}`);
        }

        const parts = parsedUrn.nss.split(':');
        if (parts.length < 2) {
            throw new Error(`Invalid URN format: ${parsedUrn.nss}`);
        }
        const chainName = parts[0];
        const storeId = parts[1];
        let rootHash: string | null = null;
        let resourceKey: string | null = null;
        if (parts.length > 2) {
            rootHash = parts[2];
            if (parts.length > 3) {
                resourceKey = parts[3];
            }
        }
        return new Udi(chainName, storeId, rootHash, resourceKey);
    }

    toUrn(): string {
        let urn = `${Udi.namespace}:${this.chainName}:${this.storeId}`;
        if (this.rootHash !== null) {
            urn += `:${this.rootHash}`;
        }
        if (this.resourceKey !== null) {
            urn += `/${this.resourceKey}`;
        }
        return urn;
    }

    equals(other: Udi): boolean {
        return this.storeId === other.storeId &&
            this.chainName === other.chainName &&
            this.rootHash === other.rootHash &&
            this.resourceKey === other.resourceKey;
    }

    toString(): string {
        return this.toUrn();
    }
}

export { Udi };