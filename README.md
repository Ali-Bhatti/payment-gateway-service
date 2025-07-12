# Payment Gateway Service

A Node.js service for managing payment transactions, sessions, schedules, tokens, and webhooks using ScyllaDB as the backend database.

## Features

- **Transaction Management**: Create, read, update, and delete payment transactions
- **Session Handling**: Manage payment sessions for different gateways
- **Schedule Management**: Handle recurring payment schedules
- **Token Storage**: Secure storage of payment tokens
- **Webhook Processing**: Process and store webhook events
- **GSI Support**: Global Secondary Indexes for efficient querying
- **Comprehensive Testing**: Full unit test coverage

## Quick Start

### Prerequisites

- Node.js (v14 or higher)
- Docker (for ScyllaDB)

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd payment-gateway-service

# Install dependencies
npm install

# Start ScyllaDB
docker-compose up -d

# Run database schema setup
node src/services/paymentGateway/schema.js

# Run tests
npm test
```

## Environment Variables

```bash
SCYLLA_KEYSPACE=payment_gateway
SCYLLA_CONTACT_POINTS=localhost
SCYLLA_LOCAL_DATACENTER=datacenter1
SCYLLA_USERNAME=your_username
SCYLLA_PASSWORD=your_password
```

## API Usage

### Basic Operations

```javascript
import payment_gateway_service from './src/services/paymentGateway/service.js';

// Get user transactions
const transactions = await payment_gateway_service.get_user_transactions('user123', '2025-01-01', '2025-12-31');

// Save a transaction
await payment_gateway_service.saveTransaction({
  userId: 'user123',
  orderId: 'order456',
  transactionId: 'txn789',
  orderType: 'payment',
  status: 'success',
  payloads: { requestData: {}, responseData: {} }
});

// Get order full data
const orderData = await payment_gateway_service.get_order_full_data('order123');
```

### Supported Tables

- `paymentGateway_sessions` - Payment session data
- `paymentGateway_transactions` - Transaction records
- `paymentGateway_schedules` - Recurring payment schedules
- `paymentGateway_tokens` - Payment tokens
- `paymentGateway_webhooks` - Webhook events

## Testing

```bash
# Run all tests
npm test

# Run specific test file
npm test test/paymentGateway.unit.test.js
```

## Project Structure

```
payment-gateway-service/
├── src/
│   ├── services/paymentGateway/
│   │   ├── service.js          # Main service logic
│   │   ├── schema.js           # Database schema setup
│   │   ├── handlers.js         # Request handlers
│   │   └── usage_examples.js   # Usage examples
│   └── utils/
│       └── ScyllaDb.js         # Database utility
├── test/
│   ├── paymentGateway.unit.test.js
│   └── scyllaDb.test.js
├── docker-compose.yml
└── package.json
```

## Dependencies

- `cassandra-driver`: ScyllaDB/Cassandra driver
- `chai`: Testing framework
- `mocha`: Test runner
- `sinon`: Mocking library for tests 