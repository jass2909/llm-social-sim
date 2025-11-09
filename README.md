
⸻

🤖 LLM Social Simulation

A full-stack project for simulating social interactions between AI agents (LLMs).
Bots run locally using Ollama￼, and the system includes:
	•	🧠 Backend (FastAPI) — manages bot logic, simulation, and interactions
	•	💬 Client Frontend (React) — displays social-media-style conversations
	•	🧑‍💻 Admin Dashboard (React) — lets you run simulations, ask specific bots questions, and view logs

⸻

🚀 Features
	•	Multiple AI “bots” (each with a unique persona and model)
	•	Local inference (no API keys required)
	•	Round-based conversation simulation between bots
	•	Ask individual bots direct questions
	•	View and analyze conversation logs
	•	Extensible architecture (easy to add models or personas)

⸻

🧩 Tech Stack

Component	Technology
Backend	Python + FastAPI
LLM Runtime	Ollama (local models)
Frontend (Client & Admin)	React + Vite + Tailwind
Data Storage	JSON logs
Communication	REST API


⸻

📦 Installation & Setup

1️⃣ Clone the Repository

git clone https://github.com/yourusername/llm-social-sim.git
cd llm-social-sim

2️⃣ Install Ollama

Download and install from https://ollama.ai/download￼

Verify installation:

ollama --version

3️⃣ Pull Required Models

The default bots use these models (you can adjust in backend/bots/personas.json):

ollama pull mistral:7b

ollama pull llama3

ollama pull gemma:2b

Check installation:

ollama list

You should see:

mistral:7b   llama3   gemma:2b

🟢 Ensure the Ollama server is running in the background:

ollama serve


⸻

🧠 Backend Setup

Create a virtual environment:

python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate

Install dependencies:

pip install -r requirements.txt

Run the FastAPI server:

uvicorn backend.main:app --reload

Now open http://localhost:8000￼ to verify.

⸻

🌐 Frontend Setup

You have two frontends inside frontend/:

🧑‍🤝‍🧑 Client (Social Feed)

Displays the conversation feed between bots.

cd frontend/client
npm install
npm run dev

→ Runs on http://localhost:5173￼

⸻

🧑‍💻 Admin Dashboard

Control panel to:
	•	Start new simulations
	•	Ask specific bots questions
	•	View latest logs and bot info

cd ../admin
npm install
npm run dev

→ Runs on http://localhost:5174￼

⸻

🧰 API Overview

Method	Endpoint	Description
GET	/	Health check
GET	/bots	List configured bots
POST	/simulate?rounds=5	Start a multi-bot conversation (use optional JSON body { "message": "Your topic" })
POST	/ask?bot=Clara	Ask a specific bot a direct question (send { "question": "Hi!" })
GET	/logs	Retrieve last saved conversation

Example (cURL)

curl -X POST "http://localhost:8000/simulate?rounds=3" \
     -H "Content-Type: application/json" \
     -d '{"message": "What do you think about AI in politics?"}'


⸻

🧩 Configuration

All bot personas are defined in:

backend/bots/personas.json

Example:

[
  {
    "name": "Clara",
    "model": "mistral:7b",
    "persona": "You are a progressive sociology student who values equality and climate action."
  },
  {
    "name": "Tom",
    "model": "llama3",
    "persona": "You are a pragmatic entrepreneur who values economic growth and innovation."
  }
]

You can add as many bots as you like — just make sure the model name matches one listed in ollama list.

⸻

📊 Logs

After each simulation, the conversation is saved in:

backend/data/logs/conversation.json

You can open this file or load it into a notebook (analysis/) for visualization or sentiment analysis.

⸻

🔧 Troubleshooting

Problem	Solution
❌ model not found	Run ollama pull <model> or check ollama list
❌ Connection refused on port 11434	Run ollama serve
⚠️ React key warnings	Ensure <option key={bot.name}> in dropdowns
🧩 404 on /ask	Bot name not found in personas.json
🤖 Replies mention persona	Use system role in OllamaBot (already set in your code)


⸻

🧪 Example Flow
	1.	Start backend (uvicorn backend.main:app --reload)
	2.	Start both frontends (npm run dev in each folder)
	3.	Open Admin Dashboard → click “Run Simulation”
	4.	Open Client Feed → see the conversation appear
	5.	In Admin, use “Ask a Bot” to query an individual agent
	6.	View logs or analyze results in /backend/data/logs/conversation.json

⸻

🧭 Next Steps
	•	Add new personas and models (Phi-3, Mixtral, Yi-Large, etc.)
	•	Introduce topic selection per run
	•	Visualize conversations (sentiment, reply network)
	•	Optionally integrate a small database (SQLite, Firestore)

⸻

📄 License

MIT License — feel free to modify, extend, and use for research or teaching.

⸻
