# Church Management Backend

A comprehensive backend API for church management applications built with Node.js, Express, MongoDB, and modern web technologies.

## 🚀 Features

### Core Functionality

- **User Authentication & Authorization**: JWT-based authentication with role-based access control
- **Church Management**: Multi-church support with independent data isolation
- **Member Management**: Comprehensive member tracking with attendance and volunteer team management
- **Financial Management**: Donation tracking, expense management, and manual financial records
- **Donation Campaigns**: GoFundMe-like fundraising campaigns with progress tracking
- **Real-time Notifications**: Pusher integration for instant updates
- **Payment Integration**: Monnify payment gateway for online donations

### Technical Features

- **RESTful API**: Well-structured endpoints with comprehensive validation
- **Database Optimization**: MongoDB with Mongoose, proper indexing, and aggregation pipelines
- **Security**: JWT authentication, bcrypt password hashing, input sanitization, and CORS protection
- **Performance**: Compression, rate limiting, and efficient database queries
- **Scalability**: Designed to handle multiple churches with independent data

## 🛠️ Tech Stack

- **Backend**: Node.js, Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT, bcryptjs
- **Payment Gateway**: Monnify
- **Real-time**: Pusher
- **Email**: Nodemailer
- **File Upload**: Multer
- **Validation**: express-validator
- **Security**: Helmet, CORS, express-rate-limit

## 📋 Prerequisites

- Node.js (v14 or higher)
- MongoDB (v4.4 or higher)
- Monnify account and API credentials
- Pusher account and credentials
- Email service credentials (Mailtrap for development)

## 🚀 Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd church-app-backend
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Environment Configuration**

   ```bash
   cp .env.example .env
   ```

   Update the `.env` file with your configuration:

   ```env
   # Application
   APP_NAME=Church Management Backend
   NODE_ENV=development
   PORT=5000
   URL=http://localhost:5000
   BACKEND_URL=http://localhost:5000
   FRONTEND_URL=http://localhost:3000
   
   # Database
   MONGO_URI=mongodb://localhost:27017/church-management
   
   # JWT
   JWT_SECRET=your-super-secret-jwt-key-here
   JWT_EXPIRES_IN=7d
   JWT_COOKIE_EXPIRES_IN=7
   
   # Monnify (Payment Gateway)
   MONNIFY_API_KEY=your-monnify-api-key
   MONNIFY_SECRET_KEY=your-monnify-secret-key
   MONNIFY_CONTRACT_CODE=your-monnify-contract-code
   MONNIFY_BASE_URL=https://sandbox-api.monnify.com
   
   # Pusher (Real-time)
   PUSHER_APP_ID=your-pusher-app-id
   PUSHER_APP_KEY=your-pusher-app-key
   PUSHER_APP_SECRET=your-pusher-app-secret
   PUSHER_APP_CLUSTER=your-pusher-cluster
   
   # Email (Development - Mailtrap)
   MAILTRAP_HOST=smtp.mailtrap.io
   MAILTRAP_PORT=2525
   MAILTRAP_USERNAME=your-mailtrap-username
   MAILTRAP_PASSWORD=your-mailtrap-password
   
   # Email (Production)
   MAIL_HOST=smtp.gmail.com
   MAIL_PORT=587
   MAIL_ADDR=your-email@gmail.com
   MAIL_SECRET=your-email-app-password
   MAIL_DISPLAYNAME=Church Sphere
   
   # Cloudflare
   CLOUDFLARE_API_TOKEN=your-cloudflare-api-token
   CLOUDFLARE_ZONE_ID=your-cloudflare-zone-id
   
   # Security
   BCRYPT_ROUNDS=12
   RATE_LIMIT_WINDOW_MS=900000
   RATE_LIMIT_MAX_REQUESTS=100
   ```

4. **Database Setup**

   ```bash
   # Start MongoDB (if using local installation)
   mongod
   
   # Or use MongoDB Atlas (cloud)
   # Update MONGO_URI in .env
   ```

