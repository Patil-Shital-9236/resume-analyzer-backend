# Resume Analyzer Backend

Backend API for an AI-powered Resume Analyzer that evaluates resumes and provides structured feedback using modern AI models such as OpenAI GPT or Google Gemini.

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

| Component          | Technology                 |
| ------------------ | -------------------------- |
| Runtime            | Node.js                    |
| Framework          | Express.js                 |
| AI                 | OpenAI API / Google Gemini |
| File Upload        | Multer                     |
| Environment Config | Dotenv                     |
| Deployment         | Render                     |

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
│   └── analysis.js
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

AI_MODEL=openai

OPENAI_API_KEY=your_openai_api_key
GEMINI_API_KEY=your_gemini_api_key

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
GET /api/health
```

Response

```json
{
  "status": "ok"
}
```

---

## Upload Resume

```
POST /api/resume
```

Request

```
multipart/form-data
file: resume
```

Response

```json
{
  "success": true,
  "message": "Resume uploaded successfully"
}
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
OPENAI_API_KEY=your_key
GEMINI_API_KEY=your_key
CORS_ORIGIN=https://your-frontend-domain.com
```

Deploy and your API will be live.

---

# Security

* API keys stored in environment variables
* File upload validation
* CORS configuration
* Error handling middleware

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
OPENAI_API_KEY=your_key
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
https://github.com/Patil-Shital-9236
