import argparse
import json
import random
import time
from backend.firestore.firebase import db
from backend.bots.ollama_bot import OllamaBot
from backend.bots.prompt_utils import construct_system_prompt
from firebase_admin import firestore

def run_simulation(persona_name=None, limit=20):
    # 1. Load attributes
    with open("backend/bots/personas.json") as f:
        personas = json.load(f)

    if persona_name:
        persona = next((p for p in personas if p["name"] == persona_name), None)
        if not persona:
            print(f"Persona '{persona_name}' not found.")
            return
    else:
        persona = random.choice(personas)
    
    print(f"Selected Persona: {persona['name']}")
    
    # Pass the full persona dictionary to the bot
    bot = OllamaBot(persona["name"], persona["model"], persona)

    # 2. Fetch recent posts
    posts_ref = db.collection("posts").order_by("timestamp", direction=firestore.Query.DESCENDING).limit(limit)
    posts = list(posts_ref.stream())
    
    print(f"Found {len(posts)} recent posts to review.\n")
    
    for doc in posts:
        post_data = doc.to_dict()
        post_id = doc.id
        content = post_data.get("text", "")
        author = post_data.get("bot", "Unknown")
        
        if author == persona["name"]:
            continue # specific persona loop
            
        print(f"--- Reviewing Post by {author} ---")
        print(f"Content: {content}")
        
        # 3. Decide Action
        prompt = (
            f"You are scrolling through social media. You see a post by {author}: \"{content}\"\n"
            "Decide how you want to interact with this post. Your options are:\n"
            "1. LIKE: You like the post.\n"
            "2. COMMENT: You write a comment reply.\n"
            "3. BOTH: You like and comment.\n"
            "4. PASS: You do nothing.\n\n"
            "Respond with ONLY one of these words: LIKE, COMMENT, BOTH, PASS."
        )
        
        # We use a lower level generate call or just reply? 
        # OllamaBot.reply is conversational. Let's use a quick one-off generation or just parse reply.
        # Since 'reply' adds to memory, we might not want to pollute it with decision making metadata, 
        # but for now usage of standard generation is fine. All OllamaBot methods use self.model.
        
        # We can implement a helper in the script to keep it clean or use direct ollama library if needed.
        # But let's reuse a simple method if possible. 
        # Actually, let's just use the bot's underlying capability if possible, or just use `reply` 
        # but be aware it updates history.
        # Ideally we don't want "PASS" to be in the "conversation history" of the bot.
        # So we should probably use `ollama.generate` directly here or add a helper in Bot class?
        # The plan didn't specify modifying Bot class. I'll import ollama directly for the decision.
        
        import ollama
        system_prompt = construct_system_prompt(persona)
        try:
            response = ollama.generate(
                model=persona["model"],
                prompt=f"System: {system_prompt}\n\nUser: {prompt}",
                options={"temperature": 0.1, "num_predict": 10}
            )
            decision = response["response"].strip().upper()
        except Exception as e:
            print(f"Error calling LLM: {e}")
            decision = "PASS"
            
        # Clean up decision just in case
        if "BOTH" in decision: decision = "BOTH"
        elif "COMMENT" in decision: decision = "COMMENT"
        elif "LIKE" in decision: decision = "LIKE"
        else: decision = "PASS"
        
        print(f"Decision: {decision}")
        
        # 4. Execute Action
        if decision in ["LIKE", "BOTH"]:
            # Increment like in Firestore
            db.collection("posts").document(post_id).update({"likes": firestore.Increment(1)})
            print("Action: Liked post.")
            
        if decision in ["COMMENT", "BOTH"]:
            # Generate Comment
            # Use the bot.reply() ? That adds to memory "User: Post content". That's actually reasonable context.
            # "I saw this post and replied X".
            # Or we can just ask for a generation.
            
            comment_prompt = (
                f"You are reading a post by {author}: \"{content}\"\n"
                "Write a short, engaging comment reply."
            )
            
            # Using bot.reply might be weird if we don't want it to treat it as a direct message from the user "author".
            # But in a social sim, reading a post is like hearing someone speak.
            # Let's manual generate to avoid rigid "User:" / "Me:" structure of the simple bot if we want.
            # But the OllamaBot.generate_from_strategy does something similar.
            # Let's just generate directly to keep it simple and stateless for this script, 
            # OR use bot.reply(content) which is the most "agentic" way.
            # Let's use bot.reply(content) so it remembers it replied.
            
            reply_text = bot.reply(content)
            
            # Save to Firestore
            db.collection("posts").document(post_id).update({
                "comments": firestore.ArrayUnion([{"bot": persona["name"], "text": reply_text}])
            })
            print(f"Action: Commented -> \"{reply_text}\"")
            
        time.sleep(1) # Rate limit slightly

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Run persona simulation')
    parser.add_argument('--persona', type=str, help='Name of the persona to run (optional)')
    parser.add_argument('--limit', type=int, default=5, help='Number of recent posts to check')
    
    args = parser.parse_args()
    
    run_simulation(args.persona, args.limit)
