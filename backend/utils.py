import re

# Simple list of banned words for demonstration. 
BANNED_WORDS = [
    "badword",
    "offensive",
    "inappropriate",
    "spam",
]

def filter_profanity(text: str) -> str:
    """
    Replaces banned words in the text with asterisks.
    Example: "This is a badword" -> "This is a *******"
    """
    if not text:
        return text

    filtered_text = text
    for word in BANNED_WORDS:
        # Case insensitive search
        pattern = re.compile(re.escape(word), re.IGNORECASE)
        filtered_text = pattern.sub("*" * len(word), filtered_text)
    
    return filtered_text
