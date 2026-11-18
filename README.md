ðŸ› Apple Worm Adventure



Apple Worm Adventure is a browser-based puzzle game built with React and Python. Guide the worm through challenging levels, collect apples, solve puzzles, and unlock rewards!



ðŸŽ® Features



50 Challenging Levels â€“ Explore and complete 50 puzzle levels.



User Authentication â€“ Register and log in to your account.



Game Progress â€“ Save your progress and track your scores.



Achievements â€“ Unlock achievements through gameplay.



Coins \& Rewards â€“ Earn and spend coins.



Daily Rewards â€“ Claim daily bonus rewards.



Leaderboard â€“ Compare scores with other players.



Sound Effects â€“ Enjoy an interactive gaming experience.



ðŸ› ï¸ Tech Stack



Frontend



React



TypeScript



Vite



HTML, CSS, JavaScript



Backend



Python



FastAPI



MongoDB



Motor



JWT Authentication



ðŸ“ Project Structure



Apple-Worm-Adventure/

â”œâ”€â”€ frontend/

â”‚   â”œâ”€â”€ src/

â”‚   â”œâ”€â”€ public/

â”‚   â””â”€â”€ package.json

â”œâ”€â”€ backend/

â”‚   â”œâ”€â”€ server.py

â”‚   â”œâ”€â”€ requirements.txt

â”‚   â”œâ”€â”€ routers/

â”‚   â””â”€â”€ .env.example

â”œâ”€â”€ .gitignore

â””â”€â”€ README.md



ðŸš€ Run Locally



1\. Clone the repository



git clone https://github.com/ayushipandey26feb/Apple-Worm-Adventure.git

cd Apple-Worm-Adventure



2\. Start the backend



cd backend

python -m venv venv



Activate the virtual environment on Windows:



.\\venv\\Scripts\\Activate



Install dependencies:



pip install -r requirements.txt



Create your local environment file:



Copy-Item .env.example .env



Update the required environment variables in .env, including your MongoDB connection string and JWT secret.



Start the backend:



uvicorn server:app --host 0.0.0.0 --port 8000 --reload



3\. Start the frontend



Open another terminal:



cd frontend

yarn install

yarn dev



Open the local URL displayed by Vite in your browser.



ðŸ” Environment Variables



Configure the required environment variables in backend/.env. Never commit your real .env file or credentials to GitHub.



ðŸ‘©â€ðŸ’» Developer



Ayushi Pandey



GitHub: ayushipandey26feb



Built with â¤ï¸ as a puzzle adventure game project.
