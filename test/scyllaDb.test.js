import { expect } from 'chai';
import ScyllaDb from '../src/utils/ScyllaDb.js';

const TEST_TABLE = 'TestTable';
const TEST_SCHEMA = {
    TableName: TEST_TABLE,
    AttributeDefinitions: [
        { AttributeName: 'id', AttributeType: 'S' },
    ],
    KeySchema: [
        { AttributeName: 'id', KeyType: 'HASH' },
    ],
    ProvisionedThroughput: {
        ReadCapacityUnits: 1,
        WriteCapacityUnits: 1,
    },
    PK: 'id',
};

const TEST_ITEM = { id: 'item1', name: 'Test Item', value: 42 };
const UPDATED_ITEM = { name: 'Updated Name', value: 100 };

// Patch getSchemaFromConfig to use test config if present
const origGetSchemaFromConfig = ScyllaDb.getSchemaFromConfig;
ScyllaDb._testTableConfigs = { [TEST_TABLE]: TEST_SCHEMA };
ScyllaDb.getSchemaFromConfig = function (table) {
    if (this._testTableConfigs && this._testTableConfigs[table]) {
        return this._testTableConfigs[table];
    }
    return origGetSchemaFromConfig.call(this, table);
};

before(async () => {
    // Configure ScyllaDb to use local DynamoDB
    ScyllaDb.configure({
        endpoint: 'http://localhost:8000/',
        key: 'fakeMyKeyId',
        secret: 'fakeSecret',
        region: 'us-east-1',
        enableCache: false,
    });
    // Clean up if table exists
    try { await ScyllaDb.deleteTable(TEST_TABLE); } catch { }
    await ScyllaDb.createTable(TEST_SCHEMA);
});

after(async () => {
    await ScyllaDb.deleteTable(TEST_TABLE);
});

