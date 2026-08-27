import re

# Simple list of words to flag or delete
# In a real app, this would be much more extensive or use a dedicated library
BAD_WORDS_PATTERN = re.compile(r'\b(hate|offensive|stupid|idiot|kill|die|suicide)\b', re.IGNORECASE)
SEVERE_WORDS_PATTERN = re.compile(r'\b(kill|suicide|die)\b', re.IGNORECASE)

def fallback_moderate(text):
    """
    Perform simple keyword-based moderation as a fallback for the AI service.
    Returns (status, scores)
    """
    scores = {
        "toxic": 0.0,
        "severe_toxic": 0.0,
        "obscene": 0.0,
        "threat": 0.0,
        "insult": 0.0,
        "identity_hate": 0.0
    }
    
    if BAD_WORDS_PATTERN.search(text):
        scores["toxic"] = 0.5
        status = "flagged"
    else:
        status = "allowed"
        
    if SEVERE_WORDS_PATTERN.search(text):
        scores["toxic"] = 0.9
        scores["severe_toxic"] = 0.8
        status = "deleted"
        
    return status, scores
