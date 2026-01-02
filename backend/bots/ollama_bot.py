import os
import json
import ollama
from backend.bots.base_bot import BaseBot
from backend.memory.vector_store import VectorStore
from backend.bots.prompt_utils import construct_system_prompt, construct_reply_prompt


class OllamaBot(BaseBot):
    def __init__(self, name, model, persona_data):
        # Handle both string (old) and dict (new) persona inputs for safety
        if isinstance(persona_data, dict):
            self.persona_data = persona_data
            persona_prompt = construct_system_prompt(persona_data)
        else:
            self.persona_data = {}
            persona_prompt = persona_data

        super().__init__(name, model, persona_prompt)
        self.name = name
        self.conversation = []
        
        # Initialize Vector Store (Long-term memory)
        # Sanitize name for ChromaDB (only allows alphanumerics, underscores, dashes)
        import re
        safe_name = re.sub(r'[^a-zA-Z0-9_-]', '', self.name.replace(' ', '_').lower())
        self.vector_store = VectorStore(collection_name=safe_name)

    def remember(self, text: str, metadata: dict = None):
        """
        Store a text in long-term memory.
        """
        self.vector_store.add_memory(text, metadata)

    def reply(self, message: str):
        # Preserve history
        self.conversation.append({"role": "user", "content": message})
        
        # Build full prompt with persona + memory
        
        # Retrieve relevant past context
        relevant_docs, _ = self.vector_store.search_memory(message, n_results=3)
        context_str = "\n".join([f"- {doc}" for doc in relevant_docs]) if relevant_docs else "No relevant past memories."

        # Build prompt: Use new format if structured data is available
        if getattr(self, "persona_data", None):
            full_context = construct_reply_prompt(self.persona_data, message)
            # Append memory content if relevant?
            # User format doesn't explicitly ask for memory, but it's good practice.
            # However, user format ends with "Write a reply...", so appending memory after might break flow?
            # Let's append memory as "Additional Context" before the final instruction.
            if relevant_docs:
                full_context = full_context.replace("Context:\nAnother user wrote:", 
                    f"Past Memories:\n{context_str}\n\nContext:\nAnother user wrote:")
        else:
            # Fallback to old behavior
            full_context = (
                f"You are {self.persona}. "
                "Respond naturally and emotionally, like a real person in a conversation. "
                "Avoid repeating who you are or summarizing too formally. "
                "Use empathy, casual phrasing, and a bit of spontaneity.\n\n"
                f"RELEVANT PAST MEMORIES/CONTEXT:\n{context_str}\n\n"
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
        
        # Post-processing to clean up common LLM metadata
        reply_text = reply_text.strip('"').strip("'")
        if reply_text.lower().startswith("here's a"):
             # Try to split by colon if present
             if ":" in reply_text:
                reply_text = reply_text.split(":", 1)[1].strip().strip('"')
             else:
                # Blind guess: remove first sentence? Or just leave it if we can't be sure.
                pass
        
        # Remove "As [Persona]..." prefixes
        if reply_text.lower().startswith("as "):
             if ":" in reply_text:
                reply_text = reply_text.split(":", 1)[1].strip().strip('"')

        # Save as assistant turn
        self.conversation.append({"role": "assistant", "content": reply_text})

        
        # Save to Vector DB
        self.remember(f"User: {message}\nMe: {reply_text}", metadata={"type": "conversation"})

        return reply_text

    def generate_from_strategy(self, strategy: str):
        """
        Generates a new post based on a specific strategy (Topic/Tone).
        """
        # Retrieve examples of past posts with similar strategy/content
        relevant_docs, _ = self.vector_store.search_memory(strategy, n_results=3)
        context_str = "\n".join([f"- {doc}" for doc in relevant_docs]) if relevant_docs else "No relevant past posts."

        prompt = (
            f"You are {self.persona}. "
            f"Write a social media post that follows this strategy: {strategy}. "
            "Keep it engaging, authentic to your persona, and under 280 characters.\n\n"
            f"YOUR PAST POSTS ON SIMILAR TOPICS (for style reference):\n{context_str}\n"
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
            content = response["response"].strip()
            # Save to Vector DB
            self.remember(content, metadata={"type": "post", "strategy": strategy})
            return content
        except Exception as e:
            # Fallback for when Ollama is not running (Demonstration purposes)
            print(f"Ollama Error: {e}")
            return f"[Mock Content] Hey! I'm {self.name} and I think '{strategy}' is a cool strategy! (Ollama disconnected)"

    def decide_interaction(self, post_content: str):
        """
        Decides whether to LIKE, COMMENT, or IGNORE a post based on persona.
        Returns: "LIKE", "COMMENT", or "IGNORE"
        """
        prompt = (
            f"You are {self.persona}. \n"
            f"You see this post on your social feed: '{post_content}'\n\n"
            "Based on your persona, would you 'LIKE', 'COMMENT', 'BOTH' (Like & Comment), or 'IGNORE' this post?\n"
            "Reply with ONLY one word: LIKE, COMMENT, BOTH, or IGNORE."
        )
        
        try:
            response = ollama.generate(
                model=self.model,
                prompt=prompt,
                options={
                    "temperature": 0.5,
                    "num_predict": 10, 
                },
            )
            decision = response["response"].strip().upper()
            # Basic validation/cleaning
            if "BOTH" in decision: return "BOTH"
            if "LIKE" in decision: return "LIKE"
            if "COMMENT" in decision: return "COMMENT"
            return "IGNORE"
        except Exception as e:
            print(f"Ollama Error in decision: {e}")
            # Fallback
            import random
            return random.choice(["LIKE", "IGNORE", "COMMENT"])