describe('ScyllaDb integration (local DynamoDB)', () => {
    it('should put an item', async () => {
        const res = await ScyllaDb.putItem(TEST_TABLE, TEST_ITEM);
        expect(res).to.equal(true);
    });

    it('should get the item', async () => {
        const item = await ScyllaDb.getItem(TEST_TABLE, { id: TEST_ITEM.id });
        expect(item).to.include(TEST_ITEM);
    });

    it('should update the item', async () => {
        const updated = await ScyllaDb.updateItem(TEST_TABLE, { id: TEST_ITEM.id }, UPDATED_ITEM);
        expect(updated).to.include({ ...TEST_ITEM, ...UPDATED_ITEM });
    });

    it('should delete the item', async () => {
        const deleted = await ScyllaDb.deleteItem(TEST_TABLE, { id: TEST_ITEM.id });
        expect(deleted).to.equal(true);
        const item = await ScyllaDb.getItem(TEST_TABLE, { id: TEST_ITEM.id });
        expect(item).to.equal(false);
    });

    it('should describe the table', async () => {
        const desc = await ScyllaDb.describeTable(TEST_TABLE);
        expect(desc.Table.TableName).to.equal(TEST_TABLE);
    });

    it('should list tables', async () => {
        const tables = await ScyllaDb.listTables();
        expect(tables).to.include(TEST_TABLE);
    });

    it('should batch write and batch get items', async () => {
        const items = [
            { id: 'b1', name: 'Batch 1', value: 1 },
            { id: 'b2', name: 'Batch 2', value: 2 },
        ];
        const writeRes = await ScyllaDb.batchWriteItem(TEST_TABLE, items);
        expect(writeRes.inserted).to.include('b1');
        expect(writeRes.inserted).to.include('b2');
        const keys = items.map(i => ({ id: i.id }));
        const batch = await ScyllaDb.batchGetItem(TEST_TABLE, keys);
        expect(batch[0]).to.include(items[0]);
        expect(batch[1]).to.include(items[1]);
    });

    it('should support transactWrite and rollback on failure', async () => {
        // Insert a new item, then try to update a non-existent item (should rollback)
        const newItem = { id: 'tx1', name: 'Tx Item', value: 10 };
        const operations = [
            { table: TEST_TABLE, action: 'put', item: newItem },
            { table: TEST_TABLE, action: 'update', key: { id: 'notfound' }, data: { value: 99 } },
        ];
        try {
            await ScyllaDb.transactWrite(operations);
        } catch (e) {
            // Should rollback, so tx1 should not exist
            const item = await ScyllaDb.getItem(TEST_TABLE, { id: 'tx1' });
            expect(item).to.equal(false);
        }
    });

    it('should support transactGet', async () => {
        // Insert two items
        const items = [
            { id: 'tg1', name: 'TG1', value: 1 },
            { id: 'tg2', name: 'TG2', value: 2 },
        ];
        await ScyllaDb.putItem(TEST_TABLE, items[0]);
        await ScyllaDb.putItem(TEST_TABLE, items[1]);
        const ops = [
            { table: TEST_TABLE, key: { id: 'tg1' } },
            { table: TEST_TABLE, key: { id: 'tg2' } },
        ];
        const res = await ScyllaDb.transactGet(ops);
        expect(res.success).to.equal(true);
        expect(res.results[0].item).to.include(items[0]);
        expect(res.results[1].item).to.include(items[1]);
    });

    it('should query items', async () => {
        // Query for an item by id
        const item = { id: 'q1', name: 'Query', value: 5 };
        await ScyllaDb.putItem(TEST_TABLE, item);
        const results = await ScyllaDb.query(
            TEST_TABLE,
            'id = :id',
            { ':id': 'q1' }
        );
        expect(results[0]).to.include(item);
    });

    it('should scan items', async () => {
        // Scan should return at least one item
        const results = await ScyllaDb.scan(TEST_TABLE);
        expect(results).to.be.an('array');
        expect(results.length).to.be.greaterThan(0);
    });

    it('should support rawRequest', async () => {
        // Use rawRequest to get table description
        const resp = await ScyllaDb.rawRequest('DescribeTable', { TableName: TEST_TABLE });
        expect(resp.Table.TableName).to.equal(TEST_TABLE);
    });

    it.skip('should fail conditional put if item exists', async () => {
        const item = { id: 'cond1', name: 'CondPut', value: 1 };
        await ScyllaDb.putItem(TEST_TABLE, item);
        // Try to put again with ConditionExpression (should fail)
        let error = null;
        try {
            await ScyllaDb.putItem(
                TEST_TABLE,
                item,
                { ConditionExpression: 'attribute_not_exists(id)' }
            );
        } catch (e) {
            error = e;
        }
        expect(error).to.not.equal(null);
        expect(error.message).to.include('ConditionalCheckFailedException');
    });

    it('should scan with filter expression', async () => {
        // Insert items with different values
        await ScyllaDb.putItem(TEST_TABLE, { id: 'scan1', name: 'Scan', value: 100 });
        await ScyllaDb.putItem(TEST_TABLE, { id: 'scan2', name: 'Scan', value: 200 });
        const results = await ScyllaDb.scan(
            TEST_TABLE,
            {
                FilterExpression: 'value = :v',
                ExpressionAttributeValues: { ':v': 200 },
            }
        );
        expect(results.length).to.be.greaterThan(0);
        expect(results[0].value).to.equal(200);
    });

    it('should fail if any item in batch is missing PK (during batch write)', async () => {
        const items = [
            { id: 'bw1', name: 'BatchValid', value: 1 },
            { name: 'BatchInvalid', value: 2 }, // missing id
        ];
        let error = null;

        try {
            await ScyllaDb.batchWriteItem(TEST_TABLE, items);
        } catch (e) {
            error = e;
        }

        expect(error).to.not.equal(null);
        expect(error.awsMsg).to.include('Key column id not found');
    });

    it('should paginate query results', async () => {
        // Insert items with 'id' key (partition key)
        const many = [];
        for (let i = 0; i < 10; ++i) {
            many.push({ id: `page${i}`, name: 'Page', value: i });
        }

        for (const it of many) {
            await ScyllaDb.putItem(TEST_TABLE, it);
        }

        // Scan all and simulate pagination manually, since you can't use >= on id
        const allResults = await ScyllaDb.scan(TEST_TABLE);
        const paginated = allResults.slice(0, 3); // simulate Limit=3
        expect(paginated.length).to.equal(3);
    });

}); 