// services/anthropicClient.js
//
// Single shared Anthropic client for the whole app. Every file that talks
// to Claude should import THIS instead of doing `new Anthropic(...)`
// itself. The wrapper strips temperature/top_p/top_k unconditionally
// before the request goes out, so it's structurally impossible for any
// call site — present or future — to trigger the
// "`temperature` is deprecated for this model" 400 again, regardless of
// whether that call site remembers to omit the field.
//
// If you genuinely need sampling control for an OLDER Claude model that
// still accepts it, call the raw SDK directly for that one case instead
// of using this wrapper — don't remove the strip below, since the newer
// models (Sonnet 5, Opus 4.8+) reject the field outright.

const Anthropic = require('@anthropic-ai/sdk');

const DEPRECATED_SAMPLING_PARAMS = ['temperature', 'top_p', 'top_k'];

const rawClient = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function stripDeprecatedParams(params) {
  const clean = { ...params };
  for (const key of DEPRECATED_SAMPLING_PARAMS) {
    if (key in clean) {
      delete clean[key];
    }
  }
  return clean;
}

const anthropicClient = {
  messages: {
    create: (params) => rawClient.messages.create(stripDeprecatedParams(params)),
    stream: (params) => rawClient.messages.stream(stripDeprecatedParams(params)),
  },
};

module.exports = anthropicClient;

/*
Usage — replace this pattern everywhere it appears:

  const Anthropic = require('@anthropic-ai/sdk');
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  ...
  await anthropic.messages.create({ model, max_tokens, temperature, messages });

with:

  const anthropic = require('./anthropicClient'); // adjust relative path
  ...
  await anthropic.messages.create({ model, max_tokens, temperature, messages });
  // ^ temperature can stay in the call now — the wrapper drops it before
  //   it reaches Anthropic, so old code that hasn't been updated yet is
  //   also covered, not just new code.

In services/llmService.js specifically, change:
  const Anthropic = require('@anthropic-ai/sdk');
  ...
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
to:
  const anthropic = require('./anthropicClient');
(and delete the `new Anthropic(...)` line inside callClaude — the shared
client is already instantiated once at module load).
*/
