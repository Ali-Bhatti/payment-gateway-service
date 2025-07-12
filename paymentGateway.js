/**
 * payment_gateway_service.js
 * Node.js class for CRUD + query operations on payment gateway data
 * (scylladb w/ dynamo alternator, no materialized views)
 */

import scylla_db from '../utils/ScyllaDb.js'

const table_names = {
  sessions: 'paymentGateway_sessions',
  transactions: 'paymentGateway_transactions',
  tokens: 'paymentGateway_tokens',
  schedules: 'paymentGateway_schedules',
  webhooks: 'paymentGateway_webhooks'
}

const gsi_attribute_names = {
  subscription_pk: '#gsi_subscription_pk',
  order_pk: '#gsi_order_pk',
  status_pk: '#gsi_status_pk',
  expiry_pk: '#gsi_expiry_pk'
}

const gsi_index_names = {
  subscription_gsi: 'gsi1',
  order_gsi: 'gsi1',
  status_gsi: 'gsi1',
  expiry_gsi: 'gsi1'
}

/**
 * payment_gateway_service
 *
 * Notes:
 * - Required parameters: user_id, order_id, subscription_id (as applicable per method)
 * - Optional parameters: start_date, end_date (ISO8601 date strings for filtering)
 */
class payment_gateway_service {

  /**
   * Get all transactions for a user in a date range
   * @param {string} user_id - required
   * @param {string} start_date - optional
   * @param {string} end_date - optional
   */
  static async get_user_transactions(user_id, start_date, end_date) {
    return scylla_db.query(table_names.transactions,
      '#pk = :pk AND created_at BETWEEN :start AND :end',
      { ':pk': `user#${user_id}`, ':start': start_date, ':end': end_date }
    )
  }

  /**
   * Get all schedules for a user in a date range
   * @param {string} user_id - required
   * @param {string} start_date - optional
   * @param {string} end_date - optional
   */
  static async get_user_schedules(user_id, start_date, end_date) {
    return scylla_db.query(table_names.schedules,
      '#pk = :pk AND created_at BETWEEN :start AND :end',
      { ':pk': `user#${user_id}`, ':start': start_date, ':end': end_date }
    )
  }

  /**
   * Get all schedules for a subscription in a date range
   * @param {string} subscription_id - required
   * @param {string} start_date - optional
   * @param {string} end_date - optional
   */
  static async get_subscription_schedules(subscription_id, start_date, end_date) {
    return scylla_db.query(table_names.schedules,
      `${gsi_attribute_names.subscription_pk} = :gsi AND created_at BETWEEN :start AND :end`,
      { ':gsi': `sub#${subscription_id}`, ':start': start_date, ':end': end_date },
      { indexName: gsi_index_names.subscription_gsi }
    )
  }

  /**
   * Get all transactions for an order in a date range
   * @param {string} order_id - required
   * @param {string} start_date - optional
   * @param {string} end_date - optional
   */
  static async get_order_transactions(order_id, start_date, end_date) {
    return scylla_db.query(table_names.transactions,
      `${gsi_attribute_names.order_pk} = :gsi AND created_at BETWEEN :start AND :end`,
      { ':gsi': `order#${order_id}`, ':start': start_date, ':end': end_date },
      { indexName: gsi_index_names.order_gsi }
    )
  }

  /**
   * Get all sessions for a user in a date range
   * @param {string} user_id - required
   * @param {string} start_date - optional
   * @param {string} end_date - optional
   */
  static async get_user_sessions(user_id, start_date, end_date) {
    return scylla_db.query(table_names.sessions,
      '#pk = :pk AND created_at BETWEEN :start AND :end',
      { ':pk': `user#${user_id}`, ':start': start_date, ':end': end_date }
    )
  }

  /**
   * Get all sessions for an order in a date range
   * @param {string} order_id - required
   * @param {string} start_date - optional
   * @param {string} end_date - optional
   */
  static async get_order_sessions(order_id, start_date, end_date) {
    return scylla_db.query(table_names.sessions,
      `${gsi_attribute_names.order_pk} = :gsi AND created_at BETWEEN :start AND :end`,
      { ':gsi': `order#${order_id}`, ':start': start_date, ':end': end_date },
      { indexName: gsi_index_names.order_gsi }
    )
  }

