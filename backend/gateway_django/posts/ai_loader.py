# ai_loader.py - In-process PyTorch Model Loader for Django

import os
import torch
from transformers import AutoTokenizer, AutoModelForSequenceClassification

HF_MODEL_NAME = "Lokesh1525/Comment-Moderation_System"

tokenizer = None
model = None
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

labels = [
    "toxic",
    "severe_toxic",
    "obscene",
    "threat",
    "insult",
    "identity_hate"
]

def load_ai_model():
    global tokenizer, model
    if tokenizer is None or model is None:
        try:
            tokenizer = AutoTokenizer.from_pretrained(HF_MODEL_NAME, subfolder="saved_model")
            model = AutoModelForSequenceClassification.from_pretrained(HF_MODEL_NAME, subfolder="saved_model")
            model.to(device)
            model.eval()
        except Exception as e:
            try:
                tokenizer = AutoTokenizer.from_pretrained(HF_MODEL_NAME)
                model = AutoModelForSequenceClassification.from_pretrained(HF_MODEL_NAME)
                model.to(device)
                model.eval()
            except Exception as e2:
                print(f"Error loading AI model in Django: {e2}")

def get_direct_prediction(text):
    # Skip inline 500MB PyTorch model download during HTTP request lifecycle
    # Moderation is handled via fast HTTP AI_SERVICE_URL or 0ms fallback_moderate
    return None
