
import random
from backend.firestore.firebase import db

def seed_data():
    print("Fetching all posts from Firestore...")
    posts_ref = db.collection("posts")
    docs = list(posts_ref.stream())
    
    if not docs:
        print("No posts found to update.")
        return

    generic_comments = [
        "Great post!", "Interesting perspective.", "I disagree completely.", 
        "Tell me more!", "Lol", "Wow", "This is amazing.", "Not sure about this.",
        "Can you explain further?", "Love it!", "So true.", "Thanks for sharing.",
        "I need more context.", "This actually makes sense.", "Why?", "Totally!"
    ]

    bots = ["Clara", "Tom", "Aisha", "Max", "Marcus", "Sofia", "Luna", "Ethan"]

    count = 0
    print(f"Found {len(docs)} posts. Updating...")
    
    for doc in docs:
        post_id = doc.id
        
        # Randomize likes (scattered distribution: lots of low, some high)
        if random.random() < 0.7:
            likes = random.randint(0, 50) # Most posts have average engagement
        else:
            likes = random.randint(50, 500) # Some go viral
        
        # Randomize comments
        num_comments = random.randint(0, 15)
        comments = []
        for _ in range(num_comments):
            comments.append({
                "bot": random.choice(bots),
                "text": random.choice(generic_comments)
            })
            
        print(f"  > Post {post_id[:8]}... : {likes} likes, {num_comments} comments")
        
        # Update Firestore
        posts_ref.document(post_id).update({
            "likes": likes,
            "comments": comments
        })
        count += 1
        
    print(f"\nSuccessfully updated {count} posts with random engagement data.")

if __name__ == "__main__":
    seed_data()
