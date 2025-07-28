import dotenv from 'dotenv';
dotenv.config();
import ScyllaDb from '../../utils/ScyllaDb.js'

const isTestEnv = ['test'].includes(process.env.NODE_ENV);
const TABLE_SUFFIX = isTestEnv ? '_test' : '';

const schemas = {
  ['paymentGateway_sessions' + TABLE_SUFFIX]: {
    TableName: 'paymentGateway_sessions' + TABLE_SUFFIX,
    KeySchema: [
      { AttributeName: 'pk', KeyType: 'HASH' },
      { AttributeName: 'sk', KeyType: 'RANGE' }
    ],
    AttributeDefinitions: [
      { AttributeName: 'pk', AttributeType: 'S' },
      { AttributeName: 'sk', AttributeType: 'S' }
    ],
    BillingMode: 'PAY_PER_REQUEST',
    PK: 'pk',
    SK: 'sk'
  },
  ['paymentGateway_transactions' + TABLE_SUFFIX]: {
    TableName: 'paymentGateway_transactions' + TABLE_SUFFIX,
    KeySchema: [
      { AttributeName: 'pk', KeyType: 'HASH' },
      { AttributeName: 'sk', KeyType: 'RANGE' }
    ],
    AttributeDefinitions: [
      { AttributeName: 'pk', AttributeType: 'S' },
      { AttributeName: 'sk', AttributeType: 'S' },
      { AttributeName: 'statusGSI', AttributeType: 'S' },
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: 'status_gsi',
        KeySchema: [{ AttributeName: 'statusGSI', KeyType: 'HASH' }],
        Projection: { ProjectionType: 'ALL' }
      }
    ],
    BillingMode: 'PAY_PER_REQUEST',
    PK: 'pk',
    SK: 'sk'
  },
  ['paymentGateway_schedules' + TABLE_SUFFIX]: {
    TableName: 'paymentGateway_schedules' + TABLE_SUFFIX,
    KeySchema: [
      { AttributeName: 'pk', KeyType: 'HASH' },
      { AttributeName: 'sk', KeyType: 'RANGE' }
    ],
    AttributeDefinitions: [
      { AttributeName: 'pk', AttributeType: 'S' },
      { AttributeName: 'sk', AttributeType: 'S' },
      { AttributeName: 'subscriptionId', AttributeType: 'S' }
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: 'schedule_subscription_gsi',
        KeySchema: [{ AttributeName: 'subscriptionId', KeyType: 'HASH' }],
        Projection: { ProjectionType: 'ALL' }
      }
    ],
    BillingMode: 'PAY_PER_REQUEST',
    PK: 'pk',
    SK: 'sk'
  },
  ['paymentGateway_tokens' + TABLE_SUFFIX]: {
    TableName: 'paymentGateway_tokens' + TABLE_SUFFIX,
    KeySchema: [
      { AttributeName: 'pk', KeyType: 'HASH' },
      { AttributeName: 'sk', KeyType: 'RANGE' }
    ],
    AttributeDefinitions: [
      { AttributeName: 'pk', AttributeType: 'S' },
      { AttributeName: 'sk', AttributeType: 'S' },
      { AttributeName: 'expiry', AttributeType: 'S' }
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: 'expiry_gsi',
        KeySchema: [{ AttributeName: 'expiry', KeyType: 'HASH' }],
        Projection: { ProjectionType: 'ALL' }
      }
    ],
    BillingMode: 'PAY_PER_REQUEST',
    PK: 'pk',
    SK: 'sk'
  },
  ['paymentGateway_webhooks' + TABLE_SUFFIX]: {
    TableName: 'paymentGateway_webhooks' + TABLE_SUFFIX,
    KeySchema: [
      { AttributeName: 'pk', KeyType: 'HASH' },
      { AttributeName: 'sk', KeyType: 'RANGE' }
    ],
    AttributeDefinitions: [
      { AttributeName: 'pk', AttributeType: 'S' },
      { AttributeName: 'sk', AttributeType: 'S' },
      { AttributeName: 'subscriptionId', AttributeType: 'S' }
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: 'webhook_subscription_gsi',
        KeySchema: [{ AttributeName: 'subscriptionId', KeyType: 'HASH' }],
        Projection: { ProjectionType: 'ALL' }
      }
    ],
    BillingMode: 'PAY_PER_REQUEST',
    PK: 'pk',
    SK: 'sk'
  }
}

async function createTables() {

  for (const [tableName, schema] of Object.entries(schemas)) {
    //console.log("for table---->", tableName);
    await ScyllaDb.createTable(schema).then(() =>
      console.log(`✅ Created table: ${tableName}`)
    ).catch(err =>
      console.error(`❌ Failed to create ${tableName}:`, err.message)
    )
  }
}

async function deleteTables() {
  for (const [tableName] of Object.entries(schemas)) {
    try {
      await ScyllaDb.deleteTable(tableName);
      console.log(`✅ Deleted table: ${tableName}`)
    } catch (err) {
      console.error(`Failed to delete table ${tableName}:`, err.message);
    }
  }
}

// createTables()

export { schemas };
export default {
  createTables,
  deleteTables
};