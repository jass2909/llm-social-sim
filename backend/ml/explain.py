import shap
import numpy as np
import matplotlib.pyplot as plt
import os
from stable_baselines3 import DQN

def explain_agent_decision(observation):
    """
    Explain the agent's decision using SHAP (KernelExplainer as DQN is a black box).
    """
    path = "backend/ml/models/social_sim_dqn.zip"
    if not os.path.exists(path):
        return "Model not found. Please train first."

    model = DQN.load(path)
    
    model = DQN.load(path)
    import torch
    
    # Define a prediction function that targets the MAX Q-Value (Expected Reward)
    # This allows us to see which features contribute to the agent expecting a high reward.
    def predict_reward(data):
        # Convert numpy to tensor
        obs_tensor = torch.as_tensor(data, dtype=torch.float32)
        with torch.no_grad():
            # Access the internal Q-Network of the DQN
            q_values = model.policy.q_net(obs_tensor)
        # Return the max Q-value (the value of the best action)
        return torch.max(q_values, dim=1).values.numpy()

    # Use KernelExplainer
    # Using a small background dataset (zeros) for reference
    background = np.zeros((1, 4)) 
    explainer = shap.KernelExplainer(predict_reward, background)
    
    shap_values = explainer.shap_values(np.array([observation]))
    
    # Create a summary plot (simple text representation for API return)
    features = ["Likes", "Comments", "Sentiment", "Interaction"]
    explanation = {}
    
    # shap_values is an array for regression (N, 4 features)
    vals = shap_values[0] # Single instance
    
    for i, feature in enumerate(features):
        explanation[feature] = float(vals[i])
        
    return explanation
