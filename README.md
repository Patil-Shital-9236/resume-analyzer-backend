
---

# Resume Analyzer Backend

Backend API for an AI-powered Resume Analyzer that evaluates resumes and provides structured feedback using modern AI models such as Google Gemini.

Built using **Node.js and Express**, this service accepts resumes, processes them, and returns AI-generated insights including scoring, suggestions, and analysis.

---

# Features

* AI-powered resume evaluation
* Resume scoring system
* Resume improvement suggestions
* Job description matching support
* Secure file upload handling
* REST API architecture
* CORS enabled for frontend integration
* Environment-based configuration
* Production-ready deployment

---

# Tech Stack

| Component          | Technology        |
| ------------------ | ----------------- |
| Runtime            | Node.js           |
| Framework          | Express.js        |
| AI                 | Google Gemini API |
| File Upload        | Multer            |
| Environment Config | Dotenv            |
| Deployment         | Render            |

---

# Project Structure

```
resume-analyzer-backend
│
├── server.js
├── package.json
├── package-lock.json
├── .env.example
├── .gitignore
│
├── routes
│   ├── authRoutes.js
│   ├── forgotPasswordRoutes.js
│   ├── analysisRoutes.js
│   ├── jdRoutes.js
│   ├── resumeRoutes.js
│   ├── fullAnalysisRoutes.js
│   └── userRoutes.js
│
├── services
│   └── aiService.js
│
├── utils
│   └── fileParser.js
│
└── uploads
```

*(Folder names may slightly vary depending on implementation.)*

---

# Installation

### 1 Clone the repository

```bash
git clone https://github.com/Patil-Shital-9236/resume-analyzer-backend.git
cd resume-analyzer-backend
```

### 2 Install dependencies

```bash
npm install
```

---

# Environment Setup

Create a `.env` file in the project root.

Example configuration:

```
PORT=5000
NODE_ENV=development

GEMINI_API_KEY=your_gemini_api_key
JWT_SECRET=your_jwt_secret

CORS_ORIGIN=http://localhost:3000
```

Never commit `.env` to GitHub.

---

# Running the Application

### Start server

```bash
npm start
```

Server runs at

```
http://localhost:5000
```

---

# API Endpoints

## Health Check

```
GET /
```

Response

```
AI Resume Analyzer API Running
```

---

# Authentication APIs

Base Route

```
/api/auth
```

---

## Register User

```
POST /api/auth/register
```

Request

```json
{
  "name": "Shital Patil",
  "email": "shital@email.com",
  "password": "123456"
}
```

Response

```json
{
  "success": true,
  "message": "User registered successfully"
}
```

---

## Login User

```
POST /api/auth/login
```

Request

```json
{
  "email": "shital@email.com",
  "password": "123456"
}
```

Response

```json
{
  "success": true,
  "token": "jwt_token_here",
  "user": {
    "id": "user_id",
    "name": "Shital Patil",
    "email": "shital@email.com"
  }
}
```

---

## Forgot Password

```
POST /api/auth/forgot-password
```

Request

```json
{
  "email": "user@email.com"
}
```

Response

```json
{
  "message": "Password reset instructions sent"
}
```

---

# Resume APIs

Base Route

```
/api/resume
```

---

## Upload Resume

```
POST /api/resume/upload
```

Request

```
multipart/form-data
resume: file
```

Response

```json
{
  "success": true,
  "message": "Resume uploaded successfully"
}
```

---

# Resume Analysis APIs

Base Route

```
/api/analyze
```

---

## Analyze Resume

```
POST /api/analyze
```

Request

```json
{
  "resumeText": "Extracted resume content",
  "jobDescription": "job description"
}
```

Response

```json
{
  "score": 78,
  "feedback": "Improve measurable achievements and add technical skills."
}
```

---

# Job Description APIs

Base Route

```
/api/jd
```

---

## Analyze Job Description

```
POST /api/jd/analyze
```

Request

```json
{
  "jobDescription": "Looking for React developer with Node.js experience"
}
```

Response

```json
{
  "keywords": [
    "React",
    "Node.js",
    "JavaScript"
  ]
}
```

---

# Full Resume Analysis

This endpoint performs a **complete AI analysis of the resume against the job description.**

```
POST /api/full-analysis
```

Request

```json
{
  "resumeText": "Full resume text",
  "jobDescription": "job description"
}
```

Response

```json
{
  "overallScore": 85,
  "skillsMatch": 80,
  "missingSkills": ["Docker","AWS"],
  "suggestions": [
    "Add measurable achievements",
    "Improve skills section"
  ]
}
```

---

# User APIs

Base Route

```
/api/user
```

---

## Get User Profile

```
GET /api/user/profile
```

Headers

```
Authorization: Bearer TOKEN
```

Response

```json
{
  "id": "user_id",
  "name": "Shital Patil",
  "email": "shital@email.com"
}
```

---

# Deployment (Render)

### Create Web Service

1. Go to Render Dashboard
2. Click **New → Web Service**
3. Connect GitHub repository

### Configure

| Setting       | Value       |
| ------------- | ----------- |
| Environment   | Node        |
| Build Command | npm install |
| Start Command | npm start   |

### Add Environment Variables

```
NODE_ENV=production
GEMINI_API_KEY=your_key
JWT_SECRET=your_secret
CORS_ORIGIN=https://resume-analyzer-frontend-eight-nu.vercel.app
```

Deploy and your API will be live.

---

# Security

* API keys stored in environment variables
* File upload validation
* CORS configuration
* Error handling middleware
* JWT authentication

---

# Troubleshooting

### Module not found

Run

```
npm install
```

---

### API key errors

Verify the key in `.env`:

```
GEMINI_API_KEY=your_key
```

Restart server after updating.

---

# Future Improvements

* ATS compatibility scoring
* Resume keyword extraction
* Resume vs job description matching
* Resume improvement suggestions
* Analytics dashboard

---

# License

MIT License

---

# Author

Shital Patil

GitHub
[https://github.com/Patil-Shital-9236](https://github.com/Patil-Shital-9236)

---

 Now this README:

* matches your **actual backend routes**
* matches your **Render deployment**
* works with your **Vercel frontend**
* follows **industry API documentation format**

