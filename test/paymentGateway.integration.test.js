import { expect } from 'chai';
import payment_gateway_service from '../src/services/paymentGateway/service.js';
import schema, { schemas } from '../src/services/paymentGateway/schema.js'; // This will create tables
import ScyllaDb from '../src/utils/ScyllaDb.js';

// Set env variables for local DynamoDB
process.env.SCYLLA_ALTERNATOR_ENDPOINT = process.env.SCYLLA_ALTERNATOR_TEST_ENDPOINT || 'http://localhost:8000/';
process.env.SCYLLA_ACCESS_REGION = process.env.SCYLLA_ACCESS_REGION || 'us-east-1';
process.env.SCYLLA_ACCESS_KEY = process.env.SCYLLA_ACCESS_KEY || 'fakeMyKeyId';
process.env.SCYLLA_ACCESS_PASSWORD = process.env.SCYLLA_ACCESS_PASSWORD || 'fakeSecret';
process.env.ENABLE_CACHE = 'false';

// Wait helper
const wait = ms => new Promise(r => setTimeout(r, ms));

describe('payment_gateway_service integration (local DynamoDB)', function () {
    this.timeout(30000);

    before(async () => {
        await schema.createTables();
        // Load schema config into ScyllaDb
        ScyllaDb.loadTableConfigsObject(schemas);
        await wait(2000);
    });

    after(async () => {
        // Optionally: clean up tables or data
        await schema.deleteTables();
        await wait();
    });

    // Sessions CRUD
    describe('SESSION CRUD operations', function () {
        const session = {
            pk: 'user#user1',
            sk: 'session#2025-01-01T00:00:00Z',
            userId: 'user1',
            orderId: 'order1',
            sessionType: 'card',
            gateway: 'axcess',
            status: 'pending',
            payloads: { requestData: {}, responseData: {} },
            createdAt: '2025-01-01T00:00:00Z',
        };

        before(async () => {
            await payment_gateway_service.saveSession(session);
        });

        after(async () => {
            await payment_gateway_service.deleteSession(session.pk, session.sk);
        });

        it('should retrieve a session', async () => {
            const sessions = await payment_gateway_service.get_user_sessions('user1', '2025-01-01', '2025-12-31');
            const found = sessions.find(s => s.pk === session.pk && s.sk === session.sk);
            expect(found).to.deep.equal(session);
        });

        it('should retrieve a session(-ve testcase)', async () => {
            const sessions = await payment_gateway_service.get_user_sessions('user1', '2026-01-01', '2026-12-31');
            const found = sessions.find(s => s.pk === session.pk && s.sk === session.sk);
            expect(found).to.be.undefined;
        });

        it('should update a session', async () => {
            const updates = { status: 'completed' };
            const updateRes = await payment_gateway_service.updateSession(session.pk, session.sk, updates);
            expect(updateRes.status).to.equal('completed');

            const sessions = await payment_gateway_service.get_user_sessions('user1', '2025-01-01', '2025-12-31');
            const updated = sessions.find(s => s.pk === session.pk && s.sk === session.sk);
            expect(updated.status).to.equal('completed');
        });

        it('should delete a session', async () => {
            const delRes = await payment_gateway_service.deleteSession(session.pk, session.sk);
            expect(delRes).to.be.ok;

            const sessions = await payment_gateway_service.get_user_sessions('user1', '2025-01-01', '2025-12-31');
            const deleted = sessions.find(s => s.pk === session.pk && s.sk === session.sk);
            expect(deleted).to.be.undefined;
        });
    });

    // Transactions CRUD
    describe('TRANSACTION CRUD operations', function () {
        const txn = {
            pk: 'user#user2',
            sk: 'txn#2025-02-01T00:00:00Z',
            userId: 'user2',
            orderId: 'order2',
            transactionId: 'txn1',
            orderType: 'payment',
            status: 'success',
            payloads: { requestData: {}, responseData: {} },
            createdAt: '2025-02-01T00:00:00Z',
        };

        before(async () => {
            await payment_gateway_service.saveTransaction(txn);
        });

        after(async () => {
            await payment_gateway_service.deleteTransaction(txn.pk, txn.sk);
        });

        it('should retrieve a transaction', async () => {
            const txns = await payment_gateway_service.get_user_transactions('user2', '2025-01-01', '2025-12-31');
            const found = txns.find(t => t.pk === txn.pk && t.sk === txn.sk);
            expect(found).to.deep.equal(txn);
        });

        it('should retrieve a transaction(-ve testcase)', async () => {
            const txns = await payment_gateway_service.get_user_transactions('user2', '2026-01-01', '2026-12-31');
            const found = txns.find(t => t.pk === txn.pk && t.sk === txn.sk);
            expect(found).to.be.undefined;
        });

        it('should update a transaction', async () => {
            const updates = { status: 'failed' };
            const updateRes = await payment_gateway_service.updateTransaction(txn.pk, txn.sk, updates);
            expect(updateRes.status).to.equal('failed');

            const txns = await payment_gateway_service.get_user_transactions('user2', '2025-01-01', '2025-12-31');
            const updated = txns.find(t => t.pk === txn.pk && t.sk === txn.sk);
            expect(updated.status).to.equal('failed');
        });

        it('should delete a transaction', async () => {
            const delRes = await payment_gateway_service.deleteTransaction(txn.pk, txn.sk);
            expect(delRes).to.be.ok;

            const txns = await payment_gateway_service.get_user_transactions('user2', '2025-01-01', '2025-12-31');
            const deleted = txns.find(t => t.pk === txn.pk && t.sk === txn.sk);
            expect(deleted).to.be.undefined;
        });
    });

    // Schedules CRUD
    describe('SCHEDULE CURD operations', function () {
        const sched = {
            pk: 'user#user3',
            sk: 'schedule#2025-03-01T00:00:00Z',
            userId: 'user3',
            orderId: 'order3',
            subscriptionId: 'sub1',
            status: 'active',
            frequency: 'monthly',
            amount: '100.00',
            currency: 'USD',
            registrationId: 'reg1',
            startDate: '2025-03-01',
            nextScheduleDate: '2025-04-01',
            createdAt: '2025-03-01T00:00:00Z',
        };

        before(async () => {
            await payment_gateway_service.saveSchedule(sched);
        });

        after(async () => {
            await payment_gateway_service.deleteSchedule(sched.pk, sched.sk);
        });

        it('should retrieve a schedule', async () => {
            const schedules = await payment_gateway_service.get_user_schedules('user3', '2025-01-01', '2025-12-31');
            const found = schedules.find(s => s.pk === sched.pk && s.sk === sched.sk);
            expect(found).to.include(sched);
        });

        it('should retrieve a schedule (-ve testcase)', async () => {
            const schedules = await payment_gateway_service.get_user_schedules('user3', '2026-01-01', '2026-12-31');
            const found = schedules.find(s => s.pk === sched.pk && s.sk === sched.sk);
            expect(found).to.be.undefined;
        });

        it('should update a schedule', async () => {
            const updates = { status: 'paused' };
            const updateRes = await payment_gateway_service.updateSchedule(sched.pk, sched.sk, updates);
            expect(updateRes.status).to.equal('paused');

            const schedules = await payment_gateway_service.get_user_schedules('user3', '2025-01-01', '2025-12-31');
            const updated = schedules.find(s => s.pk === sched.pk && s.sk === sched.sk);
            expect(updated.status).to.equal('paused');
        });

        it('should delete a schedule', async () => {
            const delRes = await payment_gateway_service.deleteSchedule(sched.pk, sched.sk);
            expect(delRes).to.be.ok;

            const schedules = await payment_gateway_service.get_user_schedules('user3', 'schedule#2025-01-01', 'schedule#2025-12-31');
            const deleted = schedules.find(s => s.pk === sched.pk && s.sk === sched.sk);
            expect(deleted).to.be.undefined;
        });
    });

    // Tokens CRUD
    describe('TOKEN CRUD operations', function () {
        const token = {
            pk: 'user#user4',
            sk: 'token#reg2',
            userId: 'user4',
            registrationId: 'reg2',
            last4: '1234',
            expiry: '2025-12',
            name: 'My Card',
            type: 'visa',
            createdAt: '2025-04-01T00:00:00Z',
        };

        before(async () => {
            await payment_gateway_service.saveToken(token);
        });

        after(async () => {
            await payment_gateway_service.deleteToken(token.pk, token.sk);
        });

        it('should save and retrieve a token', async () => {
            const tokens = await payment_gateway_service.get_user_tokens('user4');
            const found = tokens.find(t => t.pk === token.pk && t.sk === token.sk);
            expect(found).to.include({
                pk: token.pk,
                sk: token.sk,
                userId: token.userId,
                registrationId: token.registrationId,
                last4: token.last4,
                expiry: token.expiry,
                name: token.name,
                type: token.type,
                createdAt: token.createdAt,
            });
        });

        it('should update a token', async () => {
            const updates = { name: 'Updated Card Name' };
            const updateRes = await payment_gateway_service.updateToken(token.pk, token.sk, updates);
            expect(updateRes.name).to.equal('Updated Card Name');

            const tokens = await payment_gateway_service.get_user_tokens('user4');
            const updated = tokens.find(t => t.pk === token.pk && t.sk === token.sk);
            expect(updated.name).to.equal('Updated Card Name');
        });

        it('should delete a token', async () => {
            const delRes = await payment_gateway_service.deleteToken(token.pk, token.sk);
            expect(delRes).to.be.ok;

            const tokens = await payment_gateway_service.get_user_tokens('user4');
            const deleted = tokens.find(t => t.pk === token.pk && t.sk === token.sk);
            expect(deleted).to.be.undefined;
        });
    });

    // Webhooks CRUD
    describe('WEBHOOK CRUD operations', function () {
        const webhook = {
            pk: 'order#order5',
            sk: 'webhook#key123',
            orderId: 'order5',
            payload: { event: 'payment.success' },
            actionTaken: 'processed',
            handled: true,
            idempotencyKey: 'key123',
            createdAt: '2025-05-01T00:00:00Z',
        };

        before(async () => {
            await payment_gateway_service.saveWebhook(webhook);
        });

        after(async () => {
            await payment_gateway_service.deleteWebhook(webhook.pk, webhook.sk);
        });

        it('should save and retrieve a webhook', async () => {
            const webhooks = await payment_gateway_service.get_order_webhooks('order5');
            const found = webhooks.find(w => w.pk === webhook.pk && w.sk === webhook.sk);
            expect(found).to.deep.equal(webhook);
        });

        it('should update the webhook', async () => {
            const updates = { handled: false };
            const updateRes = await payment_gateway_service.updateWebhook(webhook.pk, webhook.sk, updates);
            expect(updateRes.handled).to.equal(false);

            const webhooksAfterUpdate = await payment_gateway_service.get_order_webhooks('order5');
            const updated = webhooksAfterUpdate.find(w => w.pk === webhook.pk && w.sk === webhook.sk);
            expect(updated.handled).to.equal(false);
        });

        it('should delete the webhook and confirm webhook deleted', async () => {
            const delRes = await payment_gateway_service.deleteWebhook(webhook.pk, webhook.sk);
            expect(delRes).to.be.ok;

            const webhooksAfterDelete = await payment_gateway_service.get_order_webhooks('order5');
            const deleted = webhooksAfterDelete.find(w => w.pk === webhook.pk && w.sk === webhook.sk);
            expect(deleted).to.be.undefined;
        });
    });

    // Query by GSI (subscription schedules)
    describe('SCHEDULE GSI (subscription) operations', function () {
        const subId = 'sub2';
        const sched = {
            pk: 'user#user5',
            sk: 'schedule#2025-06-01T00:00:00Z',
            userId: 'user5',
            orderId: 'order6',
            subscriptionId: `sub#${subId}`,
            status: 'active',
            frequency: 'monthly',
            amount: '50.00',
            currency: 'USD',
            registrationId: 'reg3',
            startDate: '2025-06-01',
            nextScheduleDate: '2025-07-01',
            createdAt: '2025-06-01T00:00:00Z',
        };

        before(async () => {
            await payment_gateway_service.saveSchedule(sched);
        });

        after(async () => {
            await payment_gateway_service.deleteSchedule(sched.pk, sched.sk);
        });

        it('should get schedules for a subscription via GSI', async () => {
            const schedules = await payment_gateway_service.get_subscription_schedules(subId, '2025-01-01', '2025-12-31');
            // Should find at least one schedule with the correct subscriptionId
            const found = schedules.find(s => s.subscriptionId === `sub#${subId}` && s.pk === sched.pk && s.sk === sched.sk);
            expect(found).to.include({
                pk: sched.pk,
                sk: sched.sk,
                userId: sched.userId,
                orderId: sched.orderId,
                subscriptionId: sched.subscriptionId,
                status: sched.status,
                frequency: sched.frequency,
                amount: sched.amount,
                currency: sched.currency,
                registrationId: sched.registrationId,
                startDate: sched.startDate,
                nextScheduleDate: sched.nextScheduleDate,
                createdAt: sched.createdAt,
            });
        });
    });

    // Query by GSI (tokens soon to expire)
    it('should get tokens soon to expire', async () => {
        const token = {
            pk: 'user#user6',
            sk: 'token#reg4',
            userId: 'user6',
            registrationId: 'reg4',
            last4: '5678',
            expiry: 'expiry#2025-07',
            name: 'Expiring Card',
            type: 'mastercard',
            createdAt: '2025-07-01T00:00:00Z',
        };
        await payment_gateway_service.saveToken(token);
        const tokens = await payment_gateway_service.get_tokens_soon_to_expire('2025-07');
        expect(tokens).to.be.an('array');
    });

    // Query by GSI (failed transactions)
    it('should get failed transactions', async () => {
        const txn = {
            pk: 'user#user7',
            sk: 'txn#2025-02-01T00:00:00Z',
            userId: 'user7',
            orderId: 'order7',
            transactionId: 'txn2',
            orderType: 'payment',
            status: 'failed',
            payloads: { requestData: {}, responseData: {} },
            createdAt: '2025-08-01T00:00:00Z',
        };
        await payment_gateway_service.saveTransaction(txn);
        const txns = await payment_gateway_service.get_failed_transactions('2025-01-01', '2025-12-31');
        expect(txns).to.be.an('array');
    });

    // Test get_order_transactions
    it('should get transactions for an order', async () => {
        const orderId = 'order#order9';
        const pk = 'user#user9';
        const createdAt = '2025-09-01T00:00:00Z';
        const txn1 = {
            pk,
            sk: `txn#${createdAt}`,
            userId: 'user9',
            orderId,
            transactionId: 'txn9-1',
            orderType: 'payment',
            status: 'success',
            payloads: { requestData: {}, responseData: {} },
            createdAt,
        };
        const txn2 = {
            pk,
            sk: `txn#2025-09-02T00:00:00Z`,
            userId: 'user9',
            orderId,
            transactionId: 'txn9-2',
            orderType: 'refund',
            status: 'pending',
            payloads: { requestData: {}, responseData: {} },
            createdAt: '2025-09-02T00:00:00Z',
        };
        
        await payment_gateway_service.saveTransaction(txn1);
        await payment_gateway_service.saveTransaction(txn2);
        
        const transactions = await payment_gateway_service.get_order_transactions(orderId);
        expect(transactions).to.be.an('array');
        expect(transactions.length).to.be.at.least(2);
        
        const found1 = transactions.find(t => t.transactionId === 'txn9-1');
        const found2 = transactions.find(t => t.transactionId === 'txn9-2');
        expect(found1).to.exist;
        expect(found2).to.exist;
        
        // Cleanup
        await payment_gateway_service.deleteTransaction(txn1.pk, txn1.sk);
        await payment_gateway_service.deleteTransaction(txn2.pk, txn2.sk);
    });

    // Test get_order_sessions
    it('should get sessions for an order', async () => {
        const orderId = 'order#order10';
        const pk = 'user#user10';
        const createdAt = '2025-09-01T00:00:00Z';
        const session1 = {
            pk,
            sk: `session#${createdAt}`,
            userId: 'user10',
            orderId,
            sessionType: 'card',
            gateway: 'axcess',
            status: 'pending',
            payloads: { requestData: {}, responseData: {} },
            createdAt,
        };
        const session2 = {
            pk,
            sk: `session#2025-09-02T00:00:00Z`,
            userId: 'user10',
            orderId,
            sessionType: 'token',
            gateway: 'stripe',
            status: 'completed',
            payloads: { requestData: {}, responseData: {} },
            createdAt: '2025-09-02T00:00:00Z',
        };
        
        await payment_gateway_service.saveSession(session1);
        await payment_gateway_service.saveSession(session2);
        
        const sessions = await payment_gateway_service.get_order_sessions(orderId);
        expect(sessions).to.be.an('array');
        expect(sessions.length).to.be.at.least(2);
        
        const found1 = sessions.find(s => s.sessionType === 'card');
        const found2 = sessions.find(s => s.sessionType === 'token');
        expect(found1).to.exist;
        expect(found2).to.exist;
        
        // Cleanup
        await payment_gateway_service.deleteSession(session1.pk, session1.sk);
        await payment_gateway_service.deleteSession(session2.pk, session2.sk);
    });

    // Test get_subscription_webhooks
    it('should get webhooks for a subscription', async () => {
        const subscriptionId = 'sub11';
        const webhook1 = {
            pk: 'order#order11',
            sk: 'webhook#key11-1',
            orderId: 'order11',
            subscriptionId: `sub#${subscriptionId}`,
            payload: { event: 'subscription.created' },
            actionTaken: 'processed',
            handled: true,
            idempotencyKey: 'key11-1',
            createdAt: '2025-09-01T00:00:00Z',
        };
        const webhook2 = {
            pk: 'order#order12',
            sk: 'webhook#key11-2',
            orderId: 'order12',
            subscriptionId: `sub#${subscriptionId}`,
            payload: { event: 'subscription.updated' },
            actionTaken: 'queued',
            handled: false,
            idempotencyKey: 'key11-2',
            createdAt: '2025-09-02T00:00:00Z',
        };
        
        await payment_gateway_service.saveWebhook(webhook1);
        await payment_gateway_service.saveWebhook(webhook2);
        
        const webhooks = await payment_gateway_service.get_subscription_webhooks(subscriptionId);
        expect(webhooks).to.be.an('array');
        expect(webhooks.length).to.be.at.least(2);
        
        const found1 = webhooks.find(w => w.idempotencyKey === 'key11-1');
        const found2 = webhooks.find(w => w.idempotencyKey === 'key11-2');
        expect(found1).to.exist;
        expect(found2).to.exist;
        expect(found1.payload.event).to.equal('subscription.created');
        expect(found2.payload.event).to.equal('subscription.updated');
        
        // Cleanup
        await payment_gateway_service.deleteWebhook(webhook1.pk, webhook1.sk);
        await payment_gateway_service.deleteWebhook(webhook2.pk, webhook2.sk);
    });

    // Full order data
    it('should get full order data', async () => {
        const orderId = 'order8';
        const pk = 'user#user8';
        const createdAt = '2025-09-01T00:00:00Z';
        const txn = {
            pk,
            sk: `txn#${createdAt}`,
            userId: 'user8',
            orderId: `order#${orderId}`,
            transactionId: 'txn3',
            orderType: 'payment',
            status: 'success',
            payloads: { requestData: {}, responseData: {} },
            createdAt
        };
        const session = {
            pk,
            sk: `session#${createdAt}`,
            userId: 'user8',
            orderId: `order#${orderId}`,
            sessionType: 'card',
            gateway: 'axcess',
            status: 'pending',
            payloads: { requestData: {}, responseData: {} },
            createdAt
        };
        const sched = {
            pk,
            sk: `schedule#${createdAt}`,
            userId: 'user8',
            orderId: `order#${orderId}`,
            subscriptionId: 'sub3',
            status: 'active',
            frequency: 'monthly',
            amount: '75.00',
            currency: 'USD',
            registrationId: 'reg5',
            startDate: '2025-09-01',
            nextScheduleDate: '2025-10-01',
            createdAt,
        };
        await payment_gateway_service.saveTransaction(txn);
        await payment_gateway_service.saveSession(session);
        await payment_gateway_service.saveSchedule(sched);
        const data = await payment_gateway_service.get_order_full_data(orderId);
        expect(data).to.have.keys(['txns', 'sessions', 'schedules']);
    });


}); 