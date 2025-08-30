# Subscription Model Implementation

## Overview

The Church Management Backend now includes a comprehensive subscription model with three tiers that control user access to various features based on their subscription level.

## Subscription Tiers

### 1. Free Plan (0 Naira Monthly)

- **Limits:**
  - Churches: 0 (cannot create churches)
  - Donation Campaigns: 0 (cannot create campaigns)
  - Admin Staff: 0 (cannot add admin staff)
  - Volunteers: 0 (cannot add volunteers)
  - Volunteer Teams: 0 (cannot create volunteer teams)

- **Features:**
  - User registration and login
  - Make donations to existing campaigns
  - Can be added as administrative member or volunteer to existing churches

### 2. Starter Plan (3000 Naira Monthly)

- **Limits:**
  - Churches: 1 (can create one church)
  - Donation Campaigns: 3 (can create up to 3 campaigns)
  - Admin Staff: 3 (can add up to 3 admin staff members)
  - Volunteers: Unlimited
  - Volunteer Teams: Unlimited

- **Features:**
  - All Free plan features
  - Create one church
  - Create up to 3 donation campaigns
  - Add up to 3 admin staff members
  - Add unlimited volunteers and volunteer teams

### 3. Organisation Plan (9000 Naira Monthly)

- **Limits:**
  - Churches: Unlimited
  - Donation Campaigns: Unlimited
  - Admin Staff: Unlimited
  - Volunteers: Unlimited
  - Volunteer Teams: Unlimited

- **Features:**
  - All Starter plan features
  - Create unlimited churches
  - Create unlimited donation campaigns
  - Add unlimited admin staff members
  - Add unlimited volunteers and volunteer teams
  - Advanced analytics and reporting
  - Priority customer support

## Implementation Components

### 1. Data Models

#### Subscription Model (`app/models/Subscription.js`)

- Defines subscription plan structure
- Includes pricing, limits, and features
- Provides methods to check feature availability and limits

#### UserSubscription Model (`app/models/UserSubscription.js`)

- Tracks individual user subscriptions
- Stores usage statistics for each resource type
- Manages billing cycles and payment history
- Provides methods to check if actions are allowed

### 2. Subscription Service (`config/subscriptionService.js`)

- Business logic for subscription management
- Methods to check if users can perform actions
- Usage tracking and limit enforcement
- Subscription creation and management

### 3. Middleware (`app/middleware/subscription.js`)

- **`canCreateChurch`**: Checks if user can create a new church
- **`canCreateCampaign`**: Checks if user can create a new donation campaign
- **`canAddAdminStaff`**: Checks if user can add admin staff members
- **`canCreateVolunteerTeams`**: Checks if user can create volunteer teams
- **`hasActiveSubscription`**: Checks if user has an active paid subscription
- **`hasMinimumSubscription`**: Checks if user has at least a specific subscription level

### 4. Routes Integration

Subscription checks are integrated into the following routes:

#### Church Creation (`app/routes/churches.js`)

```javascript
router.post('/', [
  protect,
  canCreateChurch,  // ← Subscription check
  sanitizeInput,
  // ... validation
], churchController.createChurch);
```

#### Campaign Creation (`app/routes/campaigns.js`)

```javascript
router.post('/', [
  protect,
  canCreateCampaign,  // ← Subscription check
  sanitizeInput,
  // ... validation
], campaignController.createCampaign);
```

#### Volunteer Team Creation (`app/routes/volunteerTeams.js`)

```javascript
router.post('/', [
  protect,
  canCreateVolunteerTeams,  // ← Subscription check
  sanitizeInput,
  // ... validation
], volunteerTeamController.createVolunteerTeam);
```

#### Admin Staff Addition (`app/routes/members.js`)

```javascript
router.post('/', [
  protect,
  canAddAdminStaff,  // ← Subscription check
  sanitizeInput,
  // ... validation
], memberController.createMember);
```

### 5. Subscription Management API (`app/routes/subscriptions.js`)

#### Public Endpoints

- `GET /api/subscriptions/plans` - Get available subscription plans

#### Private Endpoints

- `GET /api/subscriptions/current` - Get user's current subscription
- `GET /api/subscriptions/usage` - Get usage summary
- `POST /api/subscriptions/subscribe` - Subscribe to a plan
- `PUT /api/subscriptions/upgrade` - Upgrade subscription
- `PUT /api/subscriptions/cancel` - Cancel subscription
- `PUT /api/subscriptions/renew` - Renew subscription
- `GET /api/subscriptions/billing-history` - Get billing history
- `POST /api/subscriptions/process-payment` - Process payment
- `GET /api/subscriptions/analytics` - Get analytics (Admin only)

### 6. Controller (`app/controllers/subscriptionController.js`)

- Handles all subscription-related business logic
- Integrates with SubscriptionService for business rules
- Manages payment processing and subscription lifecycle
- Provides usage analytics and reporting

## Usage Examples

### Checking Subscription Limits in Controllers

```javascript
const SubscriptionService = require('../../config/subscriptionService');

// Check if user can create a church
const canCreate = await SubscriptionService.canCreateChurch(userId);
if (!canCreate) {
  return res.status(403).json({
    success: false,
    message: 'Your subscription plan does not allow creating churches'
  });
}
```

### Using Middleware for Route Protection

```javascript
const { canCreateChurch } = require('../middleware/subscription');

router.post('/churches', [
  protect,
  canCreateChurch,  // Automatically checks subscription limits
  // ... other middleware
], controller.createChurch);
```

### Getting User's Current Subscription

```javascript
const UserSubscription = require('../models/UserSubscription');

const subscription = await UserSubscription.getCurrentSubscription(userId);
if (subscription && subscription.isActive) {
  console.log(`User has ${subscription.subscriptionName} plan`);
  console.log(`Can create churches: ${subscription.canPerformAction('churches')}`);
}
```

## Database Initialization

### Running the Initialization Script

```bash
npm run init-subscriptions
```

This script will:

1. Connect to MongoDB
2. Clear existing subscription plans
3. Create the three default subscription plans
4. Set appropriate limits and features for each plan

### Manual Database Setup

```javascript
const Subscription = require('./app/models/Subscription');

// Create a subscription plan
const freePlan = new Subscription({
  name: 'free',
  displayName: 'Free Plan',
  price: { amount: 0, currency: 'NGN', billingCycle: 'monthly' },
  limits: {
    churches: 0,
    donationCampaigns: 0,
    adminStaff: 0,
    volunteers: 0,
    volunteerTeams: 0
  },
  // ... other fields
});

await freePlan.save();
```

## Security Considerations

### 1. Route Protection

- All subscription-gated routes are protected by appropriate middleware
- Subscription checks happen before business logic execution
- Failed subscription checks return 403 Forbidden responses

### 2. Usage Tracking

- All resource creation is tracked in UserSubscription model
- Limits are enforced at both middleware and service levels
- Usage statistics are maintained for billing and analytics

### 3. Payment Processing

- Subscription payments are processed through Monnify integration
- Payment verification is required before subscription activation
- Failed payments result in subscription suspension

## Monitoring and Analytics

### Usage Tracking

- Resource creation counts are maintained per user
- Subscription plan changes are logged
- Billing history is preserved for audit purposes

### Admin Analytics

- Total subscriptions per plan
- Revenue tracking
- Usage patterns and trends
- Subscription conversion rates

## Future Enhancements

### 1. Advanced Features

- Annual billing with discounts
- Custom plan creation for enterprise clients
- Usage-based billing for high-volume users
- Family/team subscription packages

### 2. Integration Features

- Webhook notifications for subscription events
- Email marketing integration for subscription management
- CRM integration for customer management
- Advanced reporting and analytics dashboard

### 3. Payment Features

- Multiple payment gateway support
- Subscription upgrade/downgrade proration
- Automatic retry for failed payments
- Subscription gift cards and promotions

## Testing

### Running Tests

```bash
# Run basic functionality tests
npm test

# Run subscription-specific tests
npm run test:subscriptions

# Run with coverage
npm run test:coverage
```

### Test Coverage

- Subscription model validation
- Middleware functionality
- Service business logic
- Controller operations
- Route protection
- Payment processing
- Usage tracking

## Troubleshooting

### Common Issues

#### 1. Subscription Check Failing

- Verify user has an active subscription
- Check if usage limits have been exceeded
- Ensure subscription plan is properly configured

#### 2. Usage Not Updating

- Verify UserSubscription model is being updated
- Check if pre-save hooks are working correctly
- Ensure proper error handling in controllers

#### 3. Payment Processing Issues

- Verify Monnify integration is working
- Check webhook signature validation
- Ensure proper error handling for failed payments

### Debug Mode

Enable debug logging by setting environment variable:

```bash
DEBUG=subscription:*
npm run dev
```

## Support

For issues related to the subscription model:

1. Check the logs for error messages
2. Verify database connections and models
3. Test subscription middleware independently
4. Review usage tracking and limits
5. Check payment gateway integration

## Conclusion

The subscription model provides a robust foundation for monetizing the Church Management Backend while ensuring fair usage limits and feature access control. The implementation is designed to be scalable, secure, and maintainable, with clear separation of concerns and comprehensive error handling.