  /**
   * Get all tokens for a user
   * @param {string} user_id - required
   */
  static async get_user_tokens(user_id) {
    return scylla_db.query(table_names.tokens,
      '#pk = :pk',
      { ':pk': `user#${user_id}` }
    )
  }

  /**
   * Get all tokens soon to expire
   * @param {string} yyyy_mm - required (e.g. '2025-07')
   */
  static async get_tokens_soon_to_expire(yyyy_mm) {
    return scylla_db.query(table_names.tokens,
      `${gsi_attribute_names.expiry_pk} = :gsi`,
      { ':gsi': `expiry#${yyyy_mm}` },
      { indexName: gsi_index_names.expiry_gsi }
    )
  }

  /**
   * Get all failed transactions by date range
   * @param {string} start_date - optional
   * @param {string} end_date - optional
   */
  static async get_failed_transactions(start_date, end_date) {
    return scylla_db.query(table_names.transactions,
      `${gsi_attribute_names.status_pk} = :gsi AND created_at BETWEEN :start AND :end`,
      { ':gsi': 'status#failed', ':start': start_date, ':end': end_date },
      { indexName: gsi_index_names.status_gsi }
    )
  }

  /**
   * Get all webhooks for an order
   * @param {string} order_id - required
   */
  static async get_order_webhooks(order_id) {
    return scylla_db.query(table_names.webhooks,
      '#pk = :pk',
      { ':pk': `order#${order_id}` }
    )
  }

  /**
   * Get all webhooks for a subscription
   * @param {string} subscription_id - required
   */
  static async get_subscription_webhooks(subscription_id) {
    return scylla_db.query(table_names.webhooks,
      `${gsi_attribute_names.subscription_pk} = :gsi`,
      { ':gsi': `sub#${subscription_id}` },
      { indexName: gsi_index_names.subscription_gsi }
    )
  }

  /**
   * Get all records (transactions, sessions, schedules) for a specific order
   * @param {string} order_id - required
   */
  static async get_order_full_data(order_id) {
    const [txns, sessions, schedules] = await Promise.all([
      this.get_order_transactions(order_id, null, null),
      this.get_order_sessions(order_id, null, null),
      scylla_db.query(table_names.schedules,
        `${gsi_attribute_names.order_pk} = :gsi`,
        { ':gsi': `order#${order_id}` },
        { indexName: gsi_index_names.order_gsi }
      )
    ])
    return { txns, sessions, schedules }
  }




