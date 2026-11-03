/**
 * The OpenRouter models Beans can use to suggest tasks for a goal. Pick one by
 * changing `GOAL_MODEL` at the bottom; TypeScript rejects an id that isn't listed.
 *
 * Every model here takes a strict JSON schema (OpenRouter's `structured_outputs`),
 * which goal suggestions rely on. Prices are USD per million tokens as OpenRouter
 * listed them on 2026-11-03; check them again before switching. One suggestion
 * round is roughly 1,500 tokens in and 1,200 out, so 1,000 rounds cost about
 * `1.5 * input + 1.2 * output` dollars, plus reasoning tokens on reasoning models.
 *
 * `tier` follows the output price: budget up to $1, standard up to $5, premium above.
 * How to refresh the list is in docs/ideas/goal-lists.md.
 */

export type GoalModelTier = "budget" | "standard" | "premium";

export interface GoalModel {
  /** OpenRouter model id, sent as `model`. */
  id: string;
  name: string;
  /** USD per million input tokens. */
  input: number;
  /** USD per million output tokens. */
  output: number;
  /** Context window in tokens. */
  context: number;
  /** Takes OpenRouter's `reasoning` setting. Ask for low effort; the task is short. */
  reasoning: boolean;
  tier: GoalModelTier;
}

export const GOAL_MODELS = [
  { id: "anthropic/claude-haiku-5.5", name: "Anthropic: Claude Haiku 5.5", input: 0.1, output: 0.5, context: 1000000, reasoning: true, tier: "budget" },
  { id: "anthropic/claude-sonnet-5.5", name: "Anthropic: Claude Sonnet 5.5", input: 2, output: 10, context: 1000000, reasoning: true, tier: "premium" },
  { id: "anthropic/claude-opus-5.5", name: "Anthropic: Claude Opus 5.5", input: 4, output: 20, context: 1000000, reasoning: true, tier: "premium" },
  { id: "anthropic/claude-fable-5.1", name: "Anthropic: Claude Fable 5.1", input: 10, output: 50, context: 1000000, reasoning: true, tier: "premium" },
  { id: "anthropic/claude-sonnet-5", name: "Anthropic: Claude Sonnet 5", input: 2, output: 10, context: 1000000, reasoning: true, tier: "premium" },
  { id: "anthropic/claude-opus-5", name: "Anthropic: Claude Opus 5", input: 5, output: 25, context: 1000000, reasoning: true, tier: "premium" },
  { id: "anthropic/claude-fable-5", name: "Anthropic: Claude Fable 5", input: 10, output: 50, context: 1000000, reasoning: true, tier: "premium" },
  { id: "anthropic/claude-opus-4.8", name: "Anthropic: Claude Opus 4.8", input: 5, output: 25, context: 1000000, reasoning: true, tier: "premium" },
  { id: "anthropic/claude-sonnet-4.6", name: "Anthropic: Claude Sonnet 4.6", input: 3, output: 15, context: 1000000, reasoning: true, tier: "premium" },
  { id: "anthropic/claude-haiku-4.5", name: "Anthropic: Claude Haiku 4.5", input: 1, output: 5, context: 200000, reasoning: true, tier: "standard" },
  { id: "openai/gpt-6-luna", name: "OpenAI: GPT-6 Luna", input: 0.1, output: 0.5, context: 1050000, reasoning: true, tier: "budget" },
  { id: "openai/gpt-6.1-terra", name: "OpenAI: GPT-6.1 Terra", input: 1, output: 5, context: 1050000, reasoning: true, tier: "standard" },
  { id: "openai/gpt-6.1-sol", name: "OpenAI: GPT-6.1 Sol", input: 2, output: 10, context: 1050000, reasoning: true, tier: "premium" },
  { id: "openai/gpt-6-sol", name: "OpenAI: GPT-6 Sol", input: 2, output: 10, context: 1050000, reasoning: true, tier: "premium" },
  { id: "openai/gpt-6-astra", name: "OpenAI: GPT-6 Astra", input: 10, output: 50, context: 1050000, reasoning: true, tier: "premium" },
  { id: "openai/gpt-5.6-luna", name: "OpenAI: GPT-5.6 Luna", input: 0.2, output: 1.2, context: 1050000, reasoning: true, tier: "standard" },
  { id: "openai/gpt-5.6-terra", name: "OpenAI: GPT-5.6 Terra", input: 2, output: 12, context: 1050000, reasoning: true, tier: "premium" },
  { id: "openai/gpt-5.6-sol", name: "OpenAI: GPT-5.6 Sol", input: 4, output: 20, context: 1050000, reasoning: true, tier: "premium" },
  { id: "openai/gpt-5.5", name: "OpenAI: GPT-5.5", input: 5, output: 30, context: 1050000, reasoning: true, tier: "premium" },
  { id: "openai/gpt-5.4", name: "OpenAI: GPT-5.4", input: 2.5, output: 15, context: 1050000, reasoning: true, tier: "premium" },
  { id: "openai/gpt-5.4-mini", name: "OpenAI: GPT-5.4 Mini", input: 0.75, output: 4.5, context: 400000, reasoning: true, tier: "standard" },
  { id: "openai/gpt-5.4-nano", name: "OpenAI: GPT-5.4 Nano", input: 0.2, output: 1.25, context: 400000, reasoning: true, tier: "standard" },
  { id: "openai/gpt-5.1", name: "OpenAI: GPT-5.1", input: 1.25, output: 10, context: 400000, reasoning: true, tier: "premium" },
  { id: "openai/gpt-5-mini", name: "OpenAI: GPT-5 Mini", input: 0.25, output: 2, context: 400000, reasoning: true, tier: "standard" },
  { id: "openai/gpt-5-nano", name: "OpenAI: GPT-5 Nano", input: 0.05, output: 0.4, context: 400000, reasoning: true, tier: "budget" },
  { id: "openai/gpt-oss-120b", name: "OpenAI: gpt-oss-120b", input: 0.15, output: 0.6, context: 131072, reasoning: true, tier: "budget" },
  { id: "openai/gpt-oss-20b", name: "OpenAI: gpt-oss-20b", input: 0.03, output: 0.13, context: 131072, reasoning: true, tier: "budget" },
  { id: "openai/gpt-4.1-mini", name: "OpenAI: GPT-4.1 Mini", input: 0.4, output: 1.6, context: 1047576, reasoning: false, tier: "standard" },
  { id: "openai/gpt-4o-mini", name: "OpenAI: GPT-4o-mini", input: 0.15, output: 0.6, context: 128000, reasoning: false, tier: "budget" },
  { id: "google/gemini-4-argon", name: "Google: Gemini 4 Argon", input: 2, output: 10, context: 1048576, reasoning: true, tier: "premium" },
  { id: "google/gemini-3.8-flash", name: "Google: Gemini 3.8 Flash", input: 0.83, output: 4.13, context: 1048576, reasoning: true, tier: "standard" },
  { id: "google/gemini-3.7-flash", name: "Google: Gemini 3.7 Flash", input: 0.75, output: 3.75, context: 1048576, reasoning: true, tier: "standard" },
  { id: "google/gemini-3.6-flash", name: "Google: Gemini 3.6 Flash", input: 0.75, output: 3.75, context: 1048576, reasoning: true, tier: "standard" },
  { id: "google/gemini-3.5-flash", name: "Google: Gemini 3.5 Flash", input: 1.5, output: 9, context: 1048576, reasoning: true, tier: "premium" },
  { id: "google/gemini-3.5-flash-lite", name: "Google: Gemini 3.5 Flash Lite", input: 0.3, output: 2.5, context: 1048576, reasoning: true, tier: "standard" },
  { id: "google/gemini-3.1-flash-lite", name: "Google: Gemini 3.1 Flash Lite", input: 0.25, output: 1.5, context: 1048576, reasoning: true, tier: "standard" },
  { id: "google/gemini-3.1-pro-preview", name: "Google: Gemini 3.1 Pro Preview", input: 2, output: 12, context: 1048576, reasoning: true, tier: "premium" },
  { id: "google/gemini-2.5-pro", name: "Google: Gemini 2.5 Pro", input: 1.25, output: 10, context: 1048576, reasoning: true, tier: "premium" },
  { id: "google/gemini-2.5-flash", name: "Google: Gemini 2.5 Flash", input: 0.3, output: 2.5, context: 1048576, reasoning: true, tier: "standard" },
  { id: "google/gemini-2.5-flash-lite", name: "Google: Gemini 2.5 Flash Lite", input: 0.1, output: 0.4, context: 1048576, reasoning: true, tier: "budget" },
  { id: "google/gemma-4-31b-it", name: "Google: Gemma 4 31B", input: 0.2, output: 0.4, context: 262144, reasoning: true, tier: "budget" },
  { id: "google/gemma-4-26b-a4b-it", name: "Google: Gemma 4 26B A4B ", input: 0.1, output: 0.3, context: 262144, reasoning: true, tier: "budget" },
  { id: "deepseek/deepseek-v4.1-flash", name: "DeepSeek: DeepSeek V4.1 Flash", input: 0.05, output: 0.5, context: 1048576, reasoning: true, tier: "budget" },
  { id: "deepseek/deepseek-v4.1-flash-1017", name: "DeepSeek: DeepSeek V4.1 Flash 1017", input: 0.15, output: 0.6, context: 1048576, reasoning: true, tier: "budget" },
  { id: "deepseek/deepseek-v4-pro", name: "DeepSeek: DeepSeek V4 Pro 0423", input: 1.6, output: 3.2, context: 1048576, reasoning: true, tier: "standard" },
  { id: "deepseek/deepseek-v4-pro-0813", name: "DeepSeek: DeepSeek V4 Pro 0813", input: 0.12, output: 4, context: 1048576, reasoning: true, tier: "standard" },
  { id: "deepseek/deepseek-v4-flash", name: "DeepSeek: DeepSeek V4 Flash 0423", input: 0.09, output: 0.18, context: 1048576, reasoning: true, tier: "budget" },
  { id: "deepseek/deepseek-v3.2", name: "DeepSeek: DeepSeek V3.2", input: 0.26, output: 0.38, context: 163840, reasoning: true, tier: "budget" },
  { id: "qwen/qwen3.8-max-prime", name: "Qwen: Qwen3.8 Max Prime", input: 4, output: 12, context: 1000000, reasoning: true, tier: "premium" },
  { id: "qwen/qwen3.8-max-0902", name: "Qwen: Qwen3.8 Max (0902)", input: 2, output: 6, context: 1000000, reasoning: true, tier: "premium" },
  { id: "qwen/qwen3.8-flash", name: "Qwen: Qwen3.8 Flash", input: 0.15, output: 0.47, context: 1000000, reasoning: true, tier: "budget" },
  { id: "qwen/qwen3.8-27b", name: "Qwen: Qwen3.8 27B", input: 0.15, output: 1.88, context: 1024000, reasoning: true, tier: "standard" },
  { id: "qwen/qwen3.7-max", name: "Qwen: Qwen3.7 Max", input: 1.48, output: 4.43, context: 1000000, reasoning: true, tier: "standard" },
  { id: "qwen/qwen3.7-plus", name: "Qwen: Qwen3.7 Plus", input: 0.32, output: 1.28, context: 1000000, reasoning: true, tier: "standard" },
  { id: "qwen/qwen3.6-plus", name: "Qwen: Qwen3.6 Plus", input: 0.33, output: 1.95, context: 1000000, reasoning: true, tier: "standard" },
  { id: "qwen/qwen3.6-flash", name: "Qwen: Qwen3.6 Flash", input: 0.19, output: 1.13, context: 1000000, reasoning: true, tier: "standard" },
  { id: "qwen/qwen3.6-35b-a3b", name: "Qwen: Qwen3.6 35B A3B", input: 0.1, output: 0.9, context: 262144, reasoning: true, tier: "budget" },
  { id: "qwen/qwen3.5-flash-02-23", name: "Qwen: Qwen3.5-Flash", input: 0.07, output: 0.26, context: 1000000, reasoning: true, tier: "budget" },
  { id: "qwen/qwen3-235b-a22b-2507", name: "Qwen: Qwen3 235B A22B Instruct 2507", input: 0.09, output: 0.55, context: 262144, reasoning: false, tier: "budget" },
  { id: "mistralai/mistral-large-4-0", name: "Mistral: Mistral Large 4", input: 0.7, output: 2.1, context: 1048576, reasoning: true, tier: "standard" },
  { id: "mistralai/mistral-medium-3-5", name: "Mistral: Mistral Medium 3.5", input: 1.5, output: 7.5, context: 262144, reasoning: true, tier: "premium" },
  { id: "mistralai/mistral-small-2603", name: "Mistral: Mistral Small 4", input: 0.15, output: 0.6, context: 262144, reasoning: true, tier: "budget" },
  { id: "mistralai/mistral-large-2512", name: "Mistral: Mistral Large 3 2512", input: 0.5, output: 1.5, context: 262144, reasoning: false, tier: "standard" },
  { id: "mistralai/mistral-small-3.2-24b-instruct", name: "Mistral: Mistral Small 3.2 24B", input: 0.08, output: 0.2, context: 256000, reasoning: false, tier: "budget" },
  { id: "x-ai/grok-4.7", name: "SpaceXAI: Grok 4.7", input: 2, output: 6, context: 500000, reasoning: true, tier: "premium" },
  { id: "x-ai/grok-4.6", name: "SpaceXAI: Grok 4.6", input: 2, output: 6, context: 500000, reasoning: true, tier: "premium" },
  { id: "x-ai/grok-4.3", name: "SpaceXAI: Grok 4.3", input: 1.25, output: 2.5, context: 1000000, reasoning: true, tier: "standard" },
  { id: "x-ai/grok-4.20", name: "SpaceXAI: Grok 4.20", input: 1.25, output: 2.5, context: 2000000, reasoning: true, tier: "standard" },
  { id: "moonshotai/kimi-k3.1-pro", name: "MoonshotAI: Kimi K3.1 Pro", input: 2, output: 10, context: 1048576, reasoning: true, tier: "premium" },
  { id: "moonshotai/kimi-k3", name: "MoonshotAI: Kimi K3", input: 0.19, output: 15, context: 1048576, reasoning: true, tier: "premium" },
  { id: "moonshotai/kimi-k2.6", name: "MoonshotAI: Kimi K2.6", input: 0.65, output: 3.41, context: 262144, reasoning: true, tier: "standard" },
  { id: "z-ai/glm-5.3", name: "Z.ai: GLM 5.3", input: 0.08, output: 3.6, context: 1048576, reasoning: true, tier: "standard" },
  { id: "z-ai/glm-5.3-flash", name: "Z.ai: GLM 5.3 Flash", input: 0.03, output: 0.08, context: 1048576, reasoning: true, tier: "budget" },
  { id: "z-ai/glm-5.1", name: "Z.ai: GLM 5.1", input: 1.4, output: 4.4, context: 204800, reasoning: true, tier: "standard" },
  { id: "meta/muse-wonder", name: "Meta: Muse Wonder", input: 4, output: 20, context: 1048576, reasoning: true, tier: "premium" },
  { id: "meta/muse-spark-1.3", name: "Meta: Muse Spark 1.3", input: 1.25, output: 4.25, context: 1048576, reasoning: true, tier: "standard" },
  { id: "meta/muse-spark-open", name: "Meta: Muse Spark Open", input: 1.25, output: 4.25, context: 1048576, reasoning: true, tier: "standard" },
  { id: "meta-llama/llama-4-maverick", name: "Meta: Llama 4 Maverick", input: 0.19, output: 0.65, context: 524288, reasoning: false, tier: "budget" },
  { id: "meta-llama/llama-3.3-70b-instruct", name: "Meta: Llama 3.3 70B Instruct", input: 0.2, output: 0.52, context: 131072, reasoning: false, tier: "budget" },
  { id: "minimax/minimax-m3.1-flash", name: "MiniMax: MiniMax M3.1 Flash", input: 0.15, output: 0.6, context: 1048576, reasoning: true, tier: "budget" },
  { id: "minimax/minimax-m3", name: "MiniMax: MiniMax M3", input: 0.3, output: 1.2, context: 1048576, reasoning: true, tier: "standard" },
  { id: "xiaomi/mimo-v2.6-pro", name: "Xiaomi: MiMo-V2.6-Pro", input: 0.44, output: 0.87, context: 1050000, reasoning: true, tier: "budget" },
  { id: "xiaomi/mimo-v2.6-flash", name: "Xiaomi: MiMo-V2.6-Flash", input: 0.14, output: 0.28, context: 1050000, reasoning: true, tier: "budget" },
  { id: "nvidia/nemotron-3-ultra-550b-a55b", name: "NVIDIA: Nemotron 3 Ultra", input: 0.6, output: 2.4, context: 262144, reasoning: true, tier: "standard" },
  { id: "nvidia/nemotron-3-super-120b-a12b", name: "NVIDIA: Nemotron 3 Super", input: 0.3, output: 2.4, context: 1048576, reasoning: true, tier: "standard" },
  { id: "nvidia/nemotron-3.5-lightning", name: "NVIDIA: Nemotron 3.5 Lightning", input: 0.07, output: 0.2, context: 262144, reasoning: true, tier: "budget" },
  { id: "cohere/command-a-plus", name: "Cohere: Command A+", input: 0.3, output: 1.5, context: 192000, reasoning: true, tier: "standard" },
  { id: "bytedance-seed/seed-2-1-turbo", name: "ByteDance Seed: Seed 2.1 Turbo", input: 0.5, output: 2.5, context: 262144, reasoning: true, tier: "standard" },
  { id: "bytedance-seed/seed-2.0-mini", name: "ByteDance Seed: Seed-2.0-Mini", input: 0.1, output: 0.4, context: 262144, reasoning: true, tier: "budget" },
  { id: "inception/mercury-3", name: "Inception: Mercury 3", input: 0.1, output: 0.35, context: 1000000, reasoning: true, tier: "budget" },
  { id: "upstage/solar-pro4", name: "Upstage: Solar Pro 4", input: 0.15, output: 0.6, context: 524288, reasoning: true, tier: "budget" },
  { id: "tencent/hy3", name: "Tencent: Hy3", input: 0.13, output: 0.53, context: 262144, reasoning: true, tier: "budget" },
  { id: "stepfun/step-3.7-flash", name: "StepFun: Step 3.7 Flash", input: 0.2, output: 1.15, context: 262144, reasoning: true, tier: "standard" },
] as const satisfies readonly GoalModel[];

export type GoalModelId = (typeof GOAL_MODELS)[number]["id"];

/** The model goal suggestions use. Cheap, fast and good at following a schema. */
export const GOAL_MODEL: GoalModelId = "anthropic/claude-haiku-5.5";