5. **Start the application**

   ```bash
   # Development mode with auto-reload
   npm run dev
   
   # Production mode
   npm start
   ```

## 📚 API Documentation

### Authentication Endpoints

#### POST `/api/auth/register`

Register a new user

```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "phone": "08012345678",
  "password": "securePassword123",
  "role": "member"
}
```

#### POST `/api/auth/login`

Authenticate user and get JWT token

```json
{
  "email": "john@example.com",
  "password": "securePassword123"
}
```

#### POST `/api/auth/refresh-token`

Refresh JWT token using refresh token

#### POST `/api/auth/logout`

Logout user and invalidate tokens

### Church Management Endpoints

#### POST `/api/churches`

Create a new church

```json
{
  "name": "Grace Community Church",
  "description": "A welcoming community of believers",
  "address": {
    "street": "123 Church Street",
    "city": "Lagos",
    "state": "Lagos",
    "country": "Nigeria"
  },
  "contact": {
    "phone": "08012345678",
    "email": "info@gracechurch.com"
  },
  "denomination": "Protestant"
}
```

#### GET `/api/churches`

Get all churches with optional filtering

#### GET `/api/churches/:id`

Get church by ID

#### PUT `/api/churches/:id`

Update church information

### Member Management Endpoints

#### POST `/api/members`

Create a new member

```json
{
  "churchId": "church_id_here",
  "firstName": "Jane",
  "lastName": "Smith",
  "dateOfBirth": "1990-05-15",
  "gender": "female",
  "role": "member",
  "skills": ["singing", "teaching"],
  "interests": ["youth ministry", "music"]
}
```

#### GET `/api/members`

Get all members with filtering options

#### POST `/api/members/:id/attendance`

Record member attendance

```json
{
  "serviceType": "sunday-service",
  "serviceDate": "2024-01-21",
  "status": "present",
  "notes": "Arrived on time"
}
```

### Donation Management Endpoints

#### POST `/api/donations`

Create manual donation record

```json
{
  "churchId": "church_id_here",
  "amount": 5000,
  "currency": "NGN",
  "category": "tithe",
  "description": "Monthly tithe",
  "paymentMethod": "cash",
  "donorInfo": {
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "08012345678"
  }
}
```

#### POST `/api/donations/online`

Initialize online donation payment via Monnify

#### POST `/api/donations/callback`

Handle Monnify payment callbacks

### Volunteer Team Management Endpoints

#### POST `/api/volunteer-teams`

Create a new volunteer team

```json
{
  "churchId": "church_id_here",
  "name": "Ushering Team",
  "description": "Welcome and guide church attendees",
  "category": "service",
  "leader": {
    "userId": "user_id_here",
    "name": "Team Leader Name"
  },
  "requirements": {
    "minMembers": 5,
    "skills": ["communication", "hospitality"]
  }
}
```

### Expense Management Endpoints

#### POST `/api/expenses`

Create a new expense

```json
{
  "churchId": "church_id_here",
  "title": "Electricity Bill",
  "description": "Monthly electricity payment",
  "amount": 15000,
  "currency": "NGN",
  "category": "utilities",
  "subcategory": "electricity",
  "expenseDate": "2024-01-20",
  "priority": "high",
  "paymentMethod": "bank-transfer"
}
```

### Donation Campaign Endpoints

#### POST `/api/campaigns`

Create a new donation campaign

```json
{
  "churchId": "church_id_here",
  "title": "Building Fund Campaign",
  "description": "Help us build a new church building",
  "category": "building",
  "targetAmount": 50000000,
  "startDate": "2024-01-01",
  "endDate": "2024-12-31",
  "images": ["image1.jpg", "image2.jpg"],
  "socialSharing": {
    "enabled": true,
    "message": "Support our building project!"
  }
}
```

### Financial Records Endpoints

#### POST `/api/financial-records`

Create manual financial record

