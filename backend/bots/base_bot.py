class BaseBot:
    def __init__(self, name: str, model: str, persona: str):
        self.name = name
        self.model = model
        self.persona = persona

    def reply(self, message: str):
        raise NotImplementedError("BaseBot.reply() must be implemented by subclasses")
