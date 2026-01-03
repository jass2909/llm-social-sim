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
        # [ML PIPELINE STEP 1] INPUT PROCESSING
        # Capture user input and append to short-term conversation history
        # Preserve history
        self.conversation.append({"role": "user", "content": message})
        
        # Build full prompt with persona + memory
        
        # [ML PIPELINE STEP 2] RETRIEVAL (RAG)
        # Query Vector Store for relevant long-term memories to augment context
        relevant_docs, _ = self.vector_store.search_memory(message, n_results=3)
        context_str = "\n".join([f"- {doc}" for doc in relevant_docs]) if relevant_docs else "No relevant past memories."

        # [ML PIPELINE STEP 3] PROMPT ENGINEERING
        # Construct the final prompt by combining Persona, Memory, and History
        # Build prompt: Use new format if structured data is available
        if getattr(self, "persona_data", None):
            full_context = construct_reply_prompt(self.persona_data, message)
            if relevant_docs:
                full_context = full_context.replace("Context:\nAnother user wrote:", 
                    f"Past Memories:\n{context_str}\n\nContext:\nAnother user wrote:")
        else:
            # Fallback to old behavior
            full_context = (
                f"You are {self.persona}. "
                "Respond naturally and emotionally, like a real person in a conversation. "
                "Avoid repeating who you are or summarizing too formally. "
                "Use empathy, casual phrasing, and a bit of spontaneity. "
                "Keep your response concise and avoid long paragraphs unless necessary.\n\n"
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
                "num_predict": max_tokens,  
                
            },
        
        )

        reply_text = response["response"].strip()
        
        # [ML PIPELINE STEP 5] POST-PROCESSING
        # Clean up the generated text (remove quotes, prefixes, etc.)
        # Post-processing to clean up common LLM metadata
        reply_text = reply_text.strip('"').strip("'")
        if reply_text.lower().startswith("here's a"):
             # Try to split by colon if present
             if ":" in reply_text:
                reply_text = reply_text.split(":", 1)[1].strip().strip('"')
             else:
                pass
        
        # Remove "As [Persona]..." prefixes
        if reply_text.lower().startswith("as "):
             if ":" in reply_text:
                reply_text = reply_text.split(":", 1)[1].strip().strip('"')

        # Save as assistant turn
        self.conversation.append({"role": "assistant", "content": reply_text})

        
        # [ML PIPELINE STEP 6] MEMORY UPDATE
        # Save the interaction to both JSON (short-term) and Vector DB (long-term)
        # Save to Vector DB
        self.remember(f"User: {message}\nMe: {reply_text}", metadata={"type": "conversation"})

        return reply_text

    def generate_from_strategy(self, strategy: str):
        """
        Generates a new post based on a specific strategy (Topic/Tone).
        """
        # Strategy Definitions
        STRATEGY_DEFINITIONS = {
            "Friendly-Tech": "Write a friendly, optimistic post about technology, gadgets, or the future of tech.",
            "Friendly-Lifestyle": "Write a casual, positive post about daily life, hobbies, or community.",
            "Professional-Tech": "Write a professional, informative post about the tech industry, software development, or AI trends.",
            "Professional-Lifestyle": "Write a professional post about productivity, career growth, or work culture.",
            "Controversial-Opinion": "Share a strong, potentially controversial opinion on a topic you care about.",
            "Humorous-Meme": "Write a funny, relatable, or sarcastic comment/observation about modern life.",
            "Educational-Tutorial": "Share a useful tip, fact, or short 'how-to' related to your interests.",
            "Inspirational-Story": "Share an encouraging thought or lesson learned from your experience."
        }
        
        target_topic = STRATEGY_DEFINITIONS.get(strategy, f"Write a post about {strategy}")

        # Retrieve examples of past posts with similar strategy/content
        relevant_docs, _ = self.vector_store.search_memory(strategy, n_results=3)
        context_str = "\n".join([f"- {doc}" for doc in relevant_docs]) if relevant_docs else "No relevant past posts."

        prompt = (
            f"You are {self.persona}. \n\n"
            f"TASK: {target_topic}\n\n"
            "GUIDELINES:\n"
            "1. TOPIC: You MUST write about the specified topic (or apply the strategy).\n"
            "2. PERSONA: Apply your persona's voice, opinions, and style to this topic.\n"
            "3. LENGTH: Keep it engaging and under 280 characters.\n\n"
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
            return f"[Mock Content] Hey! I'm {self.name} and here is a post about {strategy}! (Ollama disconnected)"

    def decide_interaction(self, post_content: str):
        """
        Decides whether to LIKE, COMMENT, or IGNORE a post based on persona.
        Returns: ("LIKE", "reason") or ("COMMENT", "reason") etc.
        """
        prompt = (
            f"You are {self.persona}. \n"
            f"You see this post on your social feed: '{post_content}'\n\n"
            "Based on your persona, would you 'LIKE', 'COMMENT', 'BOTH' (Like & Comment), or 'IGNORE' this post?\n"
            "Reply in this format strictly: DECISION | SHORT_REASON\n"
            "Example: LIKE | It's funny and relates to tech.\n"
            "Example: IGNORE | Not interested in politics."
        )
        
        try:
            response = ollama.generate(
                model=self.model,
                prompt=prompt,
                options={
                    "temperature": 0.5,
                    "num_predict": 40, 
                },
            )
            raw = response["response"].strip()
            
            # Parse
            if "|" in raw:
                parts = raw.split("|", 1)
                decision = parts[0].strip().upper()
                reason = parts[1].strip()
            else:
                decision = raw.split()[0].upper()
                reason = raw

            # Basic validation
            final_decision = "IGNORE"
            if "BOTH" in decision: final_decision = "BOTH"
            elif "LIKE" in decision: final_decision = "LIKE"
            elif "COMMENT" in decision: final_decision = "COMMENT"
            
            return final_decision, reason
            
        except Exception as e:
            print(f"Ollama Error in decision: {e}")
            import random
            return random.choice(["LIKE", "IGNORE", "COMMENT"]), "Random fallback due to error"

    def decide_reply_to_comment(self, comment_text: str, post_context: str):
        """
        Decides whether to reply to a specific comment on their own post.
        Returns: (True/False, reason)
        """
        prompt = (
            f"You are {self.persona}. \n"
            f"You posted: '{post_context}'\n"
            f"Someone commented: '{comment_text}'\n\n"
            "Based on your persona, do you want to reply to this comment?\n"
            "Reply in this format strictly: YES/NO | SHORT_REASON"
        )
        
        try:
            response = ollama.generate(
                model=self.model,
                prompt=prompt,
                options={
                    "temperature": 0.5,
                    "num_predict": 40, 
                },
            )
            raw = response["response"].strip()
            
            if "|" in raw:
                parts = raw.split("|", 1)
                decision_part = parts[0].strip().upper()
                reason = parts[1].strip()
            else:
                decision_part = raw.split()[0].upper()
                reason = raw

            return "YES" in decision_part, reason
        except Exception as e:
            print(f"Ollama Error in reply decision: {e}")
            return False, f"Error: {e}"

    def generate_reply_to_comment(self, comment_text: str, post_context: str):
        context = f"Context: I posted '{post_context}' and someone commented '{comment_text}'. Write a reply to the comment."
        return self.reply(context)
