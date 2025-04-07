import FileDBAdapter from './FileDBAdapter.js';
import MongoDBAdapter from './MongoDBAdapter.js';

// Export all adapters
export {default as FileDBAdapter} from './FileDBAdapter.js';
export {default as MongoDBAdapter} from './MongoDBAdapter.js';

export default {FileDBAdapter, MongoDBAdapter}