print("Starting script...")
from backend.bots.ollama_bot import OllamaBot
import json

try:
    print("Loading persona...")
    with open("backend/bots/personas.json") as f:
        bots = json.load(f)
    p = bots[0]
    
    print(f"Initializing bot: {p['name']}")
    bot = OllamaBot(p["name"], p["model"], p["persona"])
    
    print("Generating post...")
    res = bot.generate_from_strategy("Friendly-Tech")
    print(f"Result: {res}")
except Exception as e:
    print(f"Error: {e}")