```json
{
  "churchId": "church_id_here",
  "recordType": "donation",
  "title": "Offline Donation",
  "description": "Cash donation received during service",
  "amount": 2500,
  "currency": "NGN",
  "category": "offering",
  "source": "cash",
  "donor": {
    "name": "Anonymous Donor",
    "isAnonymous": true
  }
}
```

### Notification Endpoints

#### POST `/api/notifications/send-church`

Send notification to church members

```json
{
  "type": "announcement",
  "title": "Special Service Announcement",
  "message": "Join us this Sunday for a special service",
  "priority": "normal",
  "data": {
    "sendEmail": true
  }
}
```

## 🔐 Authentication & Authorization

### JWT Token Structure

- **Access Token**: Short-lived (7 days) for API access
- **Refresh Token**: Long-lived for token renewal

### Role-Based Access Control

- **Super Admin**: Full system access
- **Church Admin**: Church-specific administration
- **Volunteer**: Team and service management
- **Member**: Basic church participation

### Protected Routes

Most endpoints require authentication via JWT token in the Authorization header:

```curl
Authorization: Bearer <jwt_token>
```

## 🗄️ Database Schema

### Core Models

- **User**: Authentication and user management
- **Church**: Church information and settings
- **Member**: Church membership and attendance
- **VolunteerTeam**: Team management and scheduling
- **Donation**: Financial contributions tracking
- **Expense**: Church expense management
- **DonationCampaign**: Fundraising campaigns
- **ManualFinancialRecord**: Offline financial transactions

### Database Indexes

- User email and phone uniqueness
- Church name and location search
- Member attendance date ranges
- Donation amount and date queries
- Expense category and status filtering

## 🔒 Security Features

- **Password Hashing**: bcrypt with 12 rounds
- **JWT Security**: Secure token generation and validation
- **Input Validation**: Comprehensive request validation
- **Rate Limiting**: API request throttling
- **CORS Protection**: Cross-origin request security
- **Helmet**: Security headers middleware
- **Data Sanitization**: Input cleaning and validation

## 📊 Performance Optimization

- **Database Indexing**: Strategic indexes for common queries
- **Aggregation Pipelines**: Efficient data processing
- **Pagination**: Large dataset handling
- **Compression**: Response size reduction
- **Caching**: Redis integration (planned)

## 🚀 Deployment

### Development

```bash
npm run dev
```

### Production

```bash
npm start
```

### Environment Variables

Ensure all required environment variables are set in production:

- Database connection strings
- API keys and secrets
- Email service credentials
- Payment gateway settings

### Hosting Recommendations

- **Backend**: Namecheap Shared Hosting, AWS, or DigitalOcean
- **Database**: MongoDB Atlas (cloud) or self-hosted
- **CDN**: Cloudflare for static assets

## 🧪 Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

## 📝 Code Quality

```bash
# Lint code
npm run lint

# Format code
npm run format

# Fix linting issues
npm run lint:fix
```

## 🔧 Configuration

### Database Connection

The application automatically connects to MongoDB using the `MONGO_URI` environment variable.

### File Upload

Configure Multer for file uploads in the appropriate routes.

### Email Service

Email service automatically switches between Mailtrap (development) and production SMTP based on `NODE_ENV`.

## 📈 Monitoring & Logging

- **Morgan**: HTTP request logging
- **Error Handling**: Centralized error management
- **Performance Metrics**: Response time tracking
- **Health Checks**: `/health` endpoint for monitoring

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions:

- Create an issue in the repository
- Contact the development team
- Check the API documentation

## 🔮 Future Enhancements

- **Real-time Chat**: Member communication features
- **Event Management**: Church event planning and RSVP
- **Reporting Dashboard**: Advanced analytics and insights
- **Mobile App**: React Native mobile application
- **Multi-language Support**: Internationalization
- **Advanced Security**: Two-factor authentication
- **Backup & Recovery**: Automated data backup systems

---

> **Built with ❤️ for the church community**
