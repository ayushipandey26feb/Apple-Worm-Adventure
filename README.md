🐛 Apple Worm Adventure

Welcome to Apple Worm Adventure! 🎮

A fun and challenging browser-based puzzle game where you guide a worm through exciting levels, collect apples, avoid obstacles, and reach the portal to win!

🌟 Features

🧩 50 Challenging Levels – Explore 50 exciting puzzle levels.

👤 User Authentication – Register and log in securely.

🍎 Apple Collection – Collect apples to complete puzzles.

⭐ Star Rewards – Earn up to 3 stars based on your performance.

💰 Coin System – Earn and spend game coins.

🎁 Daily Rewards – Claim daily bonus coins.

🏆 Achievements – Unlock achievements as you progress.

📊 Leaderboard – Compare scores with other players.

💾 Progress Saving – Save your game progress.

🔊 Sound Effects – Toggle game sounds on or off.

📱 Responsive Design – Enjoy the game on different screen sizes.

🛠️ Technology Stack

🎨 Frontend

React

TypeScript

Vite

HTML5

CSS3

JavaScript

⚙️ Backend

Python

FastAPI

MongoDB

Motor

JWT Authentication

📂 Project Structure

Apple-Worm-Adventure/
├── frontend/
│   ├── src/
│   ├── public/
│   └── package.json
├── backend/
│   ├── server.py
│   ├── requirements.txt
│   └── .env.example
├── .gitignore
└── README.md

🚀 Installation and Setup

1. Clone the Repository

git clone https://github.com/ayushipandey26feb/Apple-Worm-Adventure.git
cd Apple-Worm-Adventure

2. Start the Frontend

cd frontend
npm install
npm run dev

3. Start the Backend

Open a separate terminal:

cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
uvicorn server:app --host 0.0.0.0 --port 8000 --reload

Configure the required environment variables using backend/.env.example.

🔐 Environment Variables

The backend requires configuration such as:

GAME_NAME

MONGO_URL

DB_NAME

JWT_SECRET

ADMIN_EMAIL

ADMIN_PASSWORD

CORS_ORIGINS

Important: Never upload your actual .env file, passwords, or secret keys to GitHub.

👩‍💻 Developer

Ayushi Pandey

GitHub: Ayushi Pandey

❤️ Acknowledgement

Built with passion, creativity, and a love for puzzle games!

📜 License

Developed for learning and educational purposes.
