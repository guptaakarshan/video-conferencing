🎥 KONVO — Video Conferencing App

A lightweight video-conferencing application built with WebRTC, Socket.IO, Express, and MongoDB.
Includes real-time video meetings, chat signaling, authentication, and meeting history.

📁 Project Structure
🖥️ Frontend — /frontend

Entry: src/App.js

Auth Context: src/contexts/AuthContext.jsx

Video Meeting UI: src/pages/VideoMeet.jsx

Pages:

src/pages/landing.jsx

src/pages/authentication.jsx

src/pages/home.jsx

src/pages/history.jsx

Environment Config: src/environment.js

Package: frontend/package.json

🛠️ Backend — /backend

Server Bootstrap: src/app.js

Socket Signaling Manager: src/controllers/socketManager.js

User Controller: src/controllers/user.controller.js

Models:

src/models/user.model.js

src/models/meeting.model.js

Routes: src/routes/users.routes.js

Package: backend/package.json

✨ Features

🔗 Join a meeting using a unique URL

🎥 Real-time audio/video via WebRTC

💬 Real-time chat & signaling using Socket.IO

🔐 User authentication (login/register)

📝 Meeting history stored in MongoDB

🌐 Environment switch for local & production API URLs

🚀 Requirements

Node.js 18+

npm

MongoDB (Atlas or local)

⚙️ Setup & Run Locally
1️⃣ Install Dependencies

Backend

cd backend
npm install


Frontend

cd frontend
npm install

2️⃣ Configure Backend Environment

Create a .env inside /backend:

MONGO_URI=your_mongodb_connection_string
PORT=8000
JWT_SECRET=your_secret_key

3️⃣ Configure Frontend API Target

Edit frontend/src/environment.js:

export const IS_PROD = false;

export const API_URL = IS_PROD
  ? "https://your-backend.onrender.com"
  : "http://localhost:8000";

4️⃣ Run Both Servers

Start Backend

cd backend
npm run dev


Start Frontend

cd frontend
npm start


Frontend will run on 👉 http://localhost:3000

📡 API Endpoints

Base route:
/api/v1/users

Method	Endpoint	Description
POST	/register	Register new user
POST	/login	Login user
POST	/add_to_activity	Add a meeting to history
GET	/get_all_activity	Get meeting history

Authentication tokens are created on login and stored in each user document.

🛰️ WebRTC / Signaling

Socket signaling logic: backend/src/controllers/socketManager.js

Frontend connects via URL from environment.js

WebRTC offer/answer flow handled in src/pages/VideoMeet.jsx

Screen sharing requires HTTPS in production

🔒 Notes & Best Practices

Do not commit your MongoDB credentials — use .env

Set IS_PROD = true for production builds

Use:

Render/Railway → Backend (WebSocket supported)

Vercel → Frontend

Add a TURN server for improved NAT traversal

🧪 Run Tests (Frontend)
cd frontend
npm test
