"""
LIT (Language Interpretability Tool) Runner for LLM Social Sim.

This script demonstrates how to set up LIT to analyze the sentiment analysis component 
or the classification logic used in our bot decisions.

Note: Since our main bot is via Ollama (API), getting full internal tokens/gradients for LIT is hard.
We will demonstrate LIT using a local HuggingFace model similar to what might be used for
sentiment analysis or a proxy for the bot's decision making.

Usage:
    python run_lit.py
"""

from lit_nlp import dev_server
from lit_nlp import server_flags
from lit_nlp.components import glue_models
from lit_nlp.components import glue_datasets
from lit_nlp.examples.models import glue_models as glue_models_lib
import transformers

import sys

def main(_):
    # We will use a standard Sentiment Analysis setup for demonstration
    # as described in LIT examples.
    
    # 1. Load Model (Using a small BERT model for SST-2 sentiment as proxy)
    # In a real scenario, this would be our fine-tuned classifier or a wrapper around Ollama.
    print("Loading model...")
    model_name = "distilbert-base-uncased-finetuned-sst-2-english"
    model = glue_models.HuggingFaceSentimentClassifier(model_name)
    
    # 2. Load Dataset
    print("Loading dataset...")
    # Using SST-2 validation data as sample social media-like text
    dataset = glue_datasets.SST2Data('validation')
    
    # 3. Start Server
    models = {"sst_sentiment": model}
    datasets = {"sst_validation": dataset}
    
    print("Starting LIT server...")
    lit_demo = dev_server.Server(models, datasets, port=5432)
    lit_demo.serve()

if __name__ == "__main__":
    # pip install lit-nlp transformers torch
    print("Ensure you have installed: pip install lit-nlp transformers torch")
    try:
        from absl import app
        app.run(main)
    except ImportError:
        print("LIT not installed. Please run: pip install lit-nlp")
