import {Cluster} from "ioredis";
import {CacheKey} from "memoose-js/dist/adapters/base";
import {ClusterOptions} from "ioredis/built/cluster/ClusterOptions";
import {ClusterNode} from "ioredis/built/cluster";
import {BaseCacheProvider} from "memoose-js";

class RedisClusterCacheProvider implements BaseCacheProvider<string> {

    readonly storesAsObj: boolean = false
    private readonly client_client: Cluster;
    private readonly connected_promise: any;
    private readonly connect: boolean;

    constructor(name: string, config: { nodes: ClusterNode[], options: ClusterOptions }, connect: boolean = true) {
        const {nodes, options} = config
        this.client_client = new Cluster(nodes, options);
        this.connect = connect;
        if (connect)
            this.connected_promise = this.client_client.connect();
        else
            this.connected_promise = Promise.resolve("told not to connect");

        const errorOrCloseCB = (...args: any[]) => {
            console.log(`Error in RedisClient: ${name}.`, "\r\n", ...args);
            process.exit(55666);
        }
        this.client_client.on("end", errorOrCloseCB.bind(null, "end"))
        this.client_client.on("error", errorOrCloseCB.bind(null, "error"));
        this.client_client.on("close", errorOrCloseCB.bind(null, "close"));
        this.client_client.on("finish", errorOrCloseCB.bind(null, "finish"));
    }

    get client(): Cluster {
        return this.client_client;
    }

    name(): string {
        return "redis";
    }

    getClientConnectionPromise() {
        if (this.connect)
            return this.connected_promise;
        else
            throw new Error("shouldnt call as client initialised with connect=false");
    }

    get(key: string) {
        return this.client_client.get(key);
    }

    set(key: string, value: string, ttl: number = -1) {
        if (ttl > 0)
            return this.client_client.set(key, value, "EX", ttl);
        else
            return this.client_client.set(key, value);
    }

    del(...keys: string[]) {
        return this.client_client.del(...keys);
    }

    awaitTillReady() {
        return new Promise((resolve, reject) => {
            this.client_client.once("ready", resolve);
            this.client_client.once("error", reject);
        })
    }

    pipeline() {
        return this.client_client.pipeline() as any;
    }

    expire(key: string, ttl: number) {
        return this.client_client.expire(key, ttl) as Promise<0 | 1>;
    }

    mget(...keys: string[]) {
        return this.client_client.mget(...keys);
    }

    mset(...keyValues: [CacheKey, string][]) {
        return this.client_client.mset(...keyValues as any);
    }

    exists(...keys: string[]) {
        return this.client_client.exists(...keys);
    }

    lpush(key: string, ...values: string[]) {
        return this.client_client.lpush(key, ...values);
    }

    llen(key: string) {
        return this.client_client.llen(key);
    }

    scard(key: string) {
        return this.client_client.scard(key);
    }

    sismember(key: string, member: string) {
        return this.client_client.sismember(key, member);
    }

    sadd(key: string, member: any) {
        return this.client_client.sadd(key, member);
    }

    srem(key: string, member: any) {
        return this.client_client.srem(key, member);
    }

    smembers(key: string) {
        return this.client_client.smembers(key);
    }

    rpush(key: string, ...values: any[]) {
        return this.client_client.rpush(key, ...values);
    }

    lrange(key: string, start: number, stop: number) {
        return this.client_client.lrange(key, start, stop);
    }

    ping() {
        return this.client_client.ping();
    }

    subscribe(...channels: any[]) {
        return this.client_client.subscribe(...channels);
    }

    on(event: string, listener: (...args: any[]) => void) {
        return this.client_client.on(event, listener);
    }

    publish(channel: string, message: string) {
        return this.client_client.publish(channel, message);
    }

    flushdb() {
        return this.client_client.flushdb();
    }

    lpop(key: string) {
        return this.client_client.lpop(key)
    }

    decrby(key: string, count: number) {
        return this.client_client.decrby(key, count);
    }
}


export default RedisClusterCacheProvider
