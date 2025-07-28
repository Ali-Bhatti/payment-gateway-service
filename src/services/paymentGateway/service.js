import dotenv from 'dotenv';
dotenv.config();

import scylla_db from '../../utils/ScyllaDb.js'

const isTestEnv = ['test'].includes(process.env.NODE_ENV);
const TABLE_SUFFIX = isTestEnv ? '_test' : '';

const table_names = {
  sessions: 'paymentGateway_sessions' + TABLE_SUFFIX,
  transactions: 'paymentGateway_transactions' + TABLE_SUFFIX,
  tokens: 'paymentGateway_tokens' + TABLE_SUFFIX,
  schedules: 'paymentGateway_schedules' + TABLE_SUFFIX,
  webhooks: 'paymentGateway_webhooks' + TABLE_SUFFIX
}

const gsi_attribute_names = {
  subscription_pk: '#subscriptionId',
  order_pk: '#orderGSI',
  status_pk: '#statusGSI',
  expiry_pk: '#expiry'
}

const gsi_index_names = {
  subscription_gsi: 'schedule_subscription_gsi',
  webhook_subscription_gsi: 'webhook_subscription_gsi',
  order_gsi: 'order_gsi',
  status_gsi: 'status_gsi',
  expiry_gsi: 'expiry_gsi'
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
      '#pk = :pk',
      { ':pk': `user#${user_id}`, ':start': start_date, ':end': end_date },
      {
        ExpressionAttributeNames: { '#pk': 'pk' },
        FilterExpression: 'createdAt BETWEEN :start AND :end'
      }
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
      '#pk = :pk',
      { ':pk': `user#${user_id}`, ':start': start_date, ':end': end_date },
      {
        ExpressionAttributeNames: { '#pk': 'pk' },
        FilterExpression: 'createdAt BETWEEN :start AND :end',
      }
    )
  }

  /**
   * Get all schedules for a subscription in a date range
   * @param {string} subscription_id - required
   * @param {string} start_date - optional
   * @param {string} end_date - optional
   */
  static async get_subscription_schedules(subscription_id, start_date, end_date) {
    return scylla_db.query(
      table_names.schedules,
      `${gsi_attribute_names.subscription_pk} = :gsi`,
      { ':gsi': `sub#${subscription_id}`, ':start': start_date, ':end': end_date },
      {
        IndexName: gsi_index_names.subscription_gsi,
        ExpressionAttributeNames: { [`${gsi_attribute_names.subscription_pk}`]: 'subscriptionId' },
        FilterExpression: 'createdAt BETWEEN :start AND :end',
      }
    );
  }

  /**
   * Get all transactions for an order in a date range
   * @param {string} order_id - required
   * @param {string} start_date - optional
   * @param {string} end_date - optional
   */
  static async get_order_transactions(order_id, start_date, end_date) {
    let FilterExpression = 'orderId = :orderId';
    let ExpressionAttributeValues = { ':orderId': order_id };

    if (start_date && end_date) {
      FilterExpression += ' AND createdAt BETWEEN :start AND :end';
      ExpressionAttributeValues[':start'] = start_date;
      ExpressionAttributeValues[':end'] = end_date;
    }

    return scylla_db.scan(
      table_names.transactions,
      FilterExpression,
      ExpressionAttributeValues
    );
  }

  /**
   * Get all sessions for a user in a date range
   * @param {string} user_id - required
   * @param {string} start_date - optional
   * @param {string} end_date - optional
   */
  static async get_user_sessions(user_id, start_date, end_date) {
    return scylla_db.query(table_names.sessions,
      '#pk = :pk',
      { ':pk': `user#${user_id}`, ':start': start_date, ':end': end_date },
      {
        ExpressionAttributeNames: { '#pk': 'pk' },
        FilterExpression: 'createdAt BETWEEN :start AND :end'
      }
    )
  }

  /**
   * Get all sessions for an order in a date range
   * @param {string} order_id - required
   * @param {string} start_date - optional
   * @param {string} end_date - optional
   */
  static async get_order_sessions(order_id, start_date, end_date) {
    let FilterExpression = 'orderId = :orderId';
    let ExpressionAttributeValues = { ':orderId': order_id };

    if (start_date && end_date) {
      FilterExpression += ' AND createdAt BETWEEN :start AND :end';
      ExpressionAttributeValues[':start'] = start_date;
      ExpressionAttributeValues[':end'] = end_date;
    }

    return scylla_db.scan(
      table_names.sessions,
      FilterExpression,
      ExpressionAttributeValues
    );
  }

  /**
   * Get all tokens for a user
   * @param {string} user_id - required
   */
  static async get_user_tokens(user_id) {
    return scylla_db.query(table_names.tokens,
      '#pk = :pk',
      { ':pk': `user#${user_id}` },
      { ExpressionAttributeNames: { '#pk': 'pk' } }
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
      {
        ExpressionAttributeNames: { [`${gsi_attribute_names.expiry_pk}`]: "expiry", },
        IndexName: gsi_index_names.expiry_gsi
      }
    )
  }

  /**
   * Get all failed transactions by date range
   * @param {string} start_date - optional
   * @param {string} end_date - optional
   */
  static async get_failed_transactions(start_date, end_date) {
    return scylla_db.query(table_names.transactions,
      `${gsi_attribute_names.status_pk} = :gsi`,
      { ':gsi': 'status#failed', ':start': start_date, ':end': end_date },
      {
        ExpressionAttributeNames: { [`${gsi_attribute_names.status_pk}`]: "statusGSI", },
        IndexName: gsi_index_names.status_gsi,
        FilterExpression: 'created_at BETWEEN :start AND :end'
      }
    )
  }

  /**
   * Get all webhooks for an order
   * @param {string} order_id - required
   */
  static async get_order_webhooks(order_id) {
    return scylla_db.query(table_names.webhooks,
      '#pk = :pk',
      { ':pk': `order#${order_id}` },
      { ExpressionAttributeNames: { '#pk': 'pk' } }
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
      {
        ExpressionAttributeNames: { [`${gsi_attribute_names.subscription_pk}`]: 'subscriptionId' },
        IndexName: gsi_index_names.webhook_subscription_gsi
      }
    )
  }

  /**
   * Get all records (transactions, sessions, schedules) for a specific order
   * @param {string} order_id - required
   */
  static async get_order_full_data(order_id) {
    let [txns, sessions, schedules] = await Promise.all([


      // Get transactions using the existing method (has order_gsi)
      this.get_order_transactions(`order#${order_id}`),

      this.get_order_sessions(`order#${order_id}`),

      // Get schedules by scanning with filter (no order_gsi available)
      scylla_db.scan(table_names.schedules, {
        FilterExpression: 'orderId = :orderId',
        ExpressionAttributeValues: {
          ':orderId': `order#${order_id}`
        }
      })
    ]);

    return { txns, sessions, schedules };
  }




  // 🟢 sessions
  // js
  // Copy
  // Edit
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
    return scylla_db.updateItem(table_names.sessions, { pk, sk }, updates);
  }

  /**
   * Delete a session record
   * @param {string} pk - required, partition key
   * @param {string} sk - required, sort key
   */
  static async deleteSession(pk, sk) {
    return scylla_db.deleteItem(table_names.sessions, { pk, sk });
  }
  // 🟢 transactions
  //   js
  //   Copy
  //   Edit
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
    return scylla_db.updateItem(table_names.transactions, { pk, sk }, updates);
  }

  /**
   * Delete a transaction record
   * @param {string} pk - required
   * @param {string} sk - required
   */
  static async deleteTransaction(pk, sk) {
    return scylla_db.deleteItem(table_names.transactions, { pk, sk });
  }
  // 🟢 schedules
  //   js
  //   Copy
  //   Edit
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
    return scylla_db.updateItem(table_names.schedules, { pk, sk }, updates);
  }

  /**
   * Delete a schedule record
   * @param {string} pk - required
   * @param {string} sk - required
   */
  static async deleteSchedule(pk, sk) {
    return scylla_db.deleteItem(table_names.schedules, { pk, sk });
  }
  // 🟢 webhooks
  //   js
  //   Copy
  //   Edit
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
    return scylla_db.updateItem(table_names.webhooks, { pk, sk }, updates);
  }

  /**
   * Delete a webhook record
   * @param {string} pk - required
   * @param {string} sk - required
   */
  static async deleteWebhook(pk, sk) {
    return scylla_db.deleteItem(table_names.webhooks, { pk, sk });
  }
  // 🟢 tokens
  //   js
  //   Copy
  //   Edit
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
    return scylla_db.updateItem(table_names.tokens, { pk, sk }, updates);
  }

  /**
   * Delete a token record
   * @param {string} pk - required
   * @param {string} sk - required
   */
  static async deleteToken(pk, sk) {
    return scylla_db.deleteItem(table_names.tokens, { pk, sk });
  }


}

export default payment_gateway_service