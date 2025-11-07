import ollama
from backend.bots.base_bot import BaseBot


class OllamaBot(BaseBot):
    def reply(self, message: str):
        # Give the persona as hidden system context
        response = ollama.chat(
            model=self.model,
            messages=[
                {"role": "system", "content": f"{self.persona}"},
                {"role": "user", "content": message}
            ]
        )
        return response["message"]["content"].strip()