  🟢 sessions
js
Copy
Edit
/**
 * Save a session record
 * @param {object} sessionData
 * @property {string} userId - required
 * @property {string} orderId - required
 * @property {string} sessionType - required ('card' | 'token')
 * @property {string} gateway - required
 * @property {string} status - required ('pending' | 'completed')
 * @property {object} payloads - required ({ requestData, responseData })
 * @property {string} [transactionId] - optional
 * @property {string} [redirectUrl] - optional
 * @property {string} [createdAt] - optional (ISO8601)
 */
static async saveSession(sessionData) {
  return scylla_db.putItem(table_names.sessions, sessionData);
}

/**
 * Update a session record
 * @param {string} pk - required, partition key
 * @param {string} sk - required, sort key
 * @param {object} updates - required, fields to update
 */
static async updateSession(pk, sk, updates) {
  return scylla_db.updateItem(table_names.sessions, pk, sk, updates);
}

/**
 * Delete a session record
 * @param {string} pk - required, partition key
 * @param {string} sk - required, sort key
 */
static async deleteSession(pk, sk) {
  return scylla_db.deleteItem(table_names.sessions, pk, sk);
}
🟢 transactions
js
Copy
Edit
/**
 * Save a transaction record
 * @param {object} transactionData
 * @property {string} userId - required
 * @property {string} orderId - required
 * @property {string} transactionId - required
 * @property {string} orderType - required
 * @property {string} status - required ('success' | 'failed')
 * @property {object} payloads - required ({ requestData, responseData })
 * @property {string} [cardLast4] - optional
 * @property {string} [cardType] - optional
 * @property {string} [cardHolderName] - optional
 * @property {string} [tokenId] - optional
 * @property {string} [createdAt] - optional
 */
static async saveTransaction(transactionData) {
  return scylla_db.putItem(table_names.transactions, transactionData);
}

/**
 * Update a transaction record
 * @param {string} pk - required
 * @param {string} sk - required
 * @param {object} updates - required
 */
static async updateTransaction(pk, sk, updates) {
  return scylla_db.updateItem(table_names.transactions, pk, sk, updates);
}

/**
 * Delete a transaction record
 * @param {string} pk - required
 * @param {string} sk - required
 */
static async deleteTransaction(pk, sk) {
  return scylla_db.deleteItem(table_names.transactions, pk, sk);
}
🟢 schedules
js
Copy
Edit
/**
 * Save a schedule record
 * @param {object} scheduleData
 * @property {string} userId - required
 * @property {string} orderId - required
 * @property {string} subscriptionId - required
 * @property {string} status - required
 * @property {string} frequency - required
 * @property {string} amount - required
 * @property {string} currency - required
 * @property {string} registrationId - required
 * @property {string} startDate - required
 * @property {string} nextScheduleDate - required
 * @property {string} [checkoutId] - optional
 * @property {object} [createScheduleArgs] - optional
 * @property {object} [createScheduleResponse] - optional
 * @property {string} [notes] - optional
 * @property {string} [createdAt] - optional
 */
static async saveSchedule(scheduleData) {
  return scylla_db.putItem(table_names.schedules, scheduleData);
}

/**
 * Update a schedule record
 * @param {string} pk - required
 * @param {string} sk - required
 * @param {object} updates - required
 */
static async updateSchedule(pk, sk, updates) {
  return scylla_db.updateItem(table_names.schedules, pk, sk, updates);
}

/**
 * Delete a schedule record
 * @param {string} pk - required
 * @param {string} sk - required
 */
static async deleteSchedule(pk, sk) {
  return scylla_db.deleteItem(table_names.schedules, pk, sk);
}
🟢 webhooks
js
Copy
Edit
/**
 * Save a webhook record
 * @param {object} webhookData
 * @property {string} orderId - required
 * @property {object} payload - required
 * @property {string} actionTaken - required
 * @property {boolean} handled - required
 * @property {string} idempotencyKey - required
 * @property {string} [subscriptionId] - optional
 * @property {string} [createdAt] - optional
 */
static async saveWebhook(webhookData) {
  return scylla_db.putItem(table_names.webhooks, webhookData);
}

/**
 * Update a webhook record
 * @param {string} pk - required
 * @param {string} sk - required
 * @param {object} updates - required
 */
static async updateWebhook(pk, sk, updates) {
  return scylla_db.updateItem(table_names.webhooks, pk, sk, updates);
}

/**
 * Delete a webhook record
 * @param {string} pk - required
 * @param {string} sk - required
 */
static async deleteWebhook(pk, sk) {
  return scylla_db.deleteItem(table_names.webhooks, pk, sk);
}
🟢 tokens
js
Copy
Edit
/**
 * Save a token record
 * @param {object} tokenData
 * @property {string} userId - required
 * @property {string} registrationId - required
 * @property {string} last4 - required
 * @property {string} expiry - required (YYYY-MM)
 * @property {string} name - required
 * @property {string} type - required
 * @property {string} [createdAt] - optional
 */
static async saveToken(tokenData) {
  return scylla_db.putItem(table_names.tokens, tokenData);
}

/**
 * Update a token record
 * @param {string} pk - required
 * @param {string} sk - required
 * @param {object} updates - required
 */
static async updateToken(pk, sk, updates) {
  return scylla_db.updateItem(table_names.tokens, pk, sk, updates);
}

/**
 * Delete a token record
 * @param {string} pk - required
 * @param {string} sk - required
 */
static async deleteToken(pk, sk) {
  return scylla_db.deleteItem(table_names.tokens, pk, sk);
}


}

