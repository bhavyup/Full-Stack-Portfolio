# 🌟 Bhavy's Portfolio

A modern, dynamic full-stack portfolio website featuring a cyberpunk-themed UI with an admin dashboard for real-time content management. Built with React, FastAPI, and MongoDB.

![Portfolio Preview](https://img.shields.io/badge/Status-Live-success)
![License](https://img.shields.io/badge/License-MIT-blue)

## 🎯 Features

### 🎨 Frontend
- **Modern UI/UX**: Cyberpunk-themed design with smooth animations and transitions
- **3D Elements**: Interactive 3D components using Three.js and React Three Fiber
- **Responsive Design**: Fully responsive across all devices
- **Dynamic Sections**:
  - Hero section with animated terminal effects
  - About section with CRT terminal aesthetics
  - Projects showcase with detailed cards
  - Skills visualization
  - Education timeline
  - Learning journey
  - Experiments section
  - Contact form with real-time validation
- **Chatbot Integration**: Interactive chatbot for visitor engagement
- **Performance Optimized**: Lazy loading, code splitting, and optimized assets

### ⚙️ Backend
- **FastAPI Framework**: High-performance async Python backend
- **MongoDB Database**: Flexible NoSQL database for content management
- **JWT Authentication**: Secure admin authentication
- **RESTful API**: Well-structured API endpoints
- **File Upload**: Image and document upload capabilities
- **Real-time Notifications**: WebSocket support for live updates
- **CORS Enabled**: Configured for cross-origin requests

### 🔐 Admin Dashboard
- **Secure Login**: JWT-based authentication
- **Content Management**:
  - Profile information editor
  - Projects manager (CRUD operations)
  - Skills manager
  - Education manager
  - Experience manager
  - Learning journey manager
  - Experiments manager
  - Messages viewer
  - Footer content editor
- **Real-time Updates**: Changes reflect immediately on the portfolio
- **Global Search**: Search across all content
- **Notifications Panel**: Track visitor messages and system events
- **Media Upload**: Drag-and-drop file uploads

## 🛠️ Tech Stack

### Frontend
- **Framework**: React 18
- **Routing**: React Router v6
- **Styling**: 
  - Tailwind CSS
  - GSAP for animations
  - Custom CSS
- **UI Components**:
  - Radix UI primitives
  - Custom components with shadcn/ui
  - FontAwesome icons
- **3D Graphics**:
  - Three.js
  - React Three Fiber
  - React Three Drei
- **Forms**: React Hook Form with Zod validation
- **State Management**: React Context API
- **HTTP Client**: Axios
- **Charts**: ApexCharts

### Backend
- **Framework**: FastAPI 0.110.1
- **Database**: MongoDB with Motor (async driver)
- **Authentication**: JWT with PyJWT
- **Password Hashing**: bcrypt
- **Validation**: Pydantic v2
- **Environment**: python-dotenv
- **Testing**: pytest
- **Code Quality**: 
  - Black (formatter)
  - Flake8 (linter)
  - MyPy (type checker)

## 📁 Project Structure

```
Shreeya.portfolio/
├── backend/
│   ├── auth.py              # JWT authentication logic
│   ├── database.py          # MongoDB connection & operations
│   ├── models.py            # Pydantic models
│   ├── server.py            # FastAPI application
│   ├── seed_data.py         # Database seeding script
│   ├── requirements.txt     # Python dependencies
│   ├── static/              # Uploaded files
│   └── __pycache__/
├── frontend/
│   ├── public/
│   │   ├── index.html
│   │   └── workers/         # Web workers (Stockfish)
│   ├── src/
│   │   ├── components/
│   │   │   ├── Admin/       # Admin dashboard components
│   │   │   ├── ui/          # Reusable UI components
│   │   │   └── *.jsx        # Portfolio section components
│   │   ├── context/         # React context providers
│   │   ├── hooks/           # Custom React hooks
│   │   ├── pages/           # Page components
│   │   ├── utils/           # Utility functions & API client
│   │   ├── App.js           # Main app component
│   │   └── index.js         # Entry point
│   ├── build/               # Production build
│   ├── package.json
│   ├── tailwind.config.js
│   └── craco.config.js
├── tests/                   # Backend tests
├── contracts.md             # API contracts documentation
├── package.json
└── README.md
```

## 🚀 Getting Started

### Prerequisites
- Node.js (v16 or higher)
- Python 3.10+
- MongoDB (local or Atlas)
- npm or yarn

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/Shreeya.portfolio.git
cd Shreeya.portfolio
```

2. **Backend Setup**
```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create .env file
# Add your MongoDB connection string and JWT secret
```

**Backend .env file:**
```env
MONGODB_URL=mongodb://localhost:27017
DATABASE_NAME=portfolio_db
JWT_SECRET_KEY=your-secret-key-here
ACCESS_TOKEN_EXPIRE_MINUTES=60
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your-hashed-password
```

3. **Frontend Setup**
```bash
cd frontend

# Install dependencies
npm install

# Create .env file
```

**Frontend .env file:**
```env
REACT_APP_API_URL=http://localhost:8000
```

4. **Initialize Database** (Optional)
```bash
cd backend
python seed_data.py
```

### Running the Application

1. **Start Backend Server**
```bash
cd backend
uvicorn server:app --reload --port 8000
```
Backend will run on `http://localhost:8000`

2. **Start Frontend Development Server**
```bash
cd frontend
npm start
```
Frontend will run on `http://localhost:3000`

### Building for Production

**Frontend:**
```bash
cd frontend
npm run build
```

**Backend:**
```bash
cd backend
# Use uvicorn with production settings
uvicorn server:app --host 0.0.0.0 --port 8000
```

## 📡 API Documentation

Once the backend is running, visit:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

### Key API Endpoints

#### Public Endpoints
- `GET /api/profile` - Get portfolio profile
- `GET /api/projects` - Get all projects
- `GET /api/skills` - Get all skills
- `GET /api/education` - Get education history
- `GET /api/experience` - Get work experience
- `POST /api/messages` - Submit contact message

#### Admin Endpoints (Requires Authentication)
- `POST /api/admin/login` - Admin login
- `PUT /api/admin/profile` - Update profile
- `POST /api/admin/projects` - Create project
- `PUT /api/admin/projects/{id}` - Update project
- `DELETE /api/admin/projects/{id}` - Delete project
- Similar CRUD endpoints for all content sections

## 🧪 Testing

**Backend Tests:**
```bash
cd backend
pytest backend_test.py -v
```

**Frontend:**
```bash
cd frontend
npm test
```

## 🔒 Security Features

- JWT-based authentication
- Password hashing with bcrypt
- CORS configuration
- Input validation with Pydantic
- SQL injection prevention (NoSQL)
- XSS protection
- Environment variable protection

## 🎨 Customization

### Theming
- Edit [tailwind.config.js](frontend/tailwind.config.js) for color schemes
- Modify CSS variables in [App.css](frontend/src/App.css)

### Content
- Use the admin dashboard for content updates
- Or directly modify [mock.js](frontend/src/mock.js) for development

## 📝 Available Scripts

### Frontend
- `npm start` - Start development server
- `npm run build` - Build for production
- `npm test` - Run tests
- `npm run eject` - Eject from Create React App

### Backend
- `uvicorn server:app --reload` - Start dev server
- `pytest` - Run tests
- `black .` - Format code
- `flake8` - Lint code
- `mypy .` - Type check

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 👤 Author

**Bhavy**
- GitHub: [@yourusername](https://github.com/yourusername)
- LinkedIn: [Your Profile](https://linkedin.com/in/yourprofile)

## 🙏 Acknowledgments

- UI inspiration from cyberpunk aesthetics
- shadcn/ui for beautiful component primitives
- Radix UI for accessible components
- Three.js community for 3D graphics support

## 📞 Support

For support, email your-email@example.com or open an issue in the repository.

---

**Made with ❤️ by Bhavy**
