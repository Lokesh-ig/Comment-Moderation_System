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
    try:
        load_ai_model()
        if tokenizer is None or model is None:
            return None

        inputs = tokenizer(
            text,
            return_tensors="pt",
            truncation=True,
            padding=True,
            max_length=128
        )
        inputs = {key: val.to(device) for key, val in inputs.items()}

        with torch.no_grad():
            outputs = model(**inputs)

        logits = outputs.logits
        probs = torch.sigmoid(logits).cpu().numpy()[0]

        result = {label: float(prob) for label, prob in zip(labels, probs)}
        return result
    except Exception as e:
        print(f"Direct AI prediction exception: {e}")
        return None
