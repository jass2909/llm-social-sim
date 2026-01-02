from backend.ml.environment import SocialSimEnv
import numpy as np

def test_environment_integration():
    print("Initializing Environment...")
    env = SocialSimEnv()
    
    print("Resetting Environment...")
    obs, _ = env.reset()
    print(f"Initial Observation: {obs}")
    
    print("\nTaking a Step (Strategy 5: Humorous-Meme)...")
    # Action 5 corresponds to 'Humorous-Meme' in the strategy list
    observation, reward, terminated, truncated, info = env.step(5)
    
    print(f"\n--- Step Result ---")
    print(f"Post Content: \"{info['post']}\"")
    print(f"Reward: {reward}")
    print(f"Observation: {observation}")
    print(f"Reactor Detials: {info['details']}")
    
    if reward >= 0 and len(info['details']) > 0:
        print("\nTest PASSED: Environment successfully simulated reactions.")
    else:
        print("\nTest FAILED: No reward or details returned.")

if __name__ == "__main__":
    test_environment_integration()