export default payment_gateway_service



/**
 * payment_gateway_service_edge_cases.js
 *
 * Concrete usage examples: 5 per method
 * Each can be run directly and should update or query DB accordingly with noted expected outcome.
 */

import payment_gateway_service from './payment_gateway_service.js'

// get_user_transactions
// Expected: returns transactions in range or [] if none
await payment_gateway_service.get_user_transactions('user123', '2025-01-01T00:00:00Z', '2025-12-31T23:59:59Z')
// Expected: returns all transactions for user123
await payment_gateway_service.get_user_transactions('user123')
// Expected: [] since user is invalid
await payment_gateway_service.get_user_transactions('invalid_user')
// Expected: [] or error due to invalid date order
await payment_gateway_service.get_user_transactions('user123', '2025-12-31T23:59:59Z', '2025-01-01T00:00:00Z')
// Expected: all transactions for user123
await payment_gateway_service.get_user_transactions('user123', null, null)

// get_user_schedules
// Expected: schedules in range or []
await payment_gateway_service.get_user_schedules('user123', '2025-01-01', '2025-12-31')
// Expected: all schedules for user123
await payment_gateway_service.get_user_schedules('user123')
// Expected: []
await payment_gateway_service.get_user_schedules('invalid_user')
// Expected: []
await payment_gateway_service.get_user_schedules('user123', '2026-01-01', '2026-12-31')
// Expected: all schedules
await payment_gateway_service.get_user_schedules('user123', null, null)

// get_subscription_schedules
// Expected: schedules in range or []
await payment_gateway_service.get_subscription_schedules('sub123', '2025-01-01', '2025-12-31')
// Expected: all schedules
await payment_gateway_service.get_subscription_schedules('sub123')
// Expected: []
await payment_gateway_service.get_subscription_schedules('invalid_sub')
// Expected: []
await payment_gateway_service.get_subscription_schedules('sub123', '2026-01-01', '2026-12-31')
// Expected: all schedules
await payment_gateway_service.get_subscription_schedules('sub123', null, null)

// get_order_transactions
// Expected: transactions in range or []
await payment_gateway_service.get_order_transactions('order123', '2025-01-01', '2025-12-31')
// Expected: all transactions
await payment_gateway_service.get_order_transactions('order123')
// Expected: []
await payment_gateway_service.get_order_transactions('invalid_order')
// Expected: []
await payment_gateway_service.get_order_transactions('order123', '2026-01-01', '2026-12-31')
// Expected: all transactions
await payment_gateway_service.get_order_transactions('order123', null, null)

// get_user_sessions
// Expected: sessions in range or []
await payment_gateway_service.get_user_sessions('user123', '2025-01-01', '2025-12-31')
// Expected: all sessions
await payment_gateway_service.get_user_sessions('user123')
// Expected: []
await payment_gateway_service.get_user_sessions('invalid_user')
// Expected: []
await payment_gateway_service.get_user_sessions('user123', '2026-01-01', '2026-12-31')
// Expected: all sessions
await payment_gateway_service.get_user_sessions('user123', null, null)

// get_order_sessions
// Expected: sessions in range or []
await payment_gateway_service.get_order_sessions('order123', '2025-01-01', '2025-12-31')
// Expected: all sessions
await payment_gateway_service.get_order_sessions('order123')
// Expected: []
await payment_gateway_service.get_order_sessions('invalid_order')
// Expected: []
await payment_gateway_service.get_order_sessions('order123', '2026-01-01', '2026-12-31')
// Expected: all sessions
await payment_gateway_service.get_order_sessions('order123', null, null)

// get_user_tokens
// Expected: tokens or []
await payment_gateway_service.get_user_tokens('user123')
// Expected: tokens or []
await payment_gateway_service.get_user_tokens('user456')
// Expected: []
await payment_gateway_service.get_user_tokens('invalid_user')
// Expected: tokens or []
await payment_gateway_service.get_user_tokens('user789')
// Expected: tokens or []
await payment_gateway_service.get_user_tokens('user000')

