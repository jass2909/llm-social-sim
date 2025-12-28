import gymnasium as gym
from gymnasium import spaces
import numpy as np

class SocialSimEnv(gym.Env):
    """
    Custom Environment that follows gym interface.
    The goal is to choose the best posting strategy (Persona/Topic) to maximize likes/comments.
    """
    metadata = {'render.modes': ['human']}

    def __init__(self):
        super(SocialSimEnv, self).__init__()
        # Define Action Space:
        # 0: Friendly-Tech, 1: Friendly-Lifestyle, 2: Professional-Tech, 3: Professional-Lifestyle
        # 4: Controversial-Opinion, 5: Humorous-Meme, 6: Educational-Tutorial, 7: Inspirational-Story
        self.action_space = spaces.Discrete(8)
        self.strategies = [
            "Friendly-Tech", "Friendly-Lifestyle", 
            "Professional-Tech", "Professional-Lifestyle",
            "Controversial-Opinion", "Humorous-Meme",
            "Educational-Tutorial", "Inspirational-Story"
        ]

        # Define Observation Space:
        # Vector of size 4: [Last Like Count, Last Comment Count, Sentiment Score (0-1), Interaction Rate]
        self.observation_space = spaces.Box(low=0, high=1000, shape=(4,), dtype=np.float32)

        self.current_step = 0
        self.max_steps = 10  # Reduced steps for real-world training (slower)
        self.last_observation = np.zeros(4)
        
        # Initialize Bot for Generation
        from backend.bots.ollama_bot import OllamaBot
        # Using a fixed persona for training the agent
        self.bot = OllamaBot("TrainingBot", "llama3.2", "You are a social media influencer.")

    def reset(self, seed=None, options=None):
        super().reset(seed=seed)
        self.current_step = 0
        self.last_observation = np.zeros(4)
        return self.last_observation, {}

    def step(self, action):
        self.current_step += 1
        import ollama
        
        # 1. Execute Action: Generate Post
        strategy = self.strategies[action]
        try:
            post_content = self.bot.generate_from_strategy(strategy)
        except Exception as e:
            print(f"Gen Error: {e}")
            post_content = "Error generating content."

        # 2. Calculate Reward: The "Judge" (Critic)
        # We ask Llama 3.2 to rate the post's engagement potential
        judge_prompt = (
            f"Act as a critical Senior Social Media Editor. "
            f"Rate this post on a scale of 0 to 10 for engagement potential. "
            f"Be STRICT. Penalize generic or boring content. "
            f"Only give high scores (8+) to truly unique and engaging posts. "
            f"Post: \"{post_content}\"\n"
            f"Return ONLY the number (e.g. 7). Do not explain."
        )
        
        try:
            # Using Llama 3.1 (8B) for better critical reasoning/grading
            judge_res = ollama.generate(model="llama3.1", prompt=judge_prompt, options={"num_predict": 5})
            score_text = judge_res["response"].strip()
            # Extract number from response (handle potential extra text)
            import re
            match = re.search(r'\d+', score_text)
            reward = float(match.group()) if match else 0.0
        except Exception:
            reward = 0.0

        # 3. Update State (Simulating metrics based on the Judge's score)
        # Higher score = more simulated likes
        likes = reward * 10 + np.random.normal(0, 5)
        comments = reward * 2 + np.random.normal(0, 1)
        likes = max(0, likes)
        comments = max(0, comments)
        
        observation = np.array([likes, comments, reward/10.0, (likes+comments)/100], dtype=np.float32)
        self.last_observation = observation

        terminated = self.current_step >= self.max_steps
        truncated = False
        info = {"post": post_content, "score": reward}

        return observation, reward, terminated, truncated, info

    def render(self, mode='human'):
        print(f"Step: {self.current_step}, Obs: {self.last_observation}")
