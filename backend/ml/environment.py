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
        self.action_space = spaces.Discrete(8)
        self.strategies = [
            "Friendly-Tech", "Friendly-Lifestyle", 
            "Professional-Tech", "Professional-Lifestyle",
            "Controversial-Opinion", "Humorous-Meme",
            "Educational-Tutorial", "Inspirational-Story"
        ]

        # Define Observation Space:
        self.observation_space = spaces.Box(low=0, high=1000, shape=(4,), dtype=np.float32)

        self.current_step = 0
        self.max_steps = 10 
        self.last_observation = np.zeros(4)
        
        # Initialize Bot for Generation
        from backend.bots.ollama_bot import OllamaBot
        # Using a fixed persona for training the agent
        self.bot = OllamaBot("TrainingBot", "llama3.2", "You are a social media influencer.")

        # Load Personas for Simulation
        import json
        with open("backend/bots/personas.json", "r") as f:
            self.personas = json.load(f)

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

        # 2. Calculate Reward: Run Social Simulation
        from backend.ml.simulation_utils import run_social_simulation
        
        # Run simulation with 3 random reactors for speed during training
        sim_result = run_social_simulation(post_content, self.personas, num_reactors=3)
        
        likes = sim_result["likes"]
        comments = sim_result["comments"]
        reward = sim_result["reward"]
        
        # 3. Update State
        observation = np.array([likes, comments, reward/10.0, (likes+comments)/10.0], dtype=np.float32)
        self.last_observation = observation

        terminated = self.current_step >= self.max_steps
        truncated = False
        info = {
            "post": post_content, 
            "score": reward, 
            "details": sim_result["details"]
        }

        return observation, reward, terminated, truncated, info

    def render(self, mode='human'):
        print(f"Step: {self.current_step}, Obs: {self.last_observation}")
