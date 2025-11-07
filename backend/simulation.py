import json, time
from backend.bots.ollama_bot import OllamaBot

def run_local_simulation(rounds=5, message=None):
    with open("backend/bots/personas.json") as f:
        personas = json.load(f)

    bots = [OllamaBot(p["name"], p["model"], p["persona"]) for p in personas]

    if message is None:
        message = "How are you?"

    conversation = []

    for i in range(rounds):
        current_bot = bots[i % len(bots)]
        reply = current_bot.reply(message)
        conversation.append({"round": i+1, "bot": current_bot.name, "reply": reply})
        message = reply
        time.sleep(0.2)

    with open("backend/data/logs/conversation.json", "w") as f:
        json.dump(conversation, f, indent=2)

    return conversation
