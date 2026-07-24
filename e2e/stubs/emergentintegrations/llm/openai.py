class OpenAITextToSpeech:
    def __init__(self, *args, **kwargs):
        pass

    async def generate_speech_base64(self, *args, **kwargs):
        raise RuntimeError("Paid TTS calls are disabled in browser E2E tests")
