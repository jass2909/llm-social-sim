from fastapi import FastAPI, HTTPException, Body, Query
import random
import uuid
from datetime import datetime
from fastapi.middleware.cors import CORSMiddleware
from backend.simulation import run_local_simulation
from backend.bots.ollama_bot import OllamaBot
import json, os
from backend.firestore.firebase import db
from firebase_admin import firestore
from pydantic import BaseModel
from backend.ml.agent import train_agent, get_agent_action
from backend.ml.explain import explain_agent_decision

class PostInput(BaseModel):
    bot: str
    text: str


app = FastAPI(title="LLM Social Sim API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {"status": "ok", "service": "LLM Social Sim API"}

@app.get("/bots")
def get_bots():
    with open("backend/bots/personas.json") as f:
        return json.load(f)

@app.post("/simulate")
def simulate(rounds: int = 5, body: dict = Body(default={})):
    message = body.get("message")
    return {"conversation": run_local_simulation(rounds, message)}

@app.get("/logs")
def get_logs():
    return []

@app.get("/posts")
def get_posts():
    posts_ref = db.collection("posts").order_by("timestamp", direction=firestore.Query.DESCENDING)
    docs = posts_ref.stream()
    result = []
    for doc in docs:
        data = doc.to_dict()
        data["id"] = doc.id
        result.append(data)
    return result



@app.post("/posts")
def create_post(post: PostInput):
    doc = {
        "bot": post.bot,
        "text": post.text,
        "likes": 0,
        "comments": [],
        "timestamp": firestore.SERVER_TIMESTAMP,
    }
    # Save to Memory
    with open("backend/bots/personas.json") as f:
        bots = json.load(f)
    bot_data = next((b for b in bots if b["name"] == post.bot), None)
    
    if bot_data:
        try:
            ollama_bot = OllamaBot(post.bot, bot_data["model"], bot_data)
            ollama_bot.remember(post.text, metadata={"type": "post", "source": "manual"})
            print(f"[Memory] Saved manual post for {post.bot}")
        except Exception as e:
            print(f"[Memory] Failed to save manual post: {e}")

    db.collection("posts").add(doc)
    return {"message": "Post created"}

@app.post("/ask")
def ask_bot(bot: str = Query(...), question: dict = Body(...)):
    with open("backend/bots/personas.json") as f:
        bots = json.load(f)

    # Find bot by name
    matching = next((b for b in bots if b["name"].lower() == bot.lower()), None)
    if not matching:
        raise HTTPException(status_code=404, detail={"error": f"Bot '{bot}' not found"})

    ollama_bot = OllamaBot(matching["name"], matching["model"], matching)
    answer = ollama_bot.reply(question.get("question", ""))
    return {"bot": bot, "reply": answer}

class ReplyInput(BaseModel):
    bot: str
    postId: str

@app.post("/reply")
def reply_to_post(body: ReplyInput):
    # Load personas
    with open("backend/bots/personas.json") as f:
        bots = json.load(f)

    # Find bot persona
    matching = next((b for b in bots if b["name"].lower() == body.bot.lower()), None)
    if not matching:
        raise HTTPException(status_code=404, detail={"error": f"Bot '{body.bot}' not found"})

    # Fetch post text from Firestore
    post_ref = db.collection("posts").document(body.postId)
    snapshot = post_ref.get()
    if not snapshot.exists:
        raise HTTPException(status_code=404, detail={"error": "Post not found"})

    post_data = snapshot.to_dict()
    original_text = post_data.get("text", "")

    # Check if bot has already replied
    existing_comments = post_data.get("comments", [])
    if any(c.get("bot") == matching["name"] for c in existing_comments):
        raise HTTPException(status_code=400, detail="Bot has already replied to this post")

    # Generate reply using LLM bot
    ollama_bot = OllamaBot(matching["name"], matching["model"], matching)
    generated_reply = ollama_bot.reply(original_text)

    # Append reply to comments in Firestore
    new_comment_id = str(uuid.uuid4())
    new_comment = {
        "id": new_comment_id,
        "bot": matching["name"],
        "text": generated_reply,
        "replies": []
    }
    
    post_ref.update({
        "comments": firestore.ArrayUnion([new_comment])
    })

    return {"message": "Reply added", "bot": matching["name"], "reply": generated_reply, "comment_id": new_comment_id}

class DeleteCommentInput(BaseModel):
    postId: str
    index: int

@app.delete("/comments")
def delete_comment(body: DeleteCommentInput):
    post_ref = db.collection("posts").document(body.postId)
    snapshot = post_ref.get()

    if not snapshot.exists:
        raise HTTPException(status_code=404, detail="Post not found")

    data = snapshot.to_dict()
    comments = data.get("comments", [])

    if body.index < 0 or body.index >= len(comments):
        raise HTTPException(status_code=400, detail="Invalid comment index")

    # Remove selected comment
    comments.pop(body.index)

    # Update Firestore
    post_ref.update({"comments": comments})

    return {"message": "Comment deleted"}

class CommentReplyInput(BaseModel):
    bot: str
    text: str

@app.post("/posts/{post_id}/comments/{comment_id}/reply")
def reply_to_comment(post_id: str, comment_id: str, body: CommentReplyInput):
    # Fetch Post
    post_ref = db.collection("posts").document(post_id)
    snapshot = post_ref.get()
    if not snapshot.exists: raise HTTPException(404, detail="Post not found")
    data = snapshot.to_dict()
    comments = data.get("comments", [])
    
    # Find comment
    target_index = -1
    for i, c in enumerate(comments):
        # Handle cases where existing comments might not have IDs
        if c.get("id") == comment_id:
            target_index = i
            break
            
    if target_index == -1:
         raise HTTPException(404, detail="Comment not found")
         
    # Add reply
    reply_obj = {
        "bot": body.bot,
        "text": body.text,
        "timestamp": str(datetime.now())
    }
    
    if "replies" not in comments[target_index]:
        comments[target_index]["replies"] = []
    
    comments[target_index]["replies"].append(reply_obj)
    
    post_ref.update({"comments": comments})
    
    return {"message": "Reply added", "reply": reply_obj}


@app.post("/posts/{post_id}/owner_reply")
def owner_reply_trigger(post_id: str):
    post_ref = db.collection("posts").document(post_id)
    snapshot = post_ref.get()
    if not snapshot.exists: raise HTTPException(404, detail="Post not found")
    data = snapshot.to_dict()
    
    owner_name = data.get("bot")
    post_text = data.get("text")
    comments = data.get("comments", [])
    
    # Load Owner Persona
    with open("backend/bots/personas.json") as f:
        bots = json.load(f)
    owner = next((b for b in bots if b["name"] == owner_name), None)
    if not owner:
        raise HTTPException(404, detail=f"Owner bot {owner_name} not found")
        
    ollama_bot = OllamaBot(owner_name, owner["model"], owner)
    
    replied_count = 0
    updated = False
    
    actions_taken = []

    for c in comments:
        if "replies" not in c: c["replies"] = []
        
        # Check if owner already replied
        if any(r.get("bot") == owner_name for r in c["replies"]):
            continue
            
        # Don't reply to self
        if c.get("bot") == owner_name:
            continue
            
        # Decide
        should_reply, reason = ollama_bot.decide_reply_to_comment(c.get("text", ""), post_text)
        print(f"Owner {owner_name} logic: {c.get('bot')} -> Reply? {should_reply} (Reason: {reason})")
        
        actions_taken.append({
            "comment_id": c.get("id"),
            "comment_bot": c.get("bot"),
            "reply": should_reply,
            "reason": reason
        })
        
        if should_reply:
            reply_text = ollama_bot.generate_reply_to_comment(c.get("text", ""), post_text)
            
            c["replies"].append({
                "bot": owner_name,
                "text": reply_text,
                "timestamp": str(datetime.now())
            })
            replied_count += 1
            updated = True
            
    if updated:
        post_ref.update({"comments": comments})
        
    return {
        "message": "Owner reply cycle complete", 
        "replied_count": replied_count, 
        "owner": owner_name, 
        "comments": comments,
        "actions": actions_taken
    }



@app.post("/posts/{post_id}/like")
def like_post(post_id: str):
    post_ref = db.collection("posts").document(post_id)
    snapshot = post_ref.get()
    
    if not snapshot.exists:
        raise HTTPException(status_code=404, detail="Post not found")
        
    post_ref.update({"likes": firestore.Increment(1)})
    
    return {"message": "Post liked", "id": post_id}


@app.delete("/posts/{post_id}")
def delete_post(post_id: str):
    post_ref = db.collection("posts").document(post_id)
    snapshot = post_ref.get()
    
    if not snapshot.exists:
        raise HTTPException(status_code=404, detail="Post not found")
        
    post_ref.delete()
    
    return {"message": "Post deleted", "id": post_id}


def _process_bot_interaction(bot_data, post_data, post_ref):
    bot_name = bot_data["name"]
    
    # Check for self-interaction
    if bot_name == post_data.get("bot"):
        print(f"[Simulate] {bot_name} skipped (cannot interact with own post)")
        return {
            "type": "ignore",
            "bot": bot_name,
            "message": f"{bot_name} skipped (own post)"
        }

    # Initialize Bot
    ollama_bot = OllamaBot(bot_name, bot_data["model"], bot_data)

    # Decide Action
    action, reason = ollama_bot.decide_interaction(post_data.get("text", "")) # Returns LIKE, COMMENT, or IGNORE
    print(f"[Simulate] {bot_name} chose to {action} (Reason: {reason})")

    if action == "LIKE":
        post_ref.update({"likes": firestore.Increment(1)})
        
        # Save Memory
        ollama_bot.remember(
            f"I liked a post: '{post_data.get('text', '')[:50]}...'", 
            metadata={"type": "interaction", "action": "LIKE", "reason": reason}
        )

        return {
            "type": "like",
            "bot": bot_name,
            "reason": reason,
            "message": f"{bot_name} liked the post. Reason: {reason}"
        }
    elif action == "COMMENT":
        reply = ollama_bot.reply(post_data.get("text", ""))
        comment_id = str(uuid.uuid4())
        comment = {"id": comment_id, "bot": bot_name, "text": reply, "replies": []}
        post_ref.update({
            "comments": firestore.ArrayUnion([comment])
        })
        
        # Save Memory (reply() handles conversation memory, but we want to capture the specific interaction context too)
        ollama_bot.remember(
            f"I commented on a post: '{post_data.get('text', '')[:50]}...' My comment: '{reply}'", 
            metadata={"type": "interaction", "action": "COMMENT", "reason": reason}
        )

        return {
            "type": "comment",
            "bot": bot_name,
            "comment": reply,
            "comment_id": comment_id,
            "reason": reason,
            "message": f"{bot_name} commented: {reply}. Reason: {reason}"
        }
    elif action == "BOTH":
        # Like
        post_ref.update({"likes": firestore.Increment(1)})
        # Comment
        reply = ollama_bot.reply(post_data.get("text", ""))
        comment_id = str(uuid.uuid4())
        comment = {"id": comment_id, "bot": bot_name, "text": reply, "replies": []}
        post_ref.update({
            "comments": firestore.ArrayUnion([comment])
        })
        
        # Save Memory
        ollama_bot.remember(
            f"I liked and commented on a post: '{post_data.get('text', '')[:50]}...' My comment: '{reply}'", 
            metadata={"type": "interaction", "action": "BOTH", "reason": reason}
        )
        
        return {
            "type": "both",
            "bot": bot_name,
            "comment": reply,
            "comment_id": comment_id,
            "reason": reason,
            "message": f"{bot_name} liked & commented: {reply}. Reason: {reason}"
        }

    else:
        # Ignore
        return {
            "type": "ignore",
            "bot": bot_name,
            "reason": reason,
            "message": f"{bot_name} ignored the post. Reason: {reason}"
        }

@app.post("/posts/{post_id}/simulate_interaction")
def simulate_post_interaction(post_id: str, mode: str = Query("single")):
    # 1. Fetch Post
    post_ref = db.collection("posts").document(post_id)
    snapshot = post_ref.get()
    if not snapshot.exists:
        raise HTTPException(status_code=404, detail="Post not found")
    
    post_data = snapshot.to_dict()
    
    # 2. Load Personas
    with open("backend/bots/personas.json") as f:
        bots = json.load(f)
    
    if mode == "all":
        results = []
        likes_added = 0
        comments_added = 0
        ignored = 0
        
        print(f"\n--- Batch Simulation Start ({len(bots)} bots) ---")
        for i, bot_data in enumerate(bots):
            print(f"Processing bot {i+1}/{len(bots)}: {bot_data['name']}")
            res = _process_bot_interaction(bot_data, post_data, post_ref)
            results.append(res)
            if res["type"] == "like": likes_added += 1
            elif res["type"] == "comment": comments_added += 1
            else: ignored += 1
            
        return {
            "type": "batch",
            "message": f"Simulated {len(bots)} bots: {likes_added} Likes, {comments_added} Comments, {ignored} Ignored.",
            "results": results
        }
    
    else:
        # Single Random Bot
        bot_data = random.choice(bots)
        return _process_bot_interaction(bot_data, post_data, post_ref)

@app.post("/simulation/run_all")
def run_global_simulation():
    # 1. Fetch All Posts
    posts_ref = db.collection("posts").order_by("timestamp", direction=firestore.Query.DESCENDING)
    posts_docs = list(posts_ref.stream())
    
    # 2. Fetch All Bots
    with open("backend/bots/personas.json") as f:
        bots = json.load(f)
        
    print(f"\n🚀 STARTING GLOBAL SIMULATION: {len(posts_docs)} Posts x {len(bots)} Bots 🚀")
    
    total_interactions = 0
    likes = 0
    comments = 0
    ignored = 0
    
    for i, p_doc in enumerate(posts_docs):
        p_data = p_doc.to_dict()
        p_data["id"] = p_doc.id
        # We need p_ref for updates
        p_ref = db.collection("posts").document(p_doc.id)
        
        print(f"\n--- Post {i+1}/{len(posts_docs)}: {p_doc.id} ---")
        
        for j, bot_data in enumerate(bots):
            print(f"Post {i+1}/{len(posts_docs)} | Bot {j+1}/{len(bots)} ({bot_data['name']})... ", end="", flush=True)
            res = _process_bot_interaction(bot_data, p_data, p_ref)
            
            # _process_bot_interaction handles skip logic and prints, but prints newline.
            # Let's just aggregate stats.
            if res["type"] in ["like", "both"]: likes += 1
            if res["type"] in ["comment", "both"]: comments += 1
            if res["type"] == "ignore": ignored += 1
            
            print(f" -> {res['type'].upper()}")
            total_interactions += 1
            
    print(f"\n✅ GLOBAL SIMULATION COMPLETE")
    print(f"Total Checks: {total_interactions}")
    print(f"Likes: {likes}, Comments: {comments}, Ignored: {ignored}")
    
    return {
        "message": "Global simulation complete",
        "stats": {
            "likes": likes,
            "comments": comments,
            "ignored": ignored,
            "total_checks": total_interactions
        }
    }


# ---------------- ML Endpoints ----------------

from fastapi.responses import StreamingResponse
import threading
import queue
import time

@app.post("/ml/train")
def run_training(n_steps: int = 500):
    status_queue = queue.Queue()
    
    def training_wrapper():
        try:
            train_agent(status_queue, n_steps=n_steps)
        except Exception as e:
            status_queue.put(f"Error: {str(e)}\n")
        finally:
            status_queue.put("DONE")

    def event_generator():
        # Start training in background
        thread = threading.Thread(target=training_wrapper)
        thread.start()
        
        while True:
            msg = status_queue.get()
            if msg == "DONE":
                break
            yield msg
            
    return StreamingResponse(event_generator(), media_type="text/plain")

class PredictInput(BaseModel):
    likes: int
    comments: int
    sentiment: float
    interaction: float
    topic: str = None  # Optional topic override

@app.post("/ml/predict")
def predict_best_action(data: PredictInput):
    # Convert input to gymnasium observation format (numpy array)
    import numpy as np
    obs = np.array([data.likes, data.comments, data.sentiment, data.interaction])
    action = get_agent_action(obs)
    
    # Map action index to human readable strategy
    strategies = [
        "Friendly-Tech", "Friendly-Lifestyle", 
        "Professional-Tech", "Professional-Lifestyle",
        "Controversial-Opinion", "Humorous-Meme",
        "Educational-Tutorial", "Inspirational-Story"
    ]
    return {
        "action_id": action,
        "strategy": strategies[action] if action < len(strategies) else "Unknown"
    }

@app.post("/ml/explain")
def explain_decision(data: PredictInput):
    import numpy as np
    obs = np.array([data.likes, data.comments, data.sentiment, data.interaction])
    explanation = explain_agent_decision(obs)
    return {"explanation": explanation}

class ExplainTextInput(BaseModel):
    bot: str
    text: str

@app.post("/ml/explain_text")
def explain_text_interaction(data: ExplainTextInput):
    # 1. Get LIME Explanation
    from backend.ml.lime_explainer import LIMEExplainer
    explainer = LIMEExplainer()
    lime_exp = explainer.explain(data.bot, data.text)

    # 2. Get Own Explanation (CoT)
    # Load persona
    with open("backend/bots/personas.json") as f:
        bots = json.load(f)
    bot_data = next((b for b in bots if b["name"] == data.bot), None)
    
    own_decision, own_reason = "UNKNOWN", "Bot not found"
    if bot_data:
        ollama_bot = OllamaBot(data.bot, bot_data["model"], bot_data)
        own_decision, own_reason = ollama_bot.decide_interaction(data.text)
    
    return {
        "lime_explanation": lime_exp,
        "own_decision": own_decision,
        "own_reason": own_reason
    }

@app.post("/ml/generate")
def generate_optimized_post(data: PredictInput, bot: str = Query("TechGuru")):
    # 1. Determine Strategy (Agent vs Topic Override)
    strategy = "General"
    
    if data.topic and data.topic.strip():
        # Override with manual topic
        strategy = data.topic.strip()
        print(f"\n[DEBUG] Generation Context: Manual Topic Override -> {strategy}")
    else:
        # Use ML Agent
        import numpy as np
        
        # If using "Auto" mode (flagged by -1), calculate real stats from Firestore
        if data.likes == -1:
            # Fetch last 10 posts to get average performance
            posts_ref = db.collection("posts").order_by("timestamp", direction=firestore.Query.DESCENDING).limit(10)
            docs = posts_ref.stream()
            
            total_likes = 0
            total_comments = 0
            count = 0
            
            for doc in docs:
                p = doc.to_dict()
                total_likes += p.get("likes", 0)
                # comments is a list, take length
                total_comments += len(p.get("comments", []))
                count += 1
                
            if count > 0:
                avg_likes = total_likes / count
                avg_comments = total_comments / count
                # Interaction rate = (likes + comments) / 100 (normalized roughly)
                interaction = (avg_likes + avg_comments) / 20.0 
            else:
                avg_likes = 0
                avg_comments = 0
                interaction = 0.0

            obs = np.array([avg_likes, avg_comments, 0.8, interaction])
            print(f"Using Real Stats: Likes={avg_likes}, Comments={avg_comments}")
        else:
            obs = np.array([data.likes, data.comments, data.sentiment, data.interaction])
        
        print(f"\n[DEBUG] Generation Context:")
        print(f"  > Metrics: Likes={obs[0]:.1f}, Comments={obs[1]:.1f}, Sentiment={obs[2]:.1f}, Rate={obs[3]:.2f}")
            
        action_id = get_agent_action(obs)
        
        strategies = [
            "Friendly-Tech", "Friendly-Lifestyle", 
            "Professional-Tech", "Professional-Lifestyle",
            "Controversial-Opinion", "Humorous-Meme",
            "Educational-Tutorial", "Inspirational-Story"
        ]
        strategy = strategies[action_id] if action_id < len(strategies) else "General"
        print(f"  > Selected Strategy: {strategy} (Action: {action_id})\n")
    
    # 2. Use Bot to Generate Content
    # Load persona (simple lookup)
    with open("backend/bots/personas.json") as f:
        bots = json.load(f)
    matching = next((b for b in bots if b["name"] == bot), bots[0])
    
    ollama_bot = OllamaBot(matching["name"], matching["model"], matching)
    
    # Pass the strategy (which might be the manual topic now)
    post_content = ollama_bot.generate_from_strategy(strategy)
    
    return {
        "strategy_used": strategy,
        "bot": matching["name"],
        "generated_content": post_content
    }
