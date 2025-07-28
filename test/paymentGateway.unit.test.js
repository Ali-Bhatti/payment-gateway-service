import { expect } from 'chai'
import sinon from 'sinon'
import scylla_db from '../src/utils/ScyllaDb.js'
import payment_gateway_service from '../src/services/paymentGateway/service.js'

// Match table name logic from service.js
const isTestEnv = ['test'].includes(process.env.NODE_ENV);
const TABLE_SUFFIX = isTestEnv ? '_test' : '';
const table_names = {
  sessions: 'paymentGateway_sessions' + TABLE_SUFFIX,
  transactions: 'paymentGateway_transactions' + TABLE_SUFFIX,
  tokens: 'paymentGateway_tokens' + TABLE_SUFFIX,
  schedules: 'paymentGateway_schedules' + TABLE_SUFFIX,
  webhooks: 'paymentGateway_webhooks' + TABLE_SUFFIX
};

describe('payment_gateway_service', () => {

  afterEach(() => {
    sinon.restore();
  });

  // ===== GET METHODS TESTS =====

  describe('get_user_transactions', () => {
    it('should return transactions for a user within date range', async () => {
      const fakeResult = [{ transactionId: 'txn1' }];
      const stub = sinon.stub(scylla_db, 'query').resolves(fakeResult);

      const userId = 'user123';
      const startDate = '2025-01-01';
      const endDate = '2025-12-31';

      const result = await payment_gateway_service.get_user_transactions(userId, startDate, endDate);
      expect(result).to.deep.equal(fakeResult);
      expect(stub.calledOnce).to.be.true;
      expect(stub.calledWith(
        table_names.transactions,
        '#pk = :pk',
        { ':pk': `user#${userId}`, ':start': startDate, ':end': endDate }, // ExpressionAttributeValues
        {
          ExpressionAttributeNames: { '#pk': 'pk' },
          FilterExpression: 'createdAt BETWEEN :start AND :end'
        }
      )).to.be.true;
    });
  });

  describe('get_user_schedules', () => {
    it('should return schedules for a user within date range', async () => {
      const fakeResult = [{ scheduleId: 'sched1' }];
      const stub = sinon.stub(scylla_db, 'query').resolves(fakeResult);

      const userId = 'user123';
      const startDate = '2025-01-01';
      const endDate = '2025-12-31';

      const result = await payment_gateway_service.get_user_schedules(userId, startDate, endDate);
      expect(result).to.deep.equal(fakeResult);
      expect(stub.calledOnce).to.be.true;
      expect(stub.calledWith(
        table_names.schedules,
        '#pk = :pk',
        { ':pk': `user#${userId}`, ':start': startDate, ':end': endDate }, // ExpressionAttributeValues
        {
          ExpressionAttributeNames: { '#pk': 'pk' },
          FilterExpression: 'createdAt BETWEEN :start AND :end',
        }
      )).to.be.true;
    });
  });

  describe('get_subscription_schedules', () => {
    it('should return schedules for a subscription within date range', async () => {
      const fakeResult = [{ scheduleId: 'sched1' }];
      const stub = sinon.stub(scylla_db, 'query').resolves(fakeResult);

      const subscriptionId = 'sub123';
      const startDate = '2025-01-01';
      const endDate = '2025-12-31';

      const result = await payment_gateway_service.get_subscription_schedules(subscriptionId, startDate, endDate);
      expect(result).to.deep.equal(fakeResult);
      expect(stub.calledOnce).to.be.true;
      expect(stub.calledWith(
        table_names.schedules,
        '#subscriptionId = :gsi', // gsi_attribute_names.subscription_pk resolves to '#subscriptionId'
        { ':gsi': `sub#${subscriptionId}`, ':start': startDate, ':end': endDate }, // ExpressionAttributeValues
        {
          IndexName: 'schedule_subscription_gsi', // gsi_index_names.subscription_gsi
          ExpressionAttributeNames: { '#subscriptionId': 'subscriptionId' },
          FilterExpression: 'createdAt BETWEEN :start AND :end',
        }
      )).to.be.true;
    });
  });

  describe('get_order_transactions', () => {
    it('should return transactions for an order within date range', async () => {
      const fakeResult = [{ transactionId: 'txn1' }];
      // This now uses scylla_db.scan
      const stub = sinon.stub(scylla_db, 'scan').resolves(fakeResult);

      const orderId = 'order123';
      const startDate = '2025-01-01';
      const endDate = '2025-12-31';

      const result = await payment_gateway_service.get_order_transactions(orderId, startDate, endDate);
      expect(result).to.deep.equal(fakeResult);
      expect(stub.calledOnce).to.be.true;
      expect(stub.calledWith(
        table_names.transactions,
        'orderId = :orderId AND createdAt BETWEEN :start AND :end', // FilterExpression
        { ':orderId': orderId, ':start': startDate, ':end': endDate } // ExpressionAttributeValues
      )).to.be.true;
    });

    it('should return transactions for an order without date range', async () => {
      const fakeResult = [{ transactionId: 'txn2' }];
      const stub = sinon.stub(scylla_db, 'scan').resolves(fakeResult);

      const orderId = 'order123';

      const result = await payment_gateway_service.get_order_transactions(orderId);
      expect(result).to.deep.equal(fakeResult);
      expect(stub.calledOnce).to.be.true;
      expect(stub.calledWith(
        table_names.transactions,
        'orderId = :orderId',
        { ':orderId': orderId }
      )).to.be.true;
    });
  });

  describe('get_user_sessions', () => {
    it('should return sessions for a user within date range', async () => {
      const fakeResult = [{ sessionId: 'sess1' }];
      const stub = sinon.stub(scylla_db, 'query').resolves(fakeResult);

      const userId = 'user123';
      const startDate = '2025-01-01';
      const endDate = '2025-12-31';

      const result = await payment_gateway_service.get_user_sessions(userId, startDate, endDate);
      expect(result).to.deep.equal(fakeResult);
      expect(stub.calledOnce).to.be.true;
      expect(stub.calledWith(
        table_names.sessions,
        '#pk = :pk',
        { ':pk': `user#${userId}`, ':start': startDate, ':end': endDate }, // ExpressionAttributeValues
        {
          ExpressionAttributeNames: { '#pk': 'pk' },
          FilterExpression: 'createdAt BETWEEN :start AND :end'
        }
      )).to.be.true;
    });
  });

  describe('get_order_sessions', () => {
    it('should return sessions for an order within date range', async () => {
      const fakeResult = [{ sessionId: 'sess1' }];
      // This now uses scylla_db.scan
      const stub = sinon.stub(scylla_db, 'scan').resolves(fakeResult);

      const orderId = 'order123';
      const startDate = '2025-01-01';
      const endDate = '2025-12-31';

      const result = await payment_gateway_service.get_order_sessions(orderId, startDate, endDate);
      expect(result).to.deep.equal(fakeResult);
      expect(stub.calledOnce).to.be.true;
      expect(stub.calledWith(
        table_names.sessions,
        'orderId = :orderId AND createdAt BETWEEN :start AND :end', // FilterExpression
        { ':orderId': orderId, ':start': startDate, ':end': endDate } // ExpressionAttributeValues
      )).to.be.true;
    });

    it('should return sessions for an order without date range', async () => {
      const fakeResult = [{ sessionId: 'sess2' }];
      const stub = sinon.stub(scylla_db, 'scan').resolves(fakeResult);

      const orderId = 'order123';

      const result = await payment_gateway_service.get_order_sessions(orderId);
      expect(result).to.deep.equal(fakeResult);
      expect(stub.calledOnce).to.be.true;
      expect(stub.calledWith(
        table_names.sessions,
        'orderId = :orderId',
        { ':orderId': orderId }
      )).to.be.true;
    });
  });

  describe('get_user_tokens', () => {
    it('should return tokens for a user', async () => {
      const fakeResult = [{ tokenId: 'token1' }];
      const stub = sinon.stub(scylla_db, 'query').resolves(fakeResult);

      const userId = 'user123';

      const result = await payment_gateway_service.get_user_tokens(userId);
      expect(result).to.deep.equal(fakeResult);
      expect(stub.calledOnce).to.be.true;
      expect(stub.calledWith(
        table_names.tokens,
        '#pk = :pk',
        { ':pk': `user#${userId}` }, // ExpressionAttributeValues
        { ExpressionAttributeNames: { '#pk': 'pk' } } // Options with ExpressionAttributeNames
      )).to.be.true;
    });
  });

  describe('get_tokens_soon_to_expire', () => {
    it('should return tokens expiring in a specific month', async () => {
      const fakeResult = [{ tokenId: 'token1' }];
      const stub = sinon.stub(scylla_db, 'query').resolves(fakeResult);

      const yyyy_mm = '2025-07';

      const result = await payment_gateway_service.get_tokens_soon_to_expire(yyyy_mm);
      expect(result).to.deep.equal(fakeResult);
      expect(stub.calledOnce).to.be.true;
      expect(stub.calledWith(
        table_names.tokens,
        '#expiry = :gsi', // gsi_attribute_names.expiry_pk resolves to '#expiry'
        { ':gsi': `expiry#${yyyy_mm}` }, // ExpressionAttributeValues
        {
          ExpressionAttributeNames: { '#expiry': 'expiry' }, // Options with ExpressionAttributeNames
          IndexName: 'expiry_gsi' // gsi_index_names.expiry_gsi
        }
      )).to.be.true;
    });
  });

  describe('get_failed_transactions', () => {
    it('should return failed transactions within date range', async () => {
      const fakeResult = [{ transactionId: 'txn1' }];
      const stub = sinon.stub(scylla_db, 'query').resolves(fakeResult);

      const startDate = '2025-01-01';
      const endDate = '2025-12-31';

      const result = await payment_gateway_service.get_failed_transactions(startDate, endDate);
      expect(result).to.deep.equal(fakeResult);
      expect(stub.calledOnce).to.be.true;
      expect(stub.calledWith(
        table_names.transactions,
        '#statusGSI = :gsi', // gsi_attribute_names.status_pk resolves to '#statusGSI'
        { ':gsi': 'status#failed', ':start': startDate, ':end': endDate }, // ExpressionAttributeValues
        {
          ExpressionAttributeNames: { '#statusGSI': 'statusGSI' },
          IndexName: 'status_gsi', // gsi_index_names.status_gsi
          FilterExpression: 'created_at BETWEEN :start AND :end'
        }
      )).to.be.true;
    });
  });

  describe('get_order_webhooks', () => {
    it('should return webhooks for an order', async () => {
      const fakeResult = [{ webhookId: 'webhook1' }];
      const stub = sinon.stub(scylla_db, 'query').resolves(fakeResult);

      const orderId = 'order123';

      const result = await payment_gateway_service.get_order_webhooks(orderId);
      expect(result).to.deep.equal(fakeResult);
      expect(stub.calledOnce).to.be.true;
      expect(stub.calledWith(
        table_names.webhooks,
        '#pk = :pk',
        { ':pk': `order#${orderId}` },
        { ExpressionAttributeNames: { '#pk': 'pk' } }
      )).to.be.true;
    });
  });

  describe('get_subscription_webhooks', () => {
    it('should return webhooks for a subscription', async () => {
      const fakeResult = [{ webhookId: 'webhook1' }];
      const stub = sinon.stub(scylla_db, 'query').resolves(fakeResult);

      const subscriptionId = 'sub123';

      const result = await payment_gateway_service.get_subscription_webhooks(subscriptionId);
      expect(result).to.deep.equal(fakeResult);
      expect(stub.calledOnce).to.be.true;
      expect(stub.calledWith(
        table_names.webhooks,
        '#subscriptionId = :gsi', // gsi_attribute_names.subscription_pk resolves to '#subscriptionId'
        { ':gsi': `sub#${subscriptionId}` },
        {
          ExpressionAttributeNames: { '#subscriptionId': 'subscriptionId' },
          IndexName: 'webhook_subscription_gsi' // gsi_index_names.webhook_subscription_gsi
        }
      )).to.be.true;
    });
  });

  describe('get_order_full_data', () => {
    it('should return full order data including txns, sessions, and schedules', async () => {
      const txns = [{ id: 'txn1' }];
      const sessions = [{ id: 'sess1' }];
      const schedules = [{ id: 'sched1' }];

      const orderId = 'order123';

      // Stub the internal methods called by get_order_full_data
      const getOrderTxnsStub = sinon.stub(payment_gateway_service, 'get_order_transactions').resolves(txns);
      const getOrderSessionsStub = sinon.stub(payment_gateway_service, 'get_order_sessions').resolves(sessions);
      // Stub scylla_db.scan for schedules (as it's directly called)
      const scanSchedulesStub = sinon.stub(scylla_db, 'scan').resolves(schedules);

      const result = await payment_gateway_service.get_order_full_data(orderId);
      expect(result).to.deep.equal({ txns, sessions, schedules });

      // Verify the internal calls
      expect(getOrderTxnsStub.calledOnceWith(`order#${orderId}`)).to.be.true;
      expect(getOrderSessionsStub.calledOnceWith(`order#${orderId}`)).to.be.true;
      expect(scanSchedulesStub.calledOnceWith(
        table_names.schedules,
        {
          FilterExpression: 'orderId = :orderId',
          ExpressionAttributeValues: { ':orderId': `order#${orderId}` }
        }
      )).to.be.true;
    });
  });

  // ===== SAVE METHODS TESTS (No changes expected as putItem seems consistent) =====

  describe('saveSession', () => {
    it('should save a session record', async () => {
      const fakeSession = {
        userId: 'user123',
        orderId: 'order456',
        sessionType: 'card',
        gateway: 'axcess',
        status: 'pending',
        payloads: { requestData: {}, responseData: {} }
      };
      const stub = sinon.stub(scylla_db, 'putItem').resolves(fakeSession);

      const result = await payment_gateway_service.saveSession(fakeSession);
      expect(result).to.deep.equal(fakeSession);
      expect(stub.calledOnceWith(table_names.sessions, fakeSession)).to.be.true;
    });
  });

  describe('saveTransaction', () => {
    it('should save a transaction record', async () => {
      const fakeTransaction = {
        userId: 'user123',
        orderId: 'order456',
        transactionId: 'txn789',
        orderType: 'payment',
        status: 'success',
        payloads: { requestData: {}, responseData: {} },
        cardLast4: '1234',
        cardType: 'visa',
        cardHolderName: 'John Doe'
      };
      const stub = sinon.stub(scylla_db, 'putItem').resolves(fakeTransaction);

      const result = await payment_gateway_service.saveTransaction(fakeTransaction);
      expect(result).to.deep.equal(fakeTransaction);
      expect(stub.calledOnceWith(table_names.transactions, fakeTransaction)).to.be.true;
    });
  });

  describe('saveSchedule', () => {
    it('should save a schedule record', async () => {
      const fakeSchedule = {
        userId: 'user123',
        orderId: 'order456',
        subscriptionId: 'sub789',
        status: 'active',
        frequency: 'monthly',
        amount: '100.00',
        currency: 'USD',
        registrationId: 'reg123',
        startDate: '2025-01-01',
        nextScheduleDate: '2025-02-01',
        checkoutId: 'checkout123',
        notes: 'Test schedule'
      };
      const stub = sinon.stub(scylla_db, 'putItem').resolves(fakeSchedule);

      const result = await payment_gateway_service.saveSchedule(fakeSchedule);
      expect(result).to.deep.equal(fakeSchedule);
      expect(stub.calledOnceWith(table_names.schedules, fakeSchedule)).to.be.true;
    });
  });

  describe('saveWebhook', () => {
    it('should save a webhook record', async () => {
      const fakeWebhook = {
        orderId: 'order123',
        payload: { event: 'payment.success' },
        actionTaken: 'processed',
        handled: true,
        idempotencyKey: 'key123',
        subscriptionId: 'sub123'
      };
      const stub = sinon.stub(scylla_db, 'putItem').resolves(fakeWebhook);

      const result = await payment_gateway_service.saveWebhook(fakeWebhook);
      expect(result).to.deep.equal(fakeWebhook);
      expect(stub.calledOnceWith(table_names.webhooks, fakeWebhook)).to.be.true;
    });
  });

  describe('saveToken', () => {
    it('should save a token record', async () => {
      const fakeToken = {
        userId: 'user123',
        registrationId: 'reg123',
        last4: '1234',
        expiry: '2025-12',
        name: 'My Card',
        type: 'visa'
      };
      const stub = sinon.stub(scylla_db, 'putItem').resolves(fakeToken);

      const result = await payment_gateway_service.saveToken(fakeToken);
      expect(result).to.deep.equal(fakeToken);
      expect(stub.calledOnceWith(table_names.tokens, fakeToken)).to.be.true;
    });
  });

  // ===== UPDATE METHODS TESTS (Adjusted for object PK/SK in updateItem) =====

  describe('updateSession', () => {
    it('should update a session record', async () => {
      const pk = 'user#user123';
      const sk = 'session#sess456';
      const updates = { status: 'completed', transactionId: 'txn789' };
      const stub = sinon.stub(scylla_db, 'updateItem').resolves(updates);

      const result = await payment_gateway_service.updateSession(pk, sk, updates);
      expect(result).to.deep.equal(updates);
      expect(stub.calledOnceWith(table_names.sessions, { pk, sk }, updates)).to.be.true; // Updated call
    });
  });

  describe('updateTransaction', () => {
    it('should update a transaction record', async () => {
      const pk = 'user#user123';
      const sk = 'transaction#txn456';
      const updates = { status: 'completed', cardLast4: '5678' };
      const stub = sinon.stub(scylla_db, 'updateItem').resolves(updates);

      const result = await payment_gateway_service.updateTransaction(pk, sk, updates);
      expect(result).to.deep.equal(updates);
      expect(stub.calledOnceWith(table_names.transactions, { pk, sk }, updates)).to.be.true; // Updated call
    });
  });

  describe('updateSchedule', () => {
    it('should update a schedule record', async () => {
      const pk = 'user#user123';
      const sk = 'schedule#sched456';
      const updates = { status: 'paused', nextScheduleDate: '2025-03-01' };
      const stub = sinon.stub(scylla_db, 'updateItem').resolves(updates);

      const result = await payment_gateway_service.updateSchedule(pk, sk, updates);
      expect(result).to.deep.equal(updates);
      expect(stub.calledOnceWith(table_names.schedules, { pk, sk }, updates)).to.be.true; // Updated call
    });
  });

  describe('updateWebhook', () => {
    it('should update a webhook record', async () => {
      const pk = 'order#order123';
      const sk = 'webhook#web456';
      const updates = { handled: true, actionTaken: 'processed' };
      const stub = sinon.stub(scylla_db, 'updateItem').resolves(updates);

      const result = await payment_gateway_service.updateWebhook(pk, sk, updates);
      expect(result).to.deep.equal(updates);
      expect(stub.calledOnceWith(table_names.webhooks, { pk, sk }, updates)).to.be.true; // Updated call
    });
  });

  describe('updateToken', () => {
    it('should update a token record', async () => {
      const pk = 'user#user123';
      const sk = 'token#token456';
      const updates = { name: 'Updated Card Name', last4: '5678' };
      const stub = sinon.stub(scylla_db, 'updateItem').resolves(updates);

      const result = await payment_gateway_service.updateToken(pk, sk, updates);
      expect(result).to.deep.equal(updates);
      expect(stub.calledOnceWith(table_names.tokens, { pk, sk }, updates)).to.be.true; // Updated call
    });
  });

  // ===== DELETE METHODS TESTS (Adjusted for object PK/SK in deleteItem) =====

  describe('deleteSession', () => {
    it('should delete a session record', async () => {
      const pk = 'user#user123';
      const sk = 'session#sess456';
      const stub = sinon.stub(scylla_db, 'deleteItem').resolves({});

      const result = await payment_gateway_service.deleteSession(pk, sk);
      expect(result).to.deep.equal({});
      expect(stub.calledOnceWith(table_names.sessions, { pk, sk })).to.be.true; // Updated call
    });
  });

  describe('deleteTransaction', () => {
    it('should delete a transaction record', async () => {
      const pk = 'user#user123';
      const sk = 'transaction#txn456';
      const stub = sinon.stub(scylla_db, 'deleteItem').resolves({});

      const result = await payment_gateway_service.deleteTransaction(pk, sk);
      expect(result).to.deep.equal({});
      expect(stub.calledOnceWith(table_names.transactions, { pk, sk })).to.be.true; // Updated call
    });
  });

  describe('deleteSchedule', () => {
    it('should delete a schedule record', async () => {
      const pk = 'user#user123';
      const sk = 'schedule#sched456';
      const stub = sinon.stub(scylla_db, 'deleteItem').resolves({});

      const result = await payment_gateway_service.deleteSchedule(pk, sk);
      expect(result).to.deep.equal({});
      expect(stub.calledOnceWith(table_names.schedules, { pk, sk })).to.be.true; // Updated call
    });
  });

  describe('deleteWebhook', () => {
    it('should delete a webhook record', async () => {
      const pk = 'order#order123';
      const sk = 'webhook#web456';
      const stub = sinon.stub(scylla_db, 'deleteItem').resolves({});

      const result = await payment_gateway_service.deleteWebhook(pk, sk);
      expect(result).to.deep.equal({});
      expect(stub.calledOnceWith(table_names.webhooks, { pk, sk })).to.be.true; // Updated call
    });
  });

  describe('deleteToken', () => {
    it('should delete a token record', async () => {
      const pk = 'user#user123';
      const sk = 'token#token456';
      const stub = sinon.stub(scylla_db, 'deleteItem').resolves({});

      const result = await payment_gateway_service.deleteToken(pk, sk);
      expect(result).to.deep.equal({});
      expect(stub.calledOnceWith(table_names.tokens, { pk, sk })).to.be.true; // Updated call
    });
  });

});