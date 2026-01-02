
from backend.memory.vector_store import VectorStore
import json

def check_memory():
    # 1. Load Persona Name
    with open("backend/bots/personas.json") as f:
        bots = json.load(f)
        
    bot = bots[0] # TechGuru usually
    import re
    safe_name = re.sub(r'[^a-zA-Z0-9_-]', '', bot["name"].replace(' ', '_').lower())
    
    print(f"Checking memory for {bot['name']} (Collection: {safe_name})...")
    
    store = VectorStore(collection_name=safe_name)
    count = store.count()
    print(f"Total Memories: {count}")
    
    if count > 0:
        docs, metas = store.search_memory("post", n_results=5)
        print("\n--- Recent Memories ---")
        for i, (doc, meta) in enumerate(zip(docs, metas)):
            print(f"[{i+1}] {doc[:100]}... (Meta: {meta})")
            
if __name__ == "__main__":
    check_memory()
