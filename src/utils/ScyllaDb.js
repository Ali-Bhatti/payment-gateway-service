import dotenv from 'dotenv';
dotenv.config();

import { Client, auth } from 'cassandra-driver';

/**
 * ScyllaDB Utility Class
 * 
 * Provides database operations for the PaymentGateway service
 * Supports querying, CRUD operations, and table creation with GSI support
 */
class ScyllaDb {
    constructor() {
        this.client = null;
        this.keyspace = process.env.SCYLLA_KEYSPACE || 'payment_gateway';
        this.contactPoints = process.env.SCYLLA_CONTACT_POINTS?.split(',') || ['localhost'];
        this.localDataCenter = process.env.SCYLLA_LOCAL_DATACENTER || 'datacenter1';
        this.credentials = {
            username: process.env.SCYLLA_USERNAME,
            password: process.env.SCYLLA_PASSWORD
        };
    }

    /**
     * Initialize the ScyllaDB connection
     */
    async connect() {
        if (this.client) {
            return this.client;
        }

        const authProvider = this.credentials.username && this.credentials.password
            ? new auth.PlainTextAuthProvider(this.credentials.username, this.credentials.password)
            : undefined;

        this.client = new Client({
            contactPoints: this.contactPoints,
            localDataCenter: this.localDataCenter,
            keyspace: this.keyspace,
            ...(authProvider && { authProvider: authProvider }),
            pooling: {
                maxConnectionsPerHost: 10,
                maxRequestsPerConnection: 32768
            },
            socketOptions: {
                connectTimeout: 10000,
                readTimeout: 10000
            }
        });

        try {
            await this.client.connect();
            console.log('✅ Connected to ScyllaDB');
            return this.client;
        } catch (error) {
            console.error('❌ Failed to connect to ScyllaDB:', error.message);
            throw error;
        }
    }

    /**
     * Ensure connection is established
     */
    async ensureConnection() {
        if (!this.client) {
            await this.connect();
        }
        return this.client;
    }

    /**
     * Create a table with the specified schema
     * @param {Object} schema - Table schema definition
     */
    static async createTable(schema) {
        const instance = new ScyllaDb();
        const client = await instance.ensureConnection();

        try {
            // Build CREATE TABLE statement
            const tableName = schema.TableName;
            const keySchema = schema.KeySchema;
            const attributeDefinitions = schema.AttributeDefinitions;

            // Build primary key
            const partitionKey = keySchema.find(k => k.KeyType === 'HASH')?.AttributeName;
            const clusteringKey = keySchema.find(k => k.KeyType === 'RANGE')?.AttributeName;

            let createTableQuery = `CREATE TABLE IF NOT EXISTS ${tableName} (`;

            // Add all attributes
            const attributes = attributeDefinitions.map(attr => {
                const type = attr.AttributeType === 'S' ? 'text' : 'uuid';
                return `${attr.AttributeName} ${type}`;
            });

            createTableQuery += attributes.join(', ');

            // Add primary key
            if (partitionKey && clusteringKey) {
                createTableQuery += `, PRIMARY KEY ((${partitionKey}), ${clusteringKey})`;
            } else if (partitionKey) {
                createTableQuery += `, PRIMARY KEY (${partitionKey})`;
            }

            createTableQuery += ')';

            // Add table options
            if (schema.BillingMode === 'PAY_PER_REQUEST') {
                createTableQuery += ' WITH compaction = { \'class\': \'SizeTieredCompactionStrategy\' }';
            }

            await client.execute(createTableQuery);
            console.log(`✅ Table ${tableName} created successfully`);

            // Create GSI if specified
            if (schema.GlobalSecondaryIndexes) {
                for (const gsi of schema.GlobalSecondaryIndexes) {
                    await instance.createGSI(tableName, gsi);
                }
            }

        } catch (error) {
            console.error(`❌ Failed to create table ${schema.TableName}:`, error.message);
            throw error;
        }
    }

    /**
     * Create a Global Secondary Index
     * @param {string} tableName - Name of the table
     * @param {Object} gsi - GSI definition
     */
    async createGSI(tableName, gsi) {
        try {
            const indexName = gsi.IndexName;
            const keySchema = gsi.KeySchema;
            const projection = gsi.Projection;

            // Build CREATE INDEX statement
            let createIndexQuery = `CREATE INDEX IF NOT EXISTS ${indexName} ON ${tableName} (`;

            const indexColumns = keySchema.map(k => k.AttributeName);
            createIndexQuery += indexColumns.join(', ');
            createIndexQuery += ')';

            await this.client.execute(createIndexQuery);
            console.log(`✅ GSI ${indexName} created successfully for table ${tableName}`);

        } catch (error) {
            console.error(`❌ Failed to create GSI ${gsi.IndexName}:`, error.message);
            throw error;
        }
    }

