class UserMessage:
    def __init__(self, text=""):
        self.text = text


class LlmChat:
    def __init__(self, *args, **kwargs):
        pass

    def with_model(self, *args, **kwargs):
        return self

    async def send_message(self, *args, **kwargs):
        raise RuntimeError("Paid LLM calls are disabled in browser E2E tests")
