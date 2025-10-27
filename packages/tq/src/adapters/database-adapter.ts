import {MongoDbAdapter} from "./MongoDbAdapter.js";
import {IDatabaseAdapter} from "./IDatabaseAdapter.js";

/**
 * Singleton database adapter instance
 * Can be replaced with different implementations (e.g., PostgreSQL, Redis, etc.)
 */
const databaseAdapter: IDatabaseAdapter = new MongoDbAdapter();

// Initialize on first import
databaseAdapter.initialize().catch(console.error);

export default databaseAdapter;