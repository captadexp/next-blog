/**
 * RPC method definitions (for typed RPC calls)
 * This is the single source of truth for RPC types used by both client and server
 * Plugins can augment this interface to add their own RPC methods
 */
export interface RPCMethods {
    [rpcName: string]: {
        request: any;
        response: any;
    };
}

export type * from "./types"