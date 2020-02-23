import { RPCError } from "./server";

export * from "./server";
export * from "./client";

export type rpc<T,K> = (data: T) => Promise<K | RPCError>;
export type SSLCred = [ Buffer | string, Buffer | string, Buffer | string ] | undefined;