    /**
     * Query data from a table with optional GSI support
     * @param {string} tableName - Name of the table
     * @param {string} condition - WHERE condition (e.g., '#pk = :pk AND created_at BETWEEN :start AND :end')
     * @param {Object} params - Query parameters
     * @param {Object} options - Query options including indexName for GSI
     */
    async query(tableName, condition, params = {}, options = {}) {
        const client = await this.ensureConnection();

        try {
            // Build SELECT query
            let query = `SELECT * FROM ${tableName}`;

            // Add WHERE clause if condition provided
            if (condition) {
                query += ` WHERE ${condition}`;
            }

            // Add ORDER BY for clustering key if not using GSI
            if (!options.indexName) {
                query += ' ORDER BY sk';
            }

            // Add LIMIT for performance
            query += ' LIMIT 1000';

            // Execute query
            const result = await client.execute(query, params, { prepare: true });

            return result.rows || [];

        } catch (error) {
            console.error(`❌ Query failed on table ${tableName}:`, error.message);
            throw error;
        }
    }

    /**
     * Insert a new item into the table
     * @param {string} tableName - Name of the table
     * @param {Object} item - Item data to insert
     */
    async putItem(tableName, item) {
        const client = await this.ensureConnection();

        try {
            // Build INSERT statement
            const columns = Object.keys(item);
            const values = columns.map(col => '?');

            const query = `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${values.join(', ')})`;

            // Execute insert
            const params = columns.map(col => item[col]);
            await client.execute(query, params, { prepare: true });

            console.log(`✅ Item inserted successfully into ${tableName}`);
            return item;

        } catch (error) {
            console.error(`❌ Failed to insert item into ${tableName}:`, error.message);
            throw error;
        }
    }

    /**
     * Update an existing item in the table
     * @param {string} tableName - Name of the table
     * @param {string} pk - Partition key value
     * @param {string} sk - Sort key value
     * @param {Object} updates - Fields to update
     */
    async updateItem(tableName, pk, sk, updates) {
        const client = await this.ensureConnection();

        try {
            // Build UPDATE statement
            const setClause = Object.keys(updates).map(key => `${key} = ?`).join(', ');
            const query = `UPDATE ${tableName} SET ${setClause} WHERE pk = ? AND sk = ?`;

            // Prepare parameters
            const params = [...Object.values(updates), pk, sk];

            // Execute update
            await client.execute(query, params, { prepare: true });

            console.log(`✅ Item updated successfully in ${tableName}`);
            return { pk, sk, ...updates };

        } catch (error) {
            console.error(`❌ Failed to update item in ${tableName}:`, error.message);
            throw error;
        }
    }

    /**
     * Delete an item from the table
     * @param {string} tableName - Name of the table
     * @param {string} pk - Partition key value
     * @param {string} sk - Sort key value
     */
    async deleteItem(tableName, pk, sk) {
        const client = await this.ensureConnection();

        try {
            const query = `DELETE FROM ${tableName} WHERE pk = ? AND sk = ?`;
            await client.execute(query, [pk, sk], { prepare: true });

            console.log(`✅ Item deleted successfully from ${tableName}`);
            return { pk, sk };

        } catch (error) {
            console.error(`❌ Failed to delete item from ${tableName}:`, error.message);
            throw error;
        }
    }

    /**
     * Batch write operations
     * @param {Array} operations - Array of operations to perform
     */
    async batchWrite(operations) {
        const client = await this.ensureConnection();

        try {
            const batch = [];

            for (const operation of operations) {
                const { type, tableName, item, pk, sk, updates } = operation;

                switch (type) {
                    case 'put':
                        batch.push(this.putItem(tableName, item));
                        break;
                    case 'update':
                        batch.push(this.updateItem(tableName, pk, sk, updates));
                        break;
                    case 'delete':
                        batch.push(this.deleteItem(tableName, pk, sk));
                        break;
                    default:
                        throw new Error(`Unknown operation type: ${type}`);
                }
            }

            const results = await Promise.all(batch);
            console.log(`✅ Batch operation completed: ${results.length} operations`);
            return results;

        } catch (error) {
            console.error('❌ Batch operation failed:', error.message);
            throw error;
        }
    }

    /**
     * Close the database connection
     */
    async disconnect() {
        if (this.client) {
            await this.client.shutdown();
            this.client = null;
            console.log('✅ Disconnected from ScyllaDB');
        }
    }

    /**
     * Health check for the database connection
     */
    async healthCheck() {
        try {
            const client = await this.ensureConnection();
            await client.execute('SELECT release_version FROM system.local');
            return { status: 'healthy', timestamp: new Date().toISOString() };
        } catch (error) {
            return { status: 'unhealthy', error: error.message, timestamp: new Date().toISOString() };
        }
    }
}

// Create and export a singleton instance
const scyllaDb = new ScyllaDb();

// Export both the class and the singleton instance
export default scyllaDb;
export { ScyllaDb };