// get_tokens_soon_to_expire
// Expected: expiring tokens or []
await payment_gateway_service.get_tokens_soon_to_expire('2025-07')
// Expected: []
await payment_gateway_service.get_tokens_soon_to_expire('2026-01')
// Expected: [] or error if invalid
await payment_gateway_service.get_tokens_soon_to_expire('invalid')
// Expected: []
await payment_gateway_service.get_tokens_soon_to_expire('2030-12')
// Expected: expiring tokens or []
await payment_gateway_service.get_tokens_soon_to_expire('2025-08')

// get_failed_transactions
// Expected: failed txns or []
await payment_gateway_service.get_failed_transactions('2025-01-01', '2025-12-31')
// Expected: all failed txns
await payment_gateway_service.get_failed_transactions()
// Expected: []
await payment_gateway_service.get_failed_transactions('2026-01-01', '2026-12-31')
// Expected: [] or error if invalid
await payment_gateway_service.get_failed_transactions('2025-12-31', '2025-01-01')
// Expected: all failed txns
await payment_gateway_service.get_failed_transactions(null, null)

// get_order_webhooks
// Expected: webhooks or []
await payment_gateway_service.get_order_webhooks('order123')
// Expected: webhooks or []
await payment_gateway_service.get_order_webhooks('order456')
// Expected: []
await payment_gateway_service.get_order_webhooks('invalid_order')
// Expected: webhooks or []
await payment_gateway_service.get_order_webhooks('order789')
// Expected: webhooks or []
await payment_gateway_service.get_order_webhooks('order000')

// get_subscription_webhooks
// Expected: webhooks or []
await payment_gateway_service.get_subscription_webhooks('sub123')
// Expected: webhooks or []
await payment_gateway_service.get_subscription_webhooks('sub456')
// Expected: []
await payment_gateway_service.get_subscription_webhooks('invalid_sub')
// Expected: webhooks or []
await payment_gateway_service.get_subscription_webhooks('sub789')
// Expected: webhooks or []
await payment_gateway_service.get_subscription_webhooks('sub000')

// get_order_full_data
// Expected: all data {txns,sessions,schedules} or all []
await payment_gateway_service.get_order_full_data('order123')
// Expected: all data or []
await payment_gateway_service.get_order_full_data('order456')
// Expected: all []
await payment_gateway_service.get_order_full_data('invalid_order')
// Expected: partial or all []
await payment_gateway_service.get_order_full_data('order789')
// Expected: partial or all []
await payment_gateway_service.get_order_full_data('order000')



// 📄 All transactions for a user in a date range
// ✅ PK: user#{user_id} — the main partition key groups all records by this user.
// ✅ SK: starts with txn# — each transaction record under this user has a unique sort key that starts with txn#.
// 🔷 GSI: none — we don’t need it here since all records for the user are already grouped under the PK.
// 📌 We just query by PK, then filter by date on created_at.

// 📄 All schedules for a user in a date range
// ✅ PK: user#{user_id} — all schedules are saved under the user’s ID.
// ✅ SK: starts with sched# — uniquely identifies each schedule.
// 🔷 GSI: none.
// 📌 Query by PK, filter by date range.

// 📄 All schedules for a subscription in a date range
// ✅ PK: not used here directly.
// 🔷 GSI PK: sub#{subscription_id} — a special secondary index groups all schedules by subscription ID.
// ✅ SK: starts with sched#.
// 📌 Query by GSI PK, filter by date range.

// 📄 All transactions for an order in a date range
// ✅ PK: not used here directly.
// 🔷 GSI PK: order#{order_id} — a secondary index groups transactions by order.
// ✅ SK: starts with txn#.
// 📌 Query by GSI PK, filter by date range.

// 📄 All sessions for a user in a date range
// ✅ PK: user#{user_id} — all sessions are grouped under the user.
// ✅ SK: starts with session#.
// 🔷 GSI: none.
// 📌 Query by PK, filter by date.

