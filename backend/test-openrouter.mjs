
import "dotenv/config";
import { OpenRouter } from "@openrouter/sdk";

const apiKey = process.env.OPENROUTER_API_KEY;

if (!apiKey) {
  throw new Error(
    "OPENROUTER_API_KEY missing. Check backend/.env"
  );
}

const openrouter = new OpenRouter({ apiKey });

const stream = await openrouter.chat.send({
  chatRequest: {
    model:
      process.env.OPENROUTER_MODEL ||
      "nvidia/nemotron-3-ultra-550b-a55b:free",
    messages: [
      {
        role: "user",
        content: "How many r's are in the word 'strawberry'?"
      }
    ],
    stream: true
  }
});

for await (const chunk of stream) {
  const content = chunk.choices[0]?.delta?.content;

  if (typeof content === "string") {
    process.stdout.write(content);
  }

  if (chunk.usage) {
    console.log(
      "\nReasoning tokens:",
      chunk.usage.completionTokensDetails?.reasoningTokens
    );
  }
}

console.log("\nOpenRouter test completed.");
