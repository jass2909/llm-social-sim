from stable_baselines3 import DQN
from backend.ml.environment import SocialSimEnv
import os

from stable_baselines3.common.callbacks import BaseCallback

class ProgressCallback(BaseCallback):
    def __init__(self, queue=None, verbose=0):
        super(ProgressCallback, self).__init__(verbose)
        self.queue = queue

    def _on_step(self) -> bool:
        if self.queue:
            # Info dict contains the latest interaction details from Environment
            info = self.locals['infos'][0]
            step = self.num_timesteps
            msg = f"Step {step}: Score={info.get('score', 0):.1f} | Post='{info.get('post', '')}'"
            self.queue.put(msg + "\n")
        return True

def train_agent(status_queue=None, n_steps=500):
    env = SocialSimEnv()
    
    # Initialize DQN Agent
    model = DQN("MlpPolicy", env, verbose=1)
    
    # Train the agent
    if status_queue:
        status_queue.put(f"Starting training loop ({n_steps} steps)...\n")
        
    callback = ProgressCallback(queue=status_queue)
    model.learn(total_timesteps=n_steps, callback=callback)
    
    if status_queue:
        status_queue.put("Training finished.\n")
    
    # Save the model
    os.makedirs("backend/ml/models", exist_ok=True)
    
    model.save("backend/ml/models/social_sim_dqn")
    return "Training Complete"

def get_agent_action(observation):
    # Load model (or creating new one if not exists for demo)
    path = "backend/ml/models/social_sim_dqn.zip"
    if os.path.exists(path):
        model = DQN.load(path)
        action, _states = model.predict(observation, deterministic=True)
        return int(action)
    return 0 # Default action
