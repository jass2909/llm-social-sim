from fastapi import FastAPI, HTTPException, Body, Query
from fastapi.middleware.cors import CORSMiddleware
from backend.simulation import run_local_simulation
from backend.bots.ollama_bot import OllamaBot
import json, os

app = FastAPI(title="LLM Social Sim API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {"status": "ok", "service": "LLM Social Sim API"}

@app.get("/bots")
def get_bots():
    with open("backend/bots/personas.json") as f:
        return json.load(f)

@app.post("/simulate")
def simulate(rounds: int = 5, body: dict = Body(default={})):
    message = body.get("message")
    return {"conversation": run_local_simulation(rounds, message)}

@app.get("/logs")
def get_logs():
    path = "backend/data/logs/conversation.json"
    if os.path.exists(path):
        with open(path) as f:
            return json.load(f)
    return []

@app.post("/ask")
def ask_bot(bot: str = Query(...), question: dict = Body(...)):
    with open("backend/bots/personas.json") as f:
        bots = json.load(f)

    # Find bot by name
    matching = next((b for b in bots if b["name"].lower() == bot.lower()), None)
    if not matching:
        raise HTTPException(status_code=404, detail={"error": f"Bot '{bot}' not found"})

    ollama_bot = OllamaBot(matching["name"], matching["model"], matching["persona"])
    answer = ollama_bot.reply(question.get("question", ""))
    return {"bot": bot, "reply": answer}
