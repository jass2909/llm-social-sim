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
        # Preserve history
        self.conversation.append({"role": "user", "content": message})
        
        # Build full prompt with persona + memory
        full_context = (
            f"You are {self.persona}. "
            "Respond naturally and emotionally, like a real person in a conversation. "
            "Avoid repeating who you are or summarizing too formally. "
            "Use empathy, casual phrasing, and a bit of spontaneity.\n\n"
        )

        for turn in self.conversation:
            role = turn["role"]
            content = turn["content"]
            full_context += f"{role}: {content}\n"

        temperature=0.7
        top_p=0.95
        top_k=40
        repeat_penalty=1.1
        max_tokens=150

        response = ollama.generate(
            model=self.model,
            prompt=full_context,
            options={
                "temperature": temperature,
                "top_p": top_p,
                "top_k": top_k,
                "repeat_penalty": repeat_penalty,
                "num_predict": max_tokens,  # correct parameter for generate()
                
            },
        
        )

        reply_text = response["response"].strip()

        # Save as assistant turn
        self.conversation.append({"role": "assistant", "content": reply_text})
        self._save_memory()

        return reply_text

    def generate_from_strategy(self, strategy: str):
        """
        Generates a new post based on a specific strategy (Topic/Tone).
        """
        prompt = (
            f"You are {self.persona}. "
            f"Write a social media post that follows this strategy: {strategy}. "
            "Keep it engaging, authentic to your persona, and under 280 characters."
        )
        
        try:
            response = ollama.generate(
                model=self.model,
                prompt=prompt,
                options={
                    "temperature": 0.8,
                    "num_predict": 100, 
                },
            )
            return response["response"].strip()
        except Exception as e:
            # Fallback for when Ollama is not running (Demonstration purposes)
            print(f"Ollama Error: {e}")
            return f"[Mock Content] Hey! I'm {self.name} and I think '{strategy}' is a cool strategy! (Ollama disconnected)"
