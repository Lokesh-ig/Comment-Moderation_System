import re

# Comprehensive patterns for bad/toxic/insulting/profane terms
BAD_WORDS_PATTERN = re.compile(
    r'\b(hate|offensive|stupid|idiot|kill|die|suicide|bitch|fuck|fucking|shit|asshole|bastard|crap|dumb|fool|loser|ugly|shut\s*up|scam|cheat|whore|slut|retard|stfu|dick|pussy|cock|motherfucker|bullshit|cunt|prick|jerk|nigger|faggot|piss|moron|psycho|garbage|trash)\b',
    re.IGNORECASE
)

SEVERE_WORDS_PATTERN = re.compile(
    r'\b(kill|suicide|die|murder|terrorist|nigger|faggot|motherfucker|cunt)\b',
    re.IGNORECASE
)

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
        scores["insult"] = 0.5
        scores["obscene"] = 0.5
        status = "flagged"
    else:
        status = "allowed"
        
    if SEVERE_WORDS_PATTERN.search(text):
        scores["toxic"] = 0.9
        scores["severe_toxic"] = 0.8
        scores["threat"] = 0.8
        status = "deleted"
        
    return status, scores
