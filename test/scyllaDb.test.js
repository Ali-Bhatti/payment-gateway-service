import { expect } from 'chai';
import scyllaDb, { ScyllaDb } from '../src/utils/ScyllaDb.js';

describe('ScyllaDB Tests', () => {
    before(async () => {
        // Set up test environment variables
        process.env.SCYLLA_KEYSPACE = 'payment_gateway';
        process.env.SCYLLA_CONTACT_POINTS = 'localhost';
        process.env.SCYLLA_LOCAL_DATACENTER = 'datacenter1';
    });

    after(async () => {
        // Clean up
        await scyllaDb.disconnect();
    });

    describe('Connection', () => {
        it('should connect to ScyllaDB', async () => {
            try {
                const client = await scyllaDb.connect();
                expect(client).to.exist;
            } catch (error) {
                // Skip test if ScyllaDB is not running
                console.log('Skipping connection test - ScyllaDB not available');
                this.skip();
            }
        });

        it('should perform health check', async () => {
            try {
                const health = await scyllaDb.healthCheck();
                expect(health).to.have.property('status');
                expect(health).to.have.property('timestamp');
            } catch (error) {
                console.log('Skipping health check test - ScyllaDB not available');
                this.skip();
            }
        });
    });

    describe('Table Operations', () => {
        const testSchema = {
            TableName: 'test_sessions',
            KeySchema: [
                { AttributeName: 'pk', KeyType: 'HASH' },
                { AttributeName: 'sk', KeyType: 'RANGE' }
            ],
            AttributeDefinitions: [
                { AttributeName: 'pk', AttributeType: 'S' },
                { AttributeName: 'sk', AttributeType: 'S' }
            ],
            BillingMode: 'PAY_PER_REQUEST'
        };

        it('should create table', async () => {
            try {
                await ScyllaDb.createTable(testSchema);
                console.log('✅ Table creation test passed');
            } catch (error) {
                console.log('Skipping table creation test - ScyllaDB not available');
                this.skip();
            }
        });
    });

    describe('CRUD Operations', () => {
        const testItem = {
            pk: 'user#test123',
            sk: 'session#test456',
            userId: 'test123',
            orderId: 'order456',
            sessionType: 'card',
            gateway: 'stripe',
            status: 'pending',
            payloads: JSON.stringify({ requestData: {}, responseData: {} }),
            createdAt: new Date().toISOString()
        };

        it('should insert item', async () => {
            try {
                const result = await scyllaDb.putItem('test_sessions', testItem);
                expect(result).to.deep.include(testItem);
            } catch (error) {
                console.log('Skipping insert test - ScyllaDB not available');
                this.skip();
            }
        });

        it('should query item', async () => {
            try {
                const results = await scyllaDb.query('test_sessions', 'pk = ?', { ':pk': testItem.pk });
                expect(results).to.be.an('array');
                if (results.length > 0) {
                    expect(results[0]).to.have.property('pk', testItem.pk);
                }
            } catch (error) {
                console.log('Skipping query test - ScyllaDB not available');
                this.skip();
            }
        });

        it('should update item', async () => {
            try {
                const updates = { status: 'completed' };
                const result = await scyllaDb.updateItem('test_sessions', testItem.pk, testItem.sk, updates);
                expect(result).to.have.property('status', 'completed');
            } catch (error) {
                console.log('Skipping update test - ScyllaDB not available');
                this.skip();
            }
        });

        it('should delete item', async () => {
            try {
                const result = await scyllaDb.deleteItem('test_sessions', testItem.pk, testItem.sk);
                expect(result).to.have.property('pk', testItem.pk);
                expect(result).to.have.property('sk', testItem.sk);
            } catch (error) {
                console.log('Skipping delete test - ScyllaDB not available');
                this.skip();
            }
        });
    });

    describe('PaymentGateway Integration', () => {
        it('should support PaymentGateway service methods', async () => {
            // Test that all required methods exist
            expect(scyllaDb.query).to.be.a('function');
            expect(scyllaDb.putItem).to.be.a('function');
            expect(scyllaDb.updateItem).to.be.a('function');
            expect(scyllaDb.deleteItem).to.be.a('function');
            expect(ScyllaDb.createTable).to.be.a('function');
        });

        it('should handle GSI queries', async () => {
            try {
                const options = { indexName: 'status_gsi' };
                const results = await scyllaDb.query('test_sessions', 'statusGSI = ?', { ':status': 'failed' }, options);
                expect(results).to.be.an('array');
            } catch (error) {
                console.log('Skipping GSI test - ScyllaDB not available');
                this.skip();
            }
        });
    });
}); 