# 🔧 LED Driver Testing Application

> **Professional Cross-Platform Application for Electronics Manufacturing**

A comprehensive LED driver testing data management system designed for electronics manufacturing companies. Built with modern web technologies and integrated with Google Drive for seamless data storage and collaboration.

## 🚀 Features

### 🔋 **LED Driver Testing Management**
- **Comprehensive Data Entry**: Full electrical specifications, safety tests, and quality metrics
- **Smart Photo Management**: Automated driver photo uploads with optimization
- **Real-time Validation**: Input validation with electrical engineering constraints
- **Step-by-step Wizard**: Intuitive multi-step form for complex data entry

### 📊 **Data Management & Analytics**
- **Google Drive Integration**: Automatic data backup and photo storage
- **Advanced Search**: Quick driver lookup by ID, name, or serial number
- **Analytics Dashboard**: Performance trends, failure analysis, and quality metrics
- **Export Capabilities**: PDF reports and CSV data exports

### 👥 **Professional User Management**
- **Role-based Access Control**: Admin, Engineer, and Viewer roles
- **Firebase Authentication**: Secure login with industry-standard security
- **User Activity Tracking**: Monitor testing activities and engineer performance
- **Profile Management**: User profiles with engineering credentials

### 🔒 **Enterprise Security**
- **Secure Authentication**: Firebase-powered authentication system
- **Data Protection**: Encrypted data transmission and storage
- **Access Controls**: Granular permissions based on user roles
- **Audit Trails**: Complete activity logging for compliance

## 🛠️ Technology Stack

### **Frontend**
- **React 18** - Modern UI framework
- **Material-UI (MUI)** - Professional design system
- **React Hook Form** - Efficient form management
- **React Router** - Client-side routing
- **Axios** - HTTP client for API communication

### **Backend**
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **Firebase Admin SDK** - Authentication and user management
- **Google APIs** - Drive and Sheets integration
- **Sharp** - Image processing and optimization

### **Storage & Database**
- **Google Drive** - File storage for photos and documents
- **Google Sheets** - Structured data storage with real-time collaboration
- **Firebase Auth** - User authentication and management

### **Development Tools**
- **Concurrently** - Development workflow management
- **ESLint** - Code quality and consistency
- **Prettier** - Code formatting

## 📁 Project Structure

```
led-driver-testing-app/
├── client/                 # React frontend application
│   ├── public/             # Static assets
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── contexts/       # React contexts (Auth, Data)
│   │   ├── pages/          # Main application pages
│   │   ├── utils/          # Utility functions
│   │   └── App.js          # Main application component
│   └── package.json        # Frontend dependencies
├── server/                 # Node.js backend application
│   ├── routes/             # API route handlers
│   ├── middleware/         # Authentication & validation middleware
│   ├── services/           # Business logic services
│   └── index.js            # Server entry point
├── package.json            # Root package.json with scripts
├── SETUP.md               # Detailed setup instructions
└── README.md              # This file
```

## 🚦 Quick Start

### 1. **Prerequisites**
- Node.js (v16 or higher)
- Firebase project with Authentication enabled
- Google Cloud Platform account with Drive/Sheets APIs enabled

### 2. **Installation**
```bash
# Clone the repository
git clone https://github.com/Mysterious-096/store-me.git
cd store-me

# Install all dependencies
npm run install-all
```

### 3. **Configuration**
1. Copy `.env.example` files and configure with your credentials
2. Set up Firebase project and get configuration
3. Enable Google Drive and Sheets APIs
4. Create service account and download credentials

### 4. **Run the Application**
```bash
# Development mode (starts both frontend and backend)
npm run dev

# Frontend only
npm run client

# Backend only
npm run server
```

Visit `http://localhost:3000` to access the application.

## 📖 Detailed Setup

For comprehensive setup instructions including Firebase configuration, Google Cloud setup, and environment variables, see [SETUP.md](./SETUP.md).

## 🎯 Use Cases

### **Electronics Manufacturing**
- LED driver testing and quality assurance
- Production line data management
- Compliance documentation and reporting
- Engineer performance tracking

### **Testing Laboratories**
- Electrical component testing workflows
- Test data organization and retrieval
- Client reporting and documentation
- Quality management systems

### **R&D Departments**
- Prototype testing and validation
- Performance trend analysis
- Design improvement tracking
- Engineering documentation

## 🔧 Key Technical Features

### **Data Validation**
- Real-time electrical parameter validation
- Range checking for voltage, current, and power values
- Required field enforcement
- Cross-field validation (e.g., efficiency calculations)

### **File Management**
- Automatic image optimization and resizing
- Organized folder structure in Google Drive
- Unique file naming conventions
- Multiple file format support

### **Reporting**
- Professional PDF report generation
- Comprehensive CSV data exports
- Custom report templates
- Automated data formatting

### **Performance**
- Optimized image uploads with Sharp
- Efficient data pagination
- Client-side caching strategies
- Progressive loading for large datasets

## 👨‍💻 About the Developer

**Jay Mistry** - Electronics Engineer & Full-Stack Developer
- 🛠️ Specialized in LED driver development and power electronics
- 📘 Expert in circuit design, testing, and calibration
- 💻 Full-stack developer with experience in React, Node.js, and cloud platforms
- 📧 Contact: jmistry096@gmail.com
- 🔗 LinkedIn: [Jay Mistry](https://www.linkedin.com/in/jay-mistry-92b158171/)

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📞 Support

For technical support or questions:
- Create an issue in this repository
- Email: jmistry096@gmail.com
- LinkedIn: Connect for professional inquiries

---

<p align="center">
  <em>"Good circuits solve problems. Great circuits create possibilities."</em>
</p>

<p align="center">
  Built with ❤️ for the Electronics Engineering Community
</p>
