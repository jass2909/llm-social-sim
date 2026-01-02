import lime
from lime.lime_text import LimeTextExplainer
import numpy as np
import json
from backend.bots.ollama_bot import OllamaBot

class LIMEExplainer:
    def __init__(self):
        self.explainer = LimeTextExplainer(class_names=['IGNORE', 'LIKE', 'COMMENT', 'BOTH'])
        self.bot = None

    def _predict_proba(self, texts):
        """
        Predicts interaction probabilities for a list of texts using the LLM.
        We ask the LLM to assign a 'likelihood score' (0-10) for each action class.
        Then we softmax these scores to get a valid probability distribution.
        This provides the necessary variance for LIME to calculate meaningful feature weights.
        """
        import re
        import ollama

        results = []
        
        # We process each text sample. 
        # Note: This loop makes LIME slow because we call the LLM for every perturbed sample.
        for text in texts:
            if not self.bot:
                results.append([0.25, 0.25, 0.25, 0.25])
                continue

            # Prompt for Soft Probabilities
            prompt = (
                f"You are {self.bot.persona}. \n"
                f"Analyze this partial post: '{text}'\n\n"
                "On a scale of 0 to 10, how likely are you to take each action?\n"
                "Actions: IGNORE, LIKE, COMMENT, BOTH (meaning Like & Comment).\n"
                "Output strictly in this format:\n"
                "IGNORE=X, LIKE=X, COMMENT=X, BOTH=X\n"
                "Example: IGNORE=9, LIKE=1, COMMENT=0, BOTH=0"
            )

            try:
                # We use the raw generate method from the bot's model
                response = ollama.generate(
                    model=self.bot.model,
                    prompt=prompt,
                    options={"temperature": 0.2, "num_predict": 50} 
                )
                raw = response["response"].strip()
                
                # Parse scores using Regex
                scores = {"IGNORE": 0.1, "LIKE": 0.1, "COMMENT": 0.1, "BOTH": 0.1} # Default small priors
                
                # Regex to find "KEY=VALUE" patterns
                matches = re.findall(r'(IGNORE|LIKE|COMMENT|BOTH)\s*=\s*(\d+)', raw.upper())
                for key, val in matches:
                    scores[key] = float(val) + 0.1 # Add epsilon to avoid zero division/log errors

                # Softmax Normalization
                vals = np.array([scores['IGNORE'], scores['LIKE'], scores['COMMENT'], scores['BOTH']])
                exp_vals = np.exp(vals)
                probs = exp_vals / np.sum(exp_vals)
                
                results.append(probs)

            except Exception as e:
                print(f"LIME Proba Error: {e}")
                results.append([0.25, 0.25, 0.25, 0.25])

        return np.array(results)

    def explain(self, bot_name, post_text, num_samples=20):
        """
        Generates a LIME explanation for a specific Bot on a specific Post.
        """
        # Load Bot Persona
        with open("backend/bots/personas.json") as f:
            bots = json.load(f)
        
        bot_data = next((b for b in bots if b["name"] == bot_name), None)
        if not bot_data:
            return {"error": "Bot not found"}

        self.bot = OllamaBot(bot_name, bot_data["model"], bot_data)

        # Run LIME
        # We reduce num_samples to keep it fast, as each sample is an LLM call!
        # Warning: This is slow. 20 samples = 20 LLM calls.
        exp = self.explainer.explain_instance(
            post_text, 
            self._predict_proba, 
            num_features=6, 
            num_samples=num_samples
        )
        
        return exp.as_list()
