from fastapi import FastAPI, HTTPException, Body, Query
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
    path = "backend/data/logs/conversation.json"
    if os.path.exists(path):
        with open(path) as f:
            return json.load(f)
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
    post_ref.update({
        "comments": firestore.ArrayUnion([{"bot": matching["name"], "text": generated_reply}])
    })

    return {"message": "Reply added", "bot": matching["name"], "reply": generated_reply}

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
    return {"message": "Comment deleted"}


@app.post("/posts/{post_id}/like")
def like_post(post_id: str):
    post_ref = db.collection("posts").document(post_id)
    snapshot = post_ref.get()
    
    if not snapshot.exists:
        raise HTTPException(status_code=404, detail="Post not found")
        
    post_ref.update({"likes": firestore.Increment(1)})
    
    return {"message": "Post liked", "id": post_id}


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

@app.post("/ml/generate")
def generate_optimized_post(data: PredictInput, bot: str = Query("TechGuru")):
    # 1. Get Agent Strategy
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
    post_content = ollama_bot.generate_from_strategy(strategy)
    
    return {
        "strategy_used": strategy,
        "bot": matching["name"],
        "generated_content": post_content
    }
