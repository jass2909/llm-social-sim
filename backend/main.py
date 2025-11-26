from fastapi import FastAPI, HTTPException, Body, Query
from fastapi.middleware.cors import CORSMiddleware
from backend.simulation import run_local_simulation
from backend.bots.ollama_bot import OllamaBot
import json, os
from backend.firestore.firebase import db
from firebase_admin import firestore
from pydantic import BaseModel

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

    ollama_bot = OllamaBot(matching["name"], matching["model"], matching["persona"])
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
    ollama_bot = OllamaBot(matching["name"], matching["model"], matching["persona"])
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
