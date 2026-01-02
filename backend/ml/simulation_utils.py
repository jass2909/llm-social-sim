import random
import ollama
from backend.bots.prompt_utils import construct_system_prompt

def run_social_simulation(post_content: str, personas: list, num_reactors: int = 5):
    """
    Simulates a round of social media interaction.
    
    Args:
        post_content (str): The text content of the post to evaluate.
        personas (list): List of persona dictionaries (must contain 'name', 'model', 'style', 'topics').
        num_reactors (int): How many random personas should view this post.

    Returns:
        dict: Contains 'likes', 'comments', 'total_score', 'details' 
    """
    
    # 1. Select Reactors
    # Ensure we don't pick more than available
    count = min(len(personas), num_reactors)
    reactors = random.sample(personas, count)
    
    # 2. Iterate and Collect Reactions
    likes = 0
    comments = 0
    details = []
    
    for reactor in reactors:
        # Build prompt for this reactor
        system_prompt = construct_system_prompt(reactor)
        # Simplified decision prompt to save tokens/time
        user_prompt = (
            f"You are scrolling social media. You see a post:\n"
            f"\"{post_content}\"\n\n"
            "Decide your interaction:\n"
            "LIKE, COMMENT, BOTH, or PASS.\n"
            "Return ONLY the word."
        )
        
        try:
            response = ollama.generate(
                model=reactor.get("model", "llama3.2"),
                prompt=f"System: {system_prompt}\n\nUser: {user_prompt}",
                options={"temperature": 0.1, "num_predict": 5}
            )
            decision = response["response"].strip().upper()
        except Exception as e:
            print(f"Error simulating reactor {reactor['name']}: {e}")
            decision = "PASS"
            
        # Clean up output
        if "BOTH" in decision: 
            likes += 1
            comments += 1
            action_score = 3
        elif "COMMENT" in decision: 
            comments += 1
            action_score = 2
        elif "LIKE" in decision: 
            likes += 1
            action_score = 1
        else:
            action_score = 0
            
        details.append({
            "reactor": reactor["name"],
            "decision": decision,
            "score": action_score
        })
        
    # Calculate Reward
    # Simple weighted sum: Likes=1, Comments=2
    reward = (likes * 1.0) + (comments * 2.0)
    
    return {
        "likes": likes,
        "comments": comments,
        "reward": reward,
        "details": details
    }
