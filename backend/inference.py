from transformers import AutoTokenizer, AutoModelForSequenceClassification
import torch

model_path = "saved_model"
tokenizer = AutoTokenizer.from_pretrained(model_path)
model = AutoModelForSequenceClassification.from_pretrained(model_path)

label_names = [
    "toxic",
    "severe_toxic",
    "obscene",
    "threat",
    "insult",
    "identity_hate"
]

def predict_toxicity(comment):
    enc = tokenizer(
        comment,
        return_tensors="pt",
        truncation=True,
        padding=True,
        max_length=128
    )
    with torch.no_grad():
        outputs = model(**enc)

    probs = torch.sigmoid(outputs.logits).tolist()[0]
    results = {}
    for i, score in enumerate(probs):
        results[label_names[i]] = score
    return results

text = "You're so stupid and annoying!"
print(predict_toxicity(text))

# Moderation decision function
def moderation_action(comment, lower=0.3, upper=0.6):
    """
    Classify and decide action based on label scores.
    If any label >= upper: Delete + Report
    If any label >= lower: Flag for manual review
    Otherwise: Allow
    """

    results = predict_toxicity(comment)  # get scores dict
    decision = "allow"

    # Check all labels
    for label, score in results.items():
        if score >= upper:
            decision = "delete_report"
            break
        if score >= lower:
            decision = "flag_review"

    return decision, results

if __name__ == "__main__":

    # Example comments
    comments = [
        "You are so dumb and offensive!",
        "Have a nice day!",
        "I might fuck you!"
    ]

    for c in comments:
        action, scores = moderation_action(c, lower=0.3, upper=0.6)
        print(f"\nComment: {c}")
        print(f"Action: {action}")
        print("Scores:", scores)