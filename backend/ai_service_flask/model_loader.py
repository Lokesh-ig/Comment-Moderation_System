# model_loader.py

import os
import torch
from transformers import AutoTokenizer, AutoModelForSequenceClassification

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
LOCAL_MODEL_PATH = os.path.join(BASE_DIR, "saved_model")
HF_MODEL_NAME = "Lokesh1525/Comment-Moderation_System"

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

# Use local saved_model if present, otherwise fetch from Hugging Face
if os.path.exists(LOCAL_MODEL_PATH) and os.path.exists(os.path.join(LOCAL_MODEL_PATH, "model.safetensors")):
    tokenizer = AutoTokenizer.from_pretrained(LOCAL_MODEL_PATH, local_files_only=True)
    model = AutoModelForSequenceClassification.from_pretrained(LOCAL_MODEL_PATH, local_files_only=True)
else:
    try:
        tokenizer = AutoTokenizer.from_pretrained(HF_MODEL_NAME, subfolder="saved_model")
        model = AutoModelForSequenceClassification.from_pretrained(HF_MODEL_NAME, subfolder="saved_model")
    except Exception:
        tokenizer = AutoTokenizer.from_pretrained(HF_MODEL_NAME)
        model = AutoModelForSequenceClassification.from_pretrained(HF_MODEL_NAME)

model.to(device)
model.eval()

labels = [
    "toxic",
    "severe_toxic",
    "obscene",
    "threat",
    "insult",
    "identity_hate"
]

def predict_toxicity(text):
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