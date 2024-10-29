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

    fromResourceKey(resourceKey: string | null): Udi {
        return new Udi(this.chainName, this.storeId, this.rootHash, resourceKey);
    }

    static fromUrn(urn: string): Udi {
        const parsedUrn = urns.parseURN(urn);
        if (parsedUrn.nid !== Udi.nid) {
            throw new Error(`Invalid namespace: ${parsedUrn.nid}`);
        }

        const parts = parsedUrn.nss.split(':');
        // at a minimum we need chain name and store id
        if (parts.length < 2) {
            throw new Error(`Invalid URN format: ${parsedUrn.nss}`);
        }

        // this is what a nss looks like
        //"chia:store id:optional_roothash/optional path/resource key"
        const chainName = parts[0];
        const storeId = parts[1].split('/')[0]; // need to strip off the optional path component

        // root hash will always be the part after the second :
        let rootHash: string | null = null;
        if (parts.length > 2) {
            rootHash = parts[2].split('/')[0]; // need to strip off the optional path component
        }

        // now see if we have a path component which will always follow the first /
        const pathParts = parsedUrn.nss.split('/');
        let resourceKey: string | null = null;
        if (pathParts.length > 1) {
            resourceKey = pathParts.slice(1).join('/');
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