// 📄 All sessions for an order in a date range
// ✅ PK: not used directly.
// 🔷 GSI PK: order#{order_id} — sessions tied to an order are grouped in a GSI.
// ✅ SK: starts with session#.
// 📌 Query by GSI PK, filter by date.

// 📄 All tokens per user
// ✅ PK: user#{user_id} — tokens belong to the user.
// ✅ SK: starts with token#.
// 🔷 GSI: none.
// 📌 Query by PK, no date filtering.

// 📄 All tokens soon to expire
// ✅ PK: not used here directly.
// 🔷 GSI PK: expiry#{YYYYMM} — tokens are indexed by their expiry month.
// ✅ SK: starts with user# or token ID.
// 📌 Query by GSI PK.

// 📄 All failed transactions by date range (via GSI3)
// ✅ PK: not used directly.
// 🔷 GSI PK: status#failed — all failed transactions are grouped together in this index.
// ✅ SK: starts with created_at# or txn#.
// 📌 Query by GSI PK, filter by date.

// 📄 All webhooks for an order
// ✅ PK: order#{order_id} — webhooks grouped by order ID.
// ✅ SK: starts with wh#.
// 🔷 GSI: none.
// 📌 Query by PK.

// 📄 All webhooks for a subscription
// ✅ PK: not used directly.
// 🔷 GSI PK: sub#{subscription_id} — webhooks indexed by subscription ID.
// ✅ SK: starts with wh#.
// 📌 Query by GSI PK.

// 📄 Get transaction, session, and schedule records for a specific order ID
// ✅ PK: not used directly.
// 🔷 GSI PK: order#{order_id} — used for all three types: transactions (txn#), sessions (session#), schedules (sched#).
// ✅ SK: differentiates the type of record.
// 📌 Query GSI three times and combine results.









import ScyllaDb from './ScyllaDb.js'

const schemas = {
  paymentGateway_sessions: {
    TableName: 'paymentGateway_sessions',
    KeySchema: [
      { AttributeName: 'pk', KeyType: 'HASH' },
      { AttributeName: 'sk', KeyType: 'RANGE' }
    ],
    AttributeDefinitions: [
      { AttributeName: 'pk', AttributeType: 'S' },
      { AttributeName: 'sk', AttributeType: 'S' }
    ],
    BillingMode: 'PAY_PER_REQUEST'
  },
  paymentGateway_transactions: {
    TableName: 'paymentGateway_transactions',
    KeySchema: [
      { AttributeName: 'pk', KeyType: 'HASH' },
      { AttributeName: 'sk', KeyType: 'RANGE' }
    ],
    AttributeDefinitions: [
      { AttributeName: 'pk', AttributeType: 'S' },
      { AttributeName: 'sk', AttributeType: 'S' },
      { AttributeName: 'statusGSI', AttributeType: 'S' }
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: 'status_gsi',
        KeySchema: [{ AttributeName: 'statusGSI', KeyType: 'HASH' }],
        Projection: { ProjectionType: 'ALL' }
      }
    ],
    BillingMode: 'PAY_PER_REQUEST'
  },
  paymentGateway_schedules: {
    TableName: 'paymentGateway_schedules',
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
        IndexName: 'subscription_gsi',
        KeySchema: [{ AttributeName: 'subscriptionId', KeyType: 'HASH' }],
        Projection: { ProjectionType: 'ALL' }
      }
    ],
    BillingMode: 'PAY_PER_REQUEST'
  },
  paymentGateway_tokens: {
    TableName: 'paymentGateway_tokens',
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
    BillingMode: 'PAY_PER_REQUEST'
  },
  paymentGateway_webhooks: {
    TableName: 'paymentGateway_webhooks',
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
        IndexName: 'subscription_gsi',
        KeySchema: [{ AttributeName: 'subscriptionId', KeyType: 'HASH' }],
        Projection: { ProjectionType: 'ALL' }
      }
    ],
    BillingMode: 'PAY_PER_REQUEST'
  }
}

for (const [tableName, schema] of Object.entries(schemas)) {
  ScyllaDb.createTable(schema).then(() =>
    console.log(`✅ Created table: ${tableName}`)
  ).catch(err =>
    console.error(`❌ Failed to create ${tableName}:`, err.message)
  )
}




