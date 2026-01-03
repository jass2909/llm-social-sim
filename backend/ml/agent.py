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
    # [ML PIPELINE STEP 3] MODEL SELECTION
    # We select Deep Q-Network (DQN) because the action space is discrete (8 strategies).
    # We use "MlpPolicy" (Multi-Layer Perceptron) because the observation state is a simple 1D vector.
    model = DQN("MlpPolicy", env, verbose=1)
    
    # Train the agent
    if status_queue:
        status_queue.put(f"Starting training loop ({n_steps} steps)...\n")
        
    callback = ProgressCallback(queue=status_queue)
    # [ML PIPELINE STEP 4] MODEL TRAINING & OPTIMIZATION
    # The agent interacts with the Environment (SocialSimEnv), collects rewards (likes/comments),
    # and optimizes its Q-Network weights using Gradient Descent (Adam Optimizer) to minimize the Bellman Error.
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
        
        # [ML PIPELINE STEP 6] MODEL EVALUATION (INFERENCE)
        # We test the model by running it in "deterministic" mode (no random exploration).
        # It predicts the BEST action based on current observation to maximize expected reward.
        action, _states = model.predict(observation, deterministic=True)
        return int(action)
    return 0 # Default action
