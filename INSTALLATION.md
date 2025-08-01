# 📦 Installation Guide for GitHub Repository

## How to Add This Project to GitHub Repository

Follow these steps to add the LED Driver Testing Application to your GitHub repository at `https://github.com/Mysterious-096/store-me`.

### Prerequisites

1. **Git** installed on your system
2. **GitHub account** with access to the repository
3. **Node.js** (v16 or higher)
4. **Terminal/Command Prompt** access

### Step 1: Navigate to Your Local Repository

```bash
# If you already have the repository cloned
cd path/to/your/store-me

# If you don't have it cloned yet
git clone https://github.com/Mysterious-096/store-me.git
cd store-me
```

### Step 2: Create Project Structure

Create the complete folder structure for the LED driver testing application:

```bash
# Create main directories
mkdir -p client/src/{components/{auth,layout,common},contexts,pages,utils}
mkdir -p client/public
mkdir -p server/{routes,middleware,services}

# Create subdirectories
mkdir -p client/src/components/auth
mkdir -p client/src/components/layout
mkdir -p client/src/components/common
mkdir -p client/src/contexts
mkdir -p client/src/pages
mkdir -p client/src/utils
mkdir -p server/routes
mkdir -p server/middleware
mkdir -p server/services
```

### Step 3: Copy All Files

Copy all the files we've created. Here's the complete file list:

#### Root Files:
- `package.json`
- `.gitignore`
- `README.md`
- `SETUP.md`
- `INSTALLATION.md` (this file)

#### Server Files:
- `server/package.json`
- `server/.env.example`
- `server/index.js`
- `server/middleware/auth.js`
- `server/services/googleDrive.js`
- `server/routes/auth.js`
- `server/routes/drivers.js`
- `server/routes/upload.js`
- `server/routes/export.js`
- `server/routes/analytics.js`

#### Client Files:
- `client/package.json`
- `client/.env.example`
- `client/src/App.js`
- `client/src/contexts/AuthContext.js`
- `client/src/contexts/DataContext.js`
- `client/src/components/auth/ProtectedRoute.js`
- `client/src/pages/DataEntry.js`

### Step 4: Install Dependencies

```bash
# Install root dependencies
npm install

# Install server dependencies
cd server
npm install
cd ..

# Install client dependencies
cd client
npm install
cd ..
```

### Step 5: Create Environment Files

```bash
# Copy environment templates
cp server/.env.example server/.env
cp client/.env.example client/.env

# Edit the environment files with your actual credentials
# Use your preferred text editor (nano, vim, VSCode, etc.)
nano server/.env
nano client/.env
```

### Step 6: Commit and Push to GitHub

```bash
# Add all files to git
git add .

# Commit the changes
git commit -m "Add LED Driver Testing Application

- Complete full-stack application for LED driver testing
- React frontend with Material-UI
- Node.js backend with Express
- Firebase authentication with role-based access
- Google Drive integration for data storage
- Comprehensive data entry forms
- Analytics and reporting features
- Professional UI/UX for engineers"

# Push to GitHub
git push origin main
```

### Step 7: Verify Installation

1. **Check GitHub Repository**: Visit `https://github.com/Mysterious-096/store-me` to verify all files are uploaded
2. **Clone and Test**: Clone the repository to a new location and test the installation:

```bash
# Clone to test installation
git clone https://github.com/Mysterious-096/store-me.git test-installation
cd test-installation

# Install dependencies
npm run install-all

# Configure environment variables
cp server/.env.example server/.env
cp client/.env.example client/.env
# Edit .env files with your credentials

# Test the application
npm run dev
```

### Step 8: Set Up Firebase and Google Cloud

After pushing to GitHub, you'll need to set up the external services:

1. **Firebase Project**:
   - Create a new Firebase project
   - Enable Authentication with Email/Password
   - Generate service account credentials
   - Update `server/.env` with Firebase credentials

2. **Google Cloud Platform**:
   - Enable Google Drive API
   - Enable Google Sheets API
   - Create service account
   - Generate OAuth2 credentials
   - Update `server/.env` with Google API credentials

3. **Google Sheets and Drive**:
   - Create a Google Spreadsheet for data storage
   - Create a Google Drive folder for photos
   - Share both with your service account email
   - Update `server/.env` with spreadsheet and folder IDs

### Step 9: Create First Admin User

Once everything is set up:

1. Start the application: `npm run dev`
2. Register a user through the UI or Firebase Console
3. Set admin role using Firebase Console or backend API
4. Log in and start using the application

### Troubleshooting

#### Common Issues:

1. **Permission Denied**: Ensure you have write access to the repository
2. **Large File Warnings**: The project should be under GitHub's file size limits
3. **Environment Variables**: Never commit actual `.env` files with real credentials
4. **Dependencies**: Make sure all package.json files are properly created

#### Getting Help:

- Check the SETUP.md file for detailed configuration instructions
- Review error logs in the terminal
- Verify all environment variables are set correctly
- Ensure Firebase and Google Cloud APIs are properly configured

### Final Notes

- The `.env` files contain sensitive information and should never be committed to GitHub
- Always use the `.env.example` files as templates
- Make sure to set up proper Firebase security rules for production
- Consider setting up GitHub Actions for automated deployment

### Repository Structure After Installation

```
store-me/
├── client/                 # React frontend
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   ├── contexts/
│   │   ├── pages/
│   │   └── App.js
│   ├── package.json
│   └── .env.example
├── server/                 # Node.js backend
│   ├── routes/
│   ├── middleware/
│   ├── services/
│   ├── index.js
│   ├── package.json
│   └── .env.example
├── package.json           # Root package.json
├── .gitignore
├── README.md
├── SETUP.md
└── INSTALLATION.md
```

That's it! Your LED Driver Testing Application should now be successfully added to your GitHub repository and ready for development and deployment.