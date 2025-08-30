# Configuration Guide

This guide explains how to configure the Church Management Backend application.

## Environment Variables

Create a `.env` file in the root directory with the following variables:

### Application Configuration

```env
APP_NAME=Church Management Backend
NODE_ENV=development
PORT=5000
URL=http://localhost:5000
BACKEND_URL=http://localhost:5000
FRONTEND_URL=http://localhost:3000
```

### Database Configuration

```env
MONGO_URI=mongodb://localhost:27017/church-management
```

**Options:**

- **Local MongoDB**: `mongodb://localhost:27017/church-management`
- **MongoDB Atlas**: `mongodb+srv://username:password@cluster.mongodb.net/church-management`
- **Custom MongoDB**: `mongodb://username:password@host:port/database`

### JWT Configuration

```env
JWT_SECRET=your-super-secret-jwt-key-here-change-this-in-production
JWT_EXPIRES_IN=7d
JWT_COOKIE_EXPIRES_IN=7
```

**Security Note:** Generate a strong, random secret for `JWT_SECRET` in production.

### Monnify Payment Gateway Configuration

```env
MONNIFY_API_KEY=your-monnify-api-key
MONNIFY_SECRET_KEY=your-monnify-secret-key
MONNIFY_CONTRACT_CODE=your-monnify-contract-code
MONNIFY_BASE_URL=https://sandbox-api.monnify.com
```

**Setup Steps:**

1. Create a Monnify account at [monnify.com](https://monnify.com)
2. Get your API credentials from the dashboard
3. Use sandbox URLs for development, production URLs for live

### Pusher Real-time Configuration

```env
PUSHER_APP_ID=your-pusher-app-id
PUSHER_APP_KEY=your-pusher-app-key
PUSHER_APP_SECRET=your-pusher-app-secret
PUSHER_APP_CLUSTER=your-pusher-cluster
```

**Setup Steps:**

1. Create a Pusher account at [pusher.com](https://pusher.com)
2. Create a new app
3. Copy the credentials from the app dashboard

### Email Configuration

#### Development (Mailtrap)

```env
MAILTRAP_HOST=smtp.mailtrap.io
MAILTRAP_PORT=2525
MAILTRAP_USERNAME=your-mailtrap-username
MAILTRAP_PASSWORD=your-mailtrap-password
```

**Setup Steps:**

1. Create a Mailtrap account at [mailtrap.io](https://mailtrap.io)
2. Create a new inbox
3. Copy SMTP credentials

#### Production

```env
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_ADDR=your-email@gmail.com
MAIL_SECRET=your-email-app-password
MAIL_DISPLAYNAME=Church Management System
```

**Gmail Setup:**

1. Enable 2-factor authentication
2. Generate an app password
3. Use the app password as `MAIL_SECRET`

### Cloudflare Configuration

```env
CLOUDFLARE_API_TOKEN=your-cloudflare-api-token
CLOUDFLARE_ZONE_ID=your-cloudflare-zone-id
```

**Setup Steps:**

1. Create a Cloudflare account
2. Add your domain
3. Generate an API token with appropriate permissions
4. Get your zone ID from the domain overview

### Security Configuration

```env
BCRYPT_ROUNDS=12
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

**Explanation:**

- `BCRYPT_ROUNDS`: Password hashing strength (12 is recommended)
- `RATE_LIMIT_WINDOW_MS`: Rate limiting window in milliseconds (15 minutes)
- `RATE_LIMIT_MAX_REQUESTS`: Maximum requests per window

## Configuration Examples

### Development Environment

```env
NODE_ENV=development
MONGO_URI=mongodb://localhost:27017/church-management-dev
MONNIFY_BASE_URL=https://sandbox-api.monnify.com
```

### Production Environment

```env
NODE_ENV=production
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/church-management
MONNIFY_BASE_URL=https://api.monnify.com
```

### Testing Environment

```env
NODE_ENV=test
MONGO_URI=mongodb://localhost:27017/church-management-test
JWT_SECRET=test-secret-key
```

## Security Best Practices

1. **Never commit `.env` files** to version control
2. **Use strong, unique secrets** for JWT and API keys
3. **Rotate credentials regularly** in production
4. **Use environment-specific configurations**
5. **Validate all environment variables** on startup
6. **Use HTTPS in production** for all external communications

## Troubleshooting

### Common Issues

1. **MongoDB Connection Failed**
   - Check if MongoDB is running
   - Verify connection string format
   - Check network connectivity

2. **JWT Token Invalid**
   - Ensure `JWT_SECRET` is set
   - Check token expiration settings
   - Verify token format

3. **Email Not Sending**
   - Check SMTP credentials
   - Verify port and host settings
   - Check firewall settings

4. **Payment Gateway Errors**
   - Verify API credentials
   - Check base URL configuration
   - Ensure proper permissions

### Validation

The application validates required environment variables on startup. Missing variables will cause the application to exit with an error message.

### Testing Configuration

Use the health check endpoint to verify configuration:

```bash
curl http://localhost:5000/health
```

This will return configuration status and basic system information.
