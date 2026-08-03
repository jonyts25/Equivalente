/**
 * QA: AI provider router and config (no Ollama/OpenAI network calls)
 */
import { getActiveProvider, isOllamaEnabled, isOpenAiEnabled } from "../src/lib/ai/config";
import { runAiTask } from "../src/lib/ai/provider-router";
import { runOllamaTask } from "../src/lib/ai/providers/ollama-provider";
import { runOpenAiTask } from "../src/lib/ai/providers/openai-provider";

const ctx = {
  userId: "00000000-0000-0000-0000-000000000001",
  patientId: "00000000-0000-0000-0000-000000000002",
  role: "nutritionist" as const,
  taskType: "generate_meal_options" as const,
  input: {
    patientName: "Paciente Demo",
    mealSlot: "Comida",
    dietSummary: "Dieta test",
    equivalences: "N/A",
    restrictions: "N/A",
    preferences: "N/A",
    forbiddenFoods: "N/A",
    triggerFoods: "N/A",
    forbiddenTreats: "N/A",
    precisionMode: "normal",
  },
};

let failed = 0;

function assert(name: string, condition: boolean, detail?: string) {
  if (!condition) {
    failed++;
    console.log("FAIL", name, detail ?? "");
  } else {
    console.log("PASS", name);
  }
}

async function main() {
  const provider = getActiveProvider();
  assert("getActiveProvider defaults manual_chatgpt", provider === "manual_chatgpt", provider);
  assert("isOllamaEnabled false by default", isOllamaEnabled() === false);
  assert("isOpenAiEnabled false by default", isOpenAiEnabled() === false);

  const manual = await runAiTask(ctx);
  assert("runAiTask mode manual", manual.mode === "manual");
  if (manual.mode === "manual") {
    assert("runAiTask has promptText", manual.promptText.length > 50);
    assert("runAiTask taskType matches", manual.taskType === "generate_meal_options");
  }

  let ollamaBlocked = false;
  const prevProvider = process.env.AI_PROVIDER;
  const prevEnable = process.env.ENABLE_OLLAMA;
  process.env.AI_PROVIDER = "ollama_local";
  process.env.OLLAMA_BASE_URL = "http://127.0.0.1:11434";
  process.env.OLLAMA_MODEL = "llama3";
  process.env.ENABLE_OLLAMA = "false";
  try {
    await runOllamaTask(ctx);
  } catch (e) {
    ollamaBlocked = e instanceof Error && e.message.includes("Ollama no está habilitado");
  }
  process.env.AI_PROVIDER = prevProvider;
  process.env.ENABLE_OLLAMA = prevEnable;
  assert("ollama blocked when ENABLE_OLLAMA=false", ollamaBlocked);

  let openaiBlocked = false;
  const prevOpenAiEnable = process.env.ENABLE_OPENAI_API;
  const prevOpenAiKey = process.env.OPENAI_API_KEY;
  process.env.AI_PROVIDER = "openai_api";
  process.env.OPENAI_API_KEY = "sk-test";
  process.env.ENABLE_OPENAI_API = "false";
  try {
    await runOpenAiTask(ctx);
  } catch (e) {
    openaiBlocked =
      e instanceof Error && e.message.includes("OpenAI API no está habilitada");
  }
  process.env.AI_PROVIDER = prevProvider;
  process.env.ENABLE_OPENAI_API = prevOpenAiEnable;
  process.env.OPENAI_API_KEY = prevOpenAiKey;
  assert("openai blocked when ENABLE_OPENAI_API=false", openaiBlocked);

  process.exit(failed > 0 ? 1 : 0);
}

main();
