import os
import json
import ollama
from backend.bots.base_bot import BaseBot


class OllamaBot(BaseBot):
    def __init__(self, name, model, persona):
        super().__init__(name, model, persona)
        self.name = name
        self.memory_path = os.path.join("backend", "data", "logs", f"memory_{self.name.replace(' ', '_')}.json")
        self._load_memory()

    def _load_memory(self):
        if os.path.exists(self.memory_path):
            with open(self.memory_path, "r") as f:
                self.conversation = json.load(f)
        else:
            self.conversation = []

    def _save_memory(self):
        with open(self.memory_path, "w") as f:
            json.dump(self.conversation, f)

    def reply(self, message: str):
        # Preserve chat history across sessions
        self.conversation.append({"role": "user", "content": message})

        response = ollama.chat(
            model=self.model,
            messages=[
                {
                    "role": "system",
                    "content": (
                        f"You are {self.persona}. "
                        "Respond naturally and emotionally, like a real person in a conversation. "
                        "Avoid repeating who you are or summarizing too formally. "
                        "Use empathy, casual phrasing, and a bit of spontaneity when appropriate."
                    ),
                },
                *self.conversation,
            ],
            options={"temperature": 0.8},
        )

        reply_text = response["message"]["content"].strip()
        self.conversation.append({"role": "assistant", "content": reply_text})
        self._save_memory()

        return reply_text