// 🔷 createCheckoutSession
// 📄 Create a new checkout session if none exists (or expired).
// ✅ Checks for valid session first, then creates & saves if needed.

// 🧰 Helpers:

payment_gateway_service.getUserSessions()

payment_gateway_service.getOrderSessions()

payment_gateway_service.saveSession()

optionally: payment_gateway_service.purgeExpiredSessions() //(if you add this helper)

// 🔷 purgeExpiredSessions
// 📄 Deletes expired sessions for a user or order.

// 🧰 Helpers:

payment_gateway_service.getUserSessions() / getOrderSessions()

payment_gateway_service.deleteSession()

// 🔷 isCheckoutSessionValid
// 📄 Checks if an active session exists and is still within validity window.

// 🧰 Helpers:

payment_gateway_service.getUserSessions() / getOrderSessions()

// 🔷 getPaymentFormHtml
// 📄 Generate the HTML <iframe> embed code using the checkout session.

// 🧰 Helpers:

payment_gateway_service.getUserSessions() / getOrderSessions()

// 🔷 writePaymentFormLog
// 📄 Save a log event when rendering the payment form.

// 🧰 Helpers:

payment_gateway_service.saveWebhook() //(or you can call it as a “form log” record)

// 🔷 handleWebhook
// 📄 Main entry point for incoming webhook payloads. Calls sub-handlers.

// 🧰 Helpers:

payment_gateway_service.saveWebhook()

// 🔷 decryptWebhook
// 📄 Decrypt and validate the webhook payload.

// 🧰 Helpers:

// none — internal crypto & validation

// 🔷 logWebhookEvent
// 📄 Persist webhook event to DB after decrypting.

// 🧰 Helpers:

payment_gateway_service.saveWebhook()

// 🔷 handleRegistrationEvent
// 📄 Process a card/token registration webhook event.

// 🧰 Helpers:

payment_gateway_service.saveToken()

// 🔷 handleScheduleEvent
// 📄 Process a schedule-related webhook event.

// 🧰 Helpers:

payment_gateway_service.saveSchedule()

// 🔷 getPaymentStatus
// 📄 Query Axcess /payment endpoint for the status of a payment.
// ✅ Optionally logs transaction into DB.

// 🧰 Helpers:

payment_gateway_service.saveTransaction()

optionally: getOrderTransactions() / getUserTransactions()

// 🔷 handleAxcessRedirectCallback
// 📄 Handle the customer being redirected back to your site with resourcePath.
// ✅ Fetches status, updates DB.

// 🧰 Helpers:

payment_gateway_service.saveTransaction()

optionally: getOrderTransactions()

// 🔷 getTokensForUser
// 📄 Retrieve all tokens for a user.

// 🧰 Helpers:

payment_gateway_service.getUserTokens()

// 🔷 getTokensSoonToExpire
// 📄 Retrieve all tokens about to expire.

// 🧰 Helpers:

payment_gateway_service.getTokensSoonToExpire()

// 🔷 getFailedTransactions
// 📄 Retrieve failed transactions for a given date range.

// 🧰 Helpers:

payment_gateway_service.getFailedTransactions()

// 🔷 getSchedulesForUser
// 📄 Retrieve schedules for a user.

// 🧰 Helpers:

payment_gateway_service.getUserSchedules()

// 🔷 getSchedulesForSubscription
// 📄 Retrieve schedules for a subscription.

// 🧰 Helpers:

payment_gateway_service.getSubscriptionSchedules()

// 🔷 getWebhooksForOrder
// 📄 Retrieve webhooks for an order.

// 🧰 Helpers:

payment_gateway_service.getOrderWebhooks()

// 🔷 getWebhooksForSubscription
// 📄 Retrieve webhooks for a subscription.

// 🧰 Helpers:

payment_gateway_service.getSubscriptionWebhooks()

// 🔷 getOrderFullData
// 📄 Retrieve all records (transactions, sessions, schedules) for an order.

// 🧰 Helpers:

payment_gateway_service.getOrderFullData()
