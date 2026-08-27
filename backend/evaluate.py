# evaluate.py
import pandas as pd
import numpy as np
import torch
from transformers import AutoTokenizer, AutoModelForSequenceClassification
from sklearn.metrics import accuracy_score, classification_report

# 1) Load your fine-tuned model + tokenizer
model_path = "./ai_service_flask/saved_model"
tokenizer = AutoTokenizer.from_pretrained(model_path,local_files_only=True)
model = AutoModelForSequenceClassification.from_pretrained(model_path,local_files_only=True)

# 2) Load validation dataset
df = pd.read_csv("validation.csv")  # Replace with your validation CSV
texts = df["comment_text"].tolist()

# True labels for multi-label classification
true_labels = df[['toxic','severe_toxic','obscene',
                  'threat','insult','identity_hate']].values

# 3) Run predictions in batches
def get_predictions(texts, batch_size=16):
    model.eval()
    all_preds = []

    with torch.no_grad():
        for start in range(0, len(texts), batch_size):
            batch_texts = texts[start:start+batch_size]
            encodings = tokenizer(batch_texts,
                                  padding=True,
                                  truncation=True,
                                  max_length=128,
                                  return_tensors="pt")

            outputs = model(**encodings)
            probs = torch.sigmoid(outputs.logits).cpu().numpy()
            # Convert probabilities to 0/1 using threshold
            preds = (probs >= 0.5).astype(int)
            all_preds.extend(preds)

    return np.array(all_preds)

# 4) Do prediction
predictions = get_predictions(texts)

# 5) Evaluate and show results
print("Subset Accuracy (exact match of labels):",
      accuracy_score(true_labels, predictions))

print("\nClassification Report:")
print(classification_report(true_labels, predictions,
                            target_names=[
                              "toxic","severe_toxic","obscene",
                              "threat","insult","identity_hate"
                            ]))


