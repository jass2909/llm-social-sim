import chromadb
import os
import uuid
import logging

class VectorStore:
    def __init__(self, collection_name: str, persist_directory: str = "backend/data/chroma"):
        """
        Initialize ChromaDB client and collection.
        """
        # Ensure the directory exists
        if not os.path.exists(persist_directory):
            os.makedirs(persist_directory)
            
        self.client = chromadb.PersistentClient(path=persist_directory)
        self.collection = self.client.get_or_create_collection(name=collection_name)
        logging.info(f"VectorStore initialized for collection: {collection_name}")

    def add_memory(self, text: str, metadata: dict = None):
        """
        Add a memory to the vector store.
        """
        if metadata is None:
            metadata = {}
            
        # Chroma requires unique IDs. We'll generate a random UUID.
        memory_id = str(uuid.uuid4())
        
        self.collection.add(
            documents=[text],
            metadatas=[metadata],
            ids=[memory_id]
        )
        logging.info(f"Added memory to {self.collection.name}: {text[:50]}...")

    def search_memory(self, query_text: str, n_results: int = 3):
        """
        Search for relevant memories.
        """
        results = self.collection.query(
            query_texts=[query_text],
            n_results=n_results
        )
        
        # Unpack results
        documents = results['documents'][0] if results['documents'] else []
        metadatas = results['metadatas'][0] if results['metadatas'] else []
        
        return documents, metadatas

    def count(self):
        return self.collection.count()
