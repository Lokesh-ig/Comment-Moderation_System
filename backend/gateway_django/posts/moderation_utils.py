import re

# TIER 2: Moderate bad/insulting terms (triggers FLAGGED status: score = 0.5)
MODERATE_BAD_WORDS_PATTERN = re.compile(
    r'\b(hate|offensive|stupid|idiot|crap|dumb|fool|loser|ugly|shut\s*up|scam|cheat|retard|stfu|dick|bullshit|prick|jerk|piss|moron|psycho|garbage|trash)\b',
    re.IGNORECASE
)

# TIER 3: Severe toxic/profane/threat terms (triggers DELETED status: score = 0.9)
SEVERE_BAD_WORDS_PATTERN = re.compile(
    r'\b(kill|suicide|die|murder|terrorist|nigger|faggot|motherfucker|cunt|fuck|fucking|bitch|asshole|whore|slut|pussy|cock)\b',
    re.IGNORECASE
)

def fallback_moderate(text):
    """
    Perform 3-tier keyword-based moderation as a fallback for the AI service.
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
    
    if SEVERE_BAD_WORDS_PATTERN.search(text):
        scores["toxic"] = 0.9
        scores["severe_toxic"] = 0.85
        scores["obscene"] = 0.8
        status = "deleted"
    elif MODERATE_BAD_WORDS_PATTERN.search(text):
        scores["toxic"] = 0.5
        scores["insult"] = 0.5
        scores["obscene"] = 0.45
        status = "flagged"
    else:
        status = "allowed"
        
    return status, scores
