import { expect } from 'chai'
import sinon from 'sinon'
import scylla_db from '../src/utils/ScyllaDb.js'
import payment_gateway_service from '../src/services/paymentGateway/service.js'

describe('payment_gateway_service', () => {

  afterEach(() => {
    sinon.restore();
  });

  // ===== GET METHODS TESTS =====

  describe('get_user_transactions', () => {
    it('should return transactions for a user within date range', async () => {
      const fakeResult = [{ transactionId: 'txn1' }];
      const stub = sinon.stub(scylla_db, 'query').resolves(fakeResult);

      const result = await payment_gateway_service.get_user_transactions('user123', '2025-01-01', '2025-12-31');
      expect(result).to.deep.equal(fakeResult);
      expect(stub.calledOnce).to.be.true;
      expect(stub.calledWith('paymentGateway_transactions', '#pk = :pk AND created_at BETWEEN :start AND :end',
        { ':pk': 'user#user123', ':start': '2025-01-01', ':end': '2025-12-31' })).to.be.true;
    });
  });

  describe('get_user_schedules', () => {
    it('should return schedules for a user within date range', async () => {
      const fakeResult = [{ scheduleId: 'sched1' }];
      const stub = sinon.stub(scylla_db, 'query').resolves(fakeResult);

      const result = await payment_gateway_service.get_user_schedules('user123', '2025-01-01', '2025-12-31');
      expect(result).to.deep.equal(fakeResult);
      expect(stub.calledOnce).to.be.true;
      expect(stub.calledWith('paymentGateway_schedules', '#pk = :pk AND created_at BETWEEN :start AND :end',
        { ':pk': 'user#user123', ':start': '2025-01-01', ':end': '2025-12-31' })).to.be.true;
    });
  });

  describe('get_subscription_schedules', () => {
    it('should return schedules for a subscription within date range', async () => {
      const fakeResult = [{ scheduleId: 'sched1' }];
      const stub = sinon.stub(scylla_db, 'query').resolves(fakeResult);

      const result = await payment_gateway_service.get_subscription_schedules('sub123', '2025-01-01', '2025-12-31');
      expect(result).to.deep.equal(fakeResult);
      expect(stub.calledOnce).to.be.true;
      expect(stub.calledWith('paymentGateway_schedules', '#gsi_subscription_pk = :gsi AND created_at BETWEEN :start AND :end',
        { ':gsi': 'sub#sub123', ':start': '2025-01-01', ':end': '2025-12-31' }, { indexName: 'gsi1' })).to.be.true;
    });
  });

  describe('get_order_transactions', () => {
    it('should return transactions for an order within date range', async () => {
      const fakeResult = [{ transactionId: 'txn1' }];
      const stub = sinon.stub(scylla_db, 'query').resolves(fakeResult);

      const result = await payment_gateway_service.get_order_transactions('order123', '2025-01-01', '2025-12-31');
      expect(result).to.deep.equal(fakeResult);
      expect(stub.calledOnce).to.be.true;
      expect(stub.calledWith('paymentGateway_transactions', '#gsi_order_pk = :gsi AND created_at BETWEEN :start AND :end',
        { ':gsi': 'order#order123', ':start': '2025-01-01', ':end': '2025-12-31' }, { indexName: 'gsi1' })).to.be.true;
    });
  });

  describe('get_user_sessions', () => {
    it('should return sessions for a user within date range', async () => {
      const fakeResult = [{ sessionId: 'sess1' }];
      const stub = sinon.stub(scylla_db, 'query').resolves(fakeResult);

      const result = await payment_gateway_service.get_user_sessions('user123', '2025-01-01', '2025-12-31');
      expect(result).to.deep.equal(fakeResult);
      expect(stub.calledOnce).to.be.true;
      expect(stub.calledWith('paymentGateway_sessions', '#pk = :pk AND created_at BETWEEN :start AND :end',
        { ':pk': 'user#user123', ':start': '2025-01-01', ':end': '2025-12-31' })).to.be.true;
    });
  });

  describe('get_order_sessions', () => {
    it('should return sessions for an order within date range', async () => {
      const fakeResult = [{ sessionId: 'sess1' }];
      const stub = sinon.stub(scylla_db, 'query').resolves(fakeResult);

      const result = await payment_gateway_service.get_order_sessions('order123', '2025-01-01', '2025-12-31');
      expect(result).to.deep.equal(fakeResult);
      expect(stub.calledOnce).to.be.true;
      expect(stub.calledWith('paymentGateway_sessions', '#gsi_order_pk = :gsi AND created_at BETWEEN :start AND :end',
        { ':gsi': 'order#order123', ':start': '2025-01-01', ':end': '2025-12-31' }, { indexName: 'gsi1' })).to.be.true;
    });
  });

  describe('get_user_tokens', () => {
    it('should return tokens for a user', async () => {
      const fakeResult = [{ tokenId: 'token1' }];
      const stub = sinon.stub(scylla_db, 'query').resolves(fakeResult);

      const result = await payment_gateway_service.get_user_tokens('user123');
      expect(result).to.deep.equal(fakeResult);
      expect(stub.calledOnce).to.be.true;
      expect(stub.calledWith('paymentGateway_tokens', '#pk = :pk', { ':pk': 'user#user123' })).to.be.true;
    });
  });

  describe('get_tokens_soon_to_expire', () => {
    it('should return tokens expiring in a specific month', async () => {
      const fakeResult = [{ tokenId: 'token1' }];
      const stub = sinon.stub(scylla_db, 'query').resolves(fakeResult);

      const result = await payment_gateway_service.get_tokens_soon_to_expire('2025-07');
      expect(result).to.deep.equal(fakeResult);
      expect(stub.calledOnce).to.be.true;
      expect(stub.calledWith('paymentGateway_tokens', '#gsi_expiry_pk = :gsi',
        { ':gsi': 'expiry#2025-07' }, { indexName: 'gsi1' })).to.be.true;
    });
  });

  describe('get_failed_transactions', () => {
    it('should return failed transactions within date range', async () => {
      const fakeResult = [{ transactionId: 'txn1' }];
      const stub = sinon.stub(scylla_db, 'query').resolves(fakeResult);

      const result = await payment_gateway_service.get_failed_transactions('2025-01-01', '2025-12-31');
      expect(result).to.deep.equal(fakeResult);
      expect(stub.calledOnce).to.be.true;
      expect(stub.calledWith('paymentGateway_transactions', '#gsi_status_pk = :gsi AND created_at BETWEEN :start AND :end',
        { ':gsi': 'status#failed', ':start': '2025-01-01', ':end': '2025-12-31' }, { indexName: 'gsi1' })).to.be.true;
    });
  });

  describe('get_order_webhooks', () => {
    it('should return webhooks for an order', async () => {
      const fakeResult = [{ webhookId: 'webhook1' }];
      const stub = sinon.stub(scylla_db, 'query').resolves(fakeResult);

      const result = await payment_gateway_service.get_order_webhooks('order123');
      expect(result).to.deep.equal(fakeResult);
      expect(stub.calledOnce).to.be.true;
      expect(stub.calledWith('paymentGateway_webhooks', '#pk = :pk', { ':pk': 'order#order123' })).to.be.true;
    });
  });

  describe('get_subscription_webhooks', () => {
    it('should return webhooks for a subscription', async () => {
      const fakeResult = [{ webhookId: 'webhook1' }];
      const stub = sinon.stub(scylla_db, 'query').resolves(fakeResult);

      const result = await payment_gateway_service.get_subscription_webhooks('sub123');
      expect(result).to.deep.equal(fakeResult);
      expect(stub.calledOnce).to.be.true;
      expect(stub.calledWith('paymentGateway_webhooks', '#gsi_subscription_pk = :gsi',
        { ':gsi': 'sub#sub123' }, { indexName: 'gsi1' })).to.be.true;
    });
  });

  describe('get_order_full_data', () => {
    it('should return full order data including txns, sessions, and schedules', async () => {
      const txns = [{ id: 'txn1' }];
      const sessions = [{ id: 'sess1' }];
      const schedules = [{ id: 'sched1' }];

      sinon.stub(payment_gateway_service, 'get_order_transactions').resolves(txns);
      sinon.stub(payment_gateway_service, 'get_order_sessions').resolves(sessions);
      sinon.stub(scylla_db, 'query').resolves(schedules);

      const result = await payment_gateway_service.get_order_full_data('order123');
      expect(result).to.deep.equal({ txns, sessions, schedules });
    });
  });

  // ===== SAVE METHODS TESTS =====

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
      expect(stub.calledOnceWith('paymentGateway_sessions', fakeSession)).to.be.true;
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
      expect(stub.calledOnceWith('paymentGateway_transactions', fakeTransaction)).to.be.true;
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
      expect(stub.calledOnceWith('paymentGateway_schedules', fakeSchedule)).to.be.true;
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
      expect(stub.calledOnceWith('paymentGateway_webhooks', fakeWebhook)).to.be.true;
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
      expect(stub.calledOnceWith('paymentGateway_tokens', fakeToken)).to.be.true;
    });
  });

  // ===== UPDATE METHODS TESTS =====

  describe('updateSession', () => {
    it('should update a session record', async () => {
      const pk = 'user#user123';
      const sk = 'session#sess456';
      const updates = { status: 'completed', transactionId: 'txn789' };
      const stub = sinon.stub(scylla_db, 'updateItem').resolves(updates);

      const result = await payment_gateway_service.updateSession(pk, sk, updates);
      expect(result).to.deep.equal(updates);
      expect(stub.calledOnceWith('paymentGateway_sessions', pk, sk, updates)).to.be.true;
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
      expect(stub.calledOnceWith('paymentGateway_transactions', pk, sk, updates)).to.be.true;
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
      expect(stub.calledOnceWith('paymentGateway_schedules', pk, sk, updates)).to.be.true;
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
      expect(stub.calledOnceWith('paymentGateway_webhooks', pk, sk, updates)).to.be.true;
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
      expect(stub.calledOnceWith('paymentGateway_tokens', pk, sk, updates)).to.be.true;
    });
  });

  // ===== DELETE METHODS TESTS =====

  describe('deleteSession', () => {
    it('should delete a session record', async () => {
      const pk = 'user#user123';
      const sk = 'session#sess456';
      const stub = sinon.stub(scylla_db, 'deleteItem').resolves({});

      const result = await payment_gateway_service.deleteSession(pk, sk);
      expect(result).to.deep.equal({});
      expect(stub.calledOnceWith('paymentGateway_sessions', pk, sk)).to.be.true;
    });
  });

  describe('deleteTransaction', () => {
    it('should delete a transaction record', async () => {
      const pk = 'user#user123';
      const sk = 'transaction#txn456';
      const stub = sinon.stub(scylla_db, 'deleteItem').resolves({});

      const result = await payment_gateway_service.deleteTransaction(pk, sk);
      expect(result).to.deep.equal({});
      expect(stub.calledOnceWith('paymentGateway_transactions', pk, sk)).to.be.true;
    });
  });

  describe('deleteSchedule', () => {
    it('should delete a schedule record', async () => {
      const pk = 'user#user123';
      const sk = 'schedule#sched456';
      const stub = sinon.stub(scylla_db, 'deleteItem').resolves({});

      const result = await payment_gateway_service.deleteSchedule(pk, sk);
      expect(result).to.deep.equal({});
      expect(stub.calledOnceWith('paymentGateway_schedules', pk, sk)).to.be.true;
    });
  });

  describe('deleteWebhook', () => {
    it('should delete a webhook record', async () => {
      const pk = 'order#order123';
      const sk = 'webhook#web456';
      const stub = sinon.stub(scylla_db, 'deleteItem').resolves({});

      const result = await payment_gateway_service.deleteWebhook(pk, sk);
      expect(result).to.deep.equal({});
      expect(stub.calledOnceWith('paymentGateway_webhooks', pk, sk)).to.be.true;
    });
  });

  describe('deleteToken', () => {
    it('should delete a token record', async () => {
      const pk = 'user#user123';
      const sk = 'token#token456';
      const stub = sinon.stub(scylla_db, 'deleteItem').resolves({});

      const result = await payment_gateway_service.deleteToken(pk, sk);
      expect(result).to.deep.equal({});
      expect(stub.calledOnceWith('paymentGateway_tokens', pk, sk)).to.be.true;
    });
  });

});