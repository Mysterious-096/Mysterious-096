# LED Driver Testing Application - Setup Guide

## Overview

This is a comprehensive cross-platform application for LED driver testing data management. It features:

- **Frontend**: React with Material-UI
- **Backend**: Node.js with Express
- **Authentication**: Firebase Authentication with role-based access
- **Storage**: Google Drive integration for data and photos
- **Data Management**: Google Sheets for structured data storage

## Prerequisites

Before setting up the application, ensure you have:

1. **Node.js** (v16 or higher)
2. **npm** or **yarn**
3. **Firebase account** with a project created
4. **Google Cloud Platform account** with Drive and Sheets APIs enabled

## 🔧 Installation

### 1. Clone the Repository

```bash
git clone https://github.com/Mysterious-096/store-me.git
cd store-me
```

### 2. Install Dependencies

```bash
# Install root dependencies
npm run install-all

# Or install manually:
npm install
cd server && npm install
cd ../client && npm install
```

## 🔥 Firebase Setup

### 1. Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project
3. Enable Authentication with Email/Password provider

### 2. Get Firebase Configuration

1. Go to Project Settings → General
2. In "Your apps" section, add a web app
3. Copy the configuration object

### 3. Setup Firebase Admin SDK

1. Go to Project Settings → Service Accounts
2. Generate a new private key
3. Download the JSON file (keep it secure)

## 🌐 Google Cloud Setup

### 1. Enable APIs

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project (same as Firebase)
3. Enable these APIs:
   - Google Drive API
   - Google Sheets API

### 2. Create Service Account

1. Go to IAM & Admin → Service Accounts
2. Create a new service account
3. Download the JSON key file

### 3. Setup OAuth2 (Optional for user consent)

1. Go to APIs & Services → Credentials
2. Create OAuth 2.0 Client ID
3. Add authorized redirect URIs

## 📝 Environment Configuration

### Server Environment (.env)

Create `server/.env` file:

```env
# Server Configuration
NODE_ENV=development
PORT=5000
CLIENT_URL=http://localhost:3000

# Firebase Admin SDK Configuration
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY_ID=your-private-key-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY_HERE\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project-id.iam.gserviceaccount.com
FIREBASE_CLIENT_ID=your-client-id
FIREBASE_AUTH_URI=https://accounts.google.com/o/oauth2/auth
FIREBASE_TOKEN_URI=https://oauth2.googleapis.com/token
FIREBASE_AUTH_PROVIDER_X509_CERT_URL=https://www.googleapis.com/oauth2/v1/certs
FIREBASE_CLIENT_X509_CERT_URL=https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-xxxxx%40your-project-id.iam.gserviceaccount.com

# Google Drive API Configuration
GOOGLE_DRIVE_CLIENT_ID=your-drive-client-id
GOOGLE_DRIVE_CLIENT_SECRET=your-drive-client-secret
GOOGLE_DRIVE_REDIRECT_URI=http://localhost:5000/api/auth/google/callback
GOOGLE_DRIVE_REFRESH_TOKEN=your-refresh-token

# Google Sheets Configuration
GOOGLE_SHEETS_SPREADSHEET_ID=your-spreadsheet-id
GOOGLE_DRIVE_FOLDER_ID=your-drive-folder-id

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRE=7d

# Application Settings
UPLOAD_MAX_SIZE=10485760
ALLOWED_IMAGE_TYPES=image/jpeg,image/png,image/webp
DEFAULT_PAGINATION_LIMIT=20
```

### Client Environment (.env)

Create `client/.env` file:

```env
# Firebase Configuration
REACT_APP_FIREBASE_API_KEY=your-firebase-api-key
REACT_APP_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=your-project-id
REACT_APP_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your-messaging-sender-id
REACT_APP_FIREBASE_APP_ID=your-app-id

# API Configuration
REACT_APP_API_BASE_URL=http://localhost:5000

# Application Configuration
REACT_APP_APP_NAME=LED Driver Testing App
REACT_APP_COMPANY_NAME=Electronics Manufacturing Company
REACT_APP_VERSION=1.0.0
```

## 📊 Google Sheets Setup

### 1. Create Spreadsheet

1. Create a new Google Spreadsheet
2. Name it "LED Driver Test Data"
3. Copy the spreadsheet ID from the URL
4. Add it to your environment variables

### 2. Create Drive Folder

1. Create a folder in Google Drive for driver photos
2. Copy the folder ID from the URL
3. Add it to your environment variables

### 3. Share with Service Account

1. Share the spreadsheet with your service account email (view/edit access)
2. Share the drive folder with your service account email (view/edit access)

## 🚀 Running the Application

### Development Mode

```bash
# Start both frontend and backend
npm run dev

# Or start separately:
# Terminal 1 - Backend
npm run server

# Terminal 2 - Frontend
npm run client
```

### Production Mode

```bash
# Build the frontend
npm run build

# Start the production server
npm start
```

## 👥 User Management

### Create First Admin User

After setting up, you'll need to create the first admin user:

1. Register a user through Firebase Console or the application
2. Get the user UID from Firebase Console
3. Use the backend API or Firebase Console to set custom claims:

```javascript
// Using Firebase Admin SDK
admin.auth().setCustomUserClaims(uid, { role: 'admin' });
```

### User Roles

- **admin**: Full access, can manage users and all features
- **engineer**: Can enter data, view all records, export reports
- **viewer**: Read-only access to data and reports

## 🔒 Security Considerations

1. **Environment Variables**: Never commit `.env` files to version control
2. **Firebase Security Rules**: Configure appropriate security rules
3. **API Keys**: Restrict API key usage in Google Cloud Console
4. **HTTPS**: Use HTTPS in production
5. **Rate Limiting**: Configure appropriate rate limits

## 📱 Features

### Data Entry
- Comprehensive LED driver test data form
- Real-time validation
- Photo upload with optimization
- Step-by-step wizard interface

### Data Management
- Search and filter capabilities
- Export to PDF and CSV
- Google Drive integration
- Automatic data backup

### Analytics
- Dashboard with key metrics
- Trend analysis
- Failure analysis
- Engineer performance tracking

### User Management
- Role-based access control
- User registration and management
- Activity tracking

## 🛠️ Troubleshooting

### Common Issues

1. **Firebase Connection**: Check API keys and project configuration
2. **Google Drive Access**: Verify service account permissions
3. **CORS Issues**: Ensure CLIENT_URL is correctly set
4. **Upload Failures**: Check file size limits and API quotas

### Getting Help

1. Check the console logs for detailed error messages
2. Verify all environment variables are set correctly
3. Ensure all APIs are enabled in Google Cloud Console
4. Check Firebase Authentication configuration

## 📞 Support

For technical support or questions:
- Email: jmistry096@gmail.com
- GitHub Issues: Create an issue in the repository

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.