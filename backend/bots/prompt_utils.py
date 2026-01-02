def construct_system_prompt(persona_data: dict) -> str:
    """
    Constructs a comprehensive system prompt string from a structured persona dictionary.
    
    Args:
        persona_data (dict): The dictionary containing persona details like profile, political stance, etc.
        
    Returns:
        str: A formatted system prompt string.
    """
    name = persona_data.get("name", "Unknown")
    profile = persona_data.get("profile", {})
    political = persona_data.get("political_stance", {})
    belief = persona_data.get("belief_anchor", "")
    
    # Extract Profile Details
    age = profile.get("age", "Unknown")
    traits = ", ".join(profile.get("traits", []))
    interests = ", ".join(profile.get("interests", []))
    emotional = profile.get("emotional_baseline", "Neutral")
    style = profile.get("language_style", "Standard")
    
    # Extract Political Stance
    eco = political.get("economic", 0)
    soc = political.get("social", 0)
    auth = political.get("authority", 0)
    intensity = political.get("opinion_intensity", "medium")
    
    # Construct the Prompt
    prompt = (
        f"You are {name}, a {age}-year-old.\n"
        f"Your traits are: {traits}.\n"
        f"Your interests include: {interests}.\n"
        f"Your emotional baseline is {emotional} and your language style is {style}.\n\n"
        
        f"Political Stance:\n"
        f"- Economic: {eco} (Scale: -1 Left to +1 Right)\n"
        f"- Social: {soc} (Scale: -1 Conservative to +1 Progressive)\n"
        f"- Authority: {auth} (Scale: -1 Anarchist to +1 Authoritarian)\n"
        f"- Opinion Intensity: {intensity}\n\n"
        
        f"Belief Anchor:\n"
        f"\"{belief}\"\n\n"
        
        "Adopt this persona fully in all your responses. "
        "Speak naturally as this person would, reflecting their age, traits, and beliefs. "
        "Vary the length of your responses. Use short sentences for simple interactions, and only go into detail when the topic requires it."
    )
    
    return prompt

def get_stance_description(value: float, axis: str) -> str:
    """Maps a numerical score (-1.0 to 1.0) to a descriptive string."""
    if axis == "economic":
        if value < -0.6: return "Strongly Left-wing"
        if value < -0.2: return "Left-leaning"
        if value < 0.2: return "Centrist"
        if value < 0.6: return "Right-leaning"
        return "Strongly Right-wing"
    elif axis == "social":
        if value < -0.6: return "Strongly Conservative"
        if value < -0.2: return "Conservative-leaning"
        if value < 0.2: return "Moderate"
        if value < 0.6: return "Progressive-leaning"
        return "Strongly Progressive"
    elif axis == "authority":
        if value < -0.6: return "Strongly Anti-Authoritarian/Libertarian"
        if value < -0.2: return "Anti-Authoritarian-leaning"
        if value < 0.2: return "Moderate on Authority"
        if value < 0.6: return "Authoritarian-leaning"
        return "Strongly Authoritarian"
    return "Unknown"

def construct_reply_prompt(persona_data: dict, context_message: str) -> str:
    """
    Constructs a specific prompt for replying to posts, as per user requirement.
    """
    profile = persona_data.get("profile", {})
    political = persona_data.get("political_stance", {})
    belief = persona_data.get("belief_anchor", "")
    
    age = profile.get("age", "Unknown")
    traits = ", ".join(profile.get("traits", []))
    style = profile.get("language_style", "Standard")
    emotional = profile.get("emotional_baseline", "Neutral")
    
    eco_desc = get_stance_description(political.get("economic", 0), "economic")
    soc_desc = get_stance_description(political.get("social", 0), "social")
    auth_desc = get_stance_description(political.get("authority", 0), "authority")
    
    prompt = (
        "You are a social media user replying to another comment.\n"
        "You speak emotionally but stay coherent.\n\n"
        
        "Your persona:\n"
        f"Age: {age}\n"
        f"Traits: {traits}\n"
        f"Language style: {style}\n"
        f"Emotional baseline: {emotional}\n\n"
        
        "Your political position:\n"
        f"{eco_desc}\n"
        f"{soc_desc}\n"
        f"{auth_desc}\n\n"
        
        "Belief anchor:\n"
        f"{belief}\n\n"
        
        "Context:\n"
        "Another user wrote:\n"
        f"\"{context_message}\"\n\n"
        
        "Write a reply as this person would.\n"
        "It can show frustration, but must stay understandable.\n"
        "Keep your reply concise. Avoid long paragraphs unless deeply explaining a complex topic.\n"
        "IMPORTANT: Output ONLY the reply text itself. Do not include quotes. Do not include 'Here is a reply' or any other conversational filler. Just the reply."
    )
    
    return prompt
