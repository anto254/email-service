# Email Service API

A clean, controller-based email service built with Node.js, Express, and Brevo API. No database required - stateless email sending with type-based routing.

## ✨ Features

- 📧 Type-based email sending (OTP, Welcome, etc.)
- 🎨 Beautiful HTML email templates
- ✅ Request validation
- 🏗️ Clean controller-based MVC architecture
- 🚀 No database dependency (stateless)
- 📝 Well-documented API
- 🧪 Fully tested
- 🔧 Easy to extend

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Create a `.env` file:

```env
# Server
PORT=3501
NODE_ENV=development

# Brevo Email Service
BREVO_SMTP_KEY=your-brevo-api-key

# Email Settings
SMTP_FROM=noreply@yourdomain.com
```

### 3. Start Server

```bash
npm start
# or for development
npm run dev
```

### 4. Send Your First Email

```bash
curl -X POST http://localhost:3501/api/email/send \
  -H "Content-Type: application/json" \
  -d '{
    "type": "otp",
    "email": "user@example.com",
    "otpCode": "123456",
    "recipientName": "John Doe"
  }'
```

## 📚 Documentation

- **[Quick Start Guide](QUICK_START.md)** - Get started in 5 minutes
- **[Architecture Guide](ARCHITECTURE.md)** - Deep dive into the architecture
- **[API Documentation](docs/EMAIL_SERVICE_GUIDE.md)** - Complete API reference
- **[Project Structure](PROJECT_STRUCTURE.md)** - Understanding the codebase
- **[Clean Code Comparison](CLEAN_CODE_COMPARISON.md)** - Before/after refactoring
- **[Refactor Summary](REFACTOR_SUMMARY.md)** - What changed and why

## 🏗️ Architecture

### Controller-Based MVC Pattern

```
Client Request
    ↓
Routes (URL mapping only)
    ↓
Validator (Request validation)
    ↓
Controller (Orchestration) ⭐
    ↓
Handler (Implementation)
    ↓
Template (HTML generation)
    ↓
Service (Brevo API)
    ↓
Response to Client
```

### Directory Structure

```
email-service/
├── controllers/            # Business logic orchestration
│   └── emailController.js
├── routes/                 # Clean routes (NO logic)
│   └── emailRoutes.js
├── validators/             # Request validation
│   └── emailValidator.js
├── handlers/email/         # Email implementations
│   └── otpHandler.js
├── templates/email/        # HTML templates
│   └── otpTemplate.js
└── services/               # External API integration
    └── emailService.js
```

## 📋 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/email/send` | Send email based on type |
| GET | `/api/email/types` | Get supported email types |
| GET | `/api/health` | Health check |

## 📨 Supported Email Types

### OTP Verification

Send one-time password verification emails.

**Request:**
```json
{
  "type": "otp",
  "email": "user@example.com",
  "otpCode": "123456",
  "recipientName": "John Doe"
}
```

**Response:**
```json
{
  "success": true,
  "message": "OTP email sent successfully",
  "data": {
    "messageId": "abc123...",
    "type": "otp"
  },
  "statusCode": 200
}
```

## 🧪 Testing

Run the test suite:

```bash
node test-email-service.js
```

Run the example:

```bash
node examples/send-otp-example.js
```

## ✨ Adding New Email Types

Adding a new email type is easy! Just 4 steps:

### 1. Create Template

```javascript
// templates/email/welcomeTemplate.js
const generateWelcomeEmail = (userName) => {
  return `<html>...</html>`;
};
module.exports = { generateWelcomeEmail };
```

### 2. Create Handler

```javascript
// handlers/email/welcomeHandler.js
const sendWelcomeEmail = async (email, userName) => {
  const html = generateWelcomeEmail(userName);
  return await emailService.sendBrevoEmail('Welcome', email, html);
};
module.exports = { sendWelcomeEmail };
```

### 3. Add Validation

```javascript
// validators/emailValidator.js
case 'welcome':
  validationResult = validateWelcomeRequest(req.body);
  break;
```

### 4. Update Controller

```javascript
// controllers/emailController.js
case 'welcome':
  result = await handleWelcomeEmail(req.body);
  break;

const handleWelcomeEmail = async (requestBody) => {
  const { email, userName } = requestBody;
  return await sendWelcomeEmail(email, userName);
};
```

**Done!** Routes stay clean - no changes needed.

## 🛠️ Tech Stack

- **Node.js** - Runtime
- **Express** - Web framework
- **Brevo (Sendinblue)** - Email API
- **express-async-handler** - Async error handling

## 🌟 Key Benefits

### Clean Architecture
- ✅ Controller-based MVC pattern
- ✅ Clear separation of concerns
- ✅ Single responsibility principle
- ✅ Easy to test and maintain

### No Database
- ✅ Stateless service
- ✅ Fast startup
- ✅ Easy deployment
- ✅ Horizontal scaling

### Developer Experience
- ✅ Well-documented code
- ✅ Clear file organization
- ✅ Easy to extend
- ✅ Comprehensive examples

## 📊 Code Quality

- **Route file size:** 25 lines (72% reduction from 90 lines)
- **Test coverage:** All core functionality tested
- **Architecture pattern:** MVC with controllers
- **Documentation:** Comprehensive guides included

## 🔍 Common Issues

### Email not sending
- Check `BREVO_SMTP_KEY` in `.env`
- Verify Brevo API is initialized (check server logs)
- Ensure recipient email is valid

### Validation errors
- Include all required fields
- Use correct field types
- Check email format

## 📦 Project Files

### Core Implementation
- `server.js` - Express app (NO database)
- `controllers/emailController.js` - Business logic orchestration
- `routes/emailRoutes.js` - Clean routes
- `handlers/email/otpHandler.js` - OTP implementation
- `templates/email/otpTemplate.js` - OTP HTML template
- `validators/emailValidator.js` - Request validation
- `services/emailService.js` - Brevo API integration

### Documentation
- `ARCHITECTURE.md` - Architecture deep dive
- `QUICK_START.md` - Quick reference
- `PROJECT_STRUCTURE.md` - Directory structure
- `CLEAN_CODE_COMPARISON.md` - Before/after comparison
- `REFACTOR_SUMMARY.md` - Refactoring summary
- `docs/EMAIL_SERVICE_GUIDE.md` - Complete API guide

### Testing & Examples
- `test-email-service.js` - Test suite
- `examples/send-otp-example.js` - Usage examples
- `postman-collection.json` - Postman collection

## 🤝 Contributing

When adding new features:
1. Follow the existing architecture pattern
2. Create separate files for templates, handlers, and validation
3. Update the controller, not the routes
4. Add tests and documentation
5. Follow clean code principles

## 📄 License

ISC

## 👨‍💻 Development

### Project Structure
See [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md) for detailed information.

### Architecture
See [ARCHITECTURE.md](ARCHITECTURE.md) for architecture documentation.

### Adding Features
See [QUICK_START.md](QUICK_START.md#adding-new-email-types) for step-by-step guide.

## 🎯 Roadmap

Future email types to add:
- [ ] Welcome email
- [ ] Password reset email
- [ ] Email verification
- [ ] Newsletter email
- [ ] Invoice email

---

**Version:** 2.0
**Architecture:** Controller-Based MVC
**Status:** ✅ Production Ready
**Last Updated:** 2025-11-10

For questions or issues, see the documentation in the `docs/` directory.
# email-service
