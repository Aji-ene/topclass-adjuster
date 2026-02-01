// services/llmService.js
const fs = require('fs').promises;
const path = require('path');
const Anthropic = require('@anthropic-ai/sdk');
const OpenAI = require('openai');
const { GoogleGenerativeAI } = require('@google/genai'); // official 2025+ unified SDK

// ---------------------------------------------------------------
// Helper: read text from common insurance/claims file types
// ---------------------------------------------------------------
async function extractTextFromFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();

  try {
    if (ext === '.txt') {
      return await fs.readFile(filePath, 'utf-8');
    }
    if (ext === '.pdf') {
      const pdfParse = require('pdf-parse');
      const dataBuffer = await fs.readFile(filePath);
      const data = await pdfParse(dataBuffer);
      return data.text;
    }
    if (['.doc', '.docx'].includes(ext)) {
      const mammoth = require('mammoth');
      const buffer = await fs.readFile(filePath);
      const result = await mammoth.extractRawText({ buffer });
      return result.value;
    }
    // fallback
    return `[File content not extracted — ${ext} file: ${path.basename(filePath)}]`;
  } catch (err) {
    console.warn(`Could not extract text from ${filePath}:`, err.message);
    return `[Error reading file: ${path.basename(filePath)}]`;
  }
}

// ---------------------------------------------------------------
// Helper: convert image to base64 (most APIs want this)
// ---------------------------------------------------------------
async function fileToBase64(filePath) {
  const buffer = await fs.readFile(filePath);
  return buffer.toString('base64');
}

// ---------------------------------------------------------------
// Main dispatcher
// ---------------------------------------------------------------
async function callLLM({ agent, model, prompt, textFiles, imageFiles, temperature, max_tokens }) {
  switch (agent) {
    case 'claude':
      return await callClaude({ model, prompt, textFiles, imageFiles, temperature, max_tokens });
    case 'chatgpt':
      return await callOpenAI({ model, prompt, textFiles, imageFiles, temperature, max_tokens });
    case 'grok':
      return await callGrok({ model, prompt, textFiles, imageFiles, temperature, max_tokens });
    case 'gemini':
      return await callGemini({ model, prompt, textFiles, imageFiles, temperature, max_tokens });
    default:
      throw new Error(`Unsupported agent: ${agent}`);
  }
}

// ---------------------------------------------------------------
async function callClaude({ model, prompt, textFiles, imageFiles, temperature, max_tokens }) {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const content = [];
  // System-like instruction
  content.push({ type: 'text', text: prompt });

  // Add document texts
  for (const filePath of textFiles) {
    const text = await extractTextFromFile(filePath);
    content.push({ type: 'text', text: `\n\n--- Document: \( {path.basename(filePath)} ---\n \){text}` });
  }

  // Add images (Claude supports base64)
  for (const imgPath of imageFiles) {
    const base64 = await fileToBase64(imgPath);
    const mime = path.extname(imgPath) === '.png' ? 'image/png' : 'image/jpeg';
    content.push({
      type: 'image',
      source: { type: 'base64', media_type: mime, data: base64 }
    });
  }

  const msg = await anthropic.messages.create({
    model,
    max_tokens,
    temperature,
    messages: [{ role: 'user', content }],
  });

  return { content: msg.content[0].text };
}

// ---------------------------------------------------------------
async function callOpenAI({ model, prompt, textFiles, imageFiles, temperature, max_tokens }) {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const messages = [{ role: 'system', content: 'You are an expert insurance claims adjuster.' }];
  const userContent = [];

  userContent.push({ type: 'text', text: prompt });

  for (const filePath of textFiles) {
    const text = await extractTextFromFile(filePath);
    userContent.push({ type: 'text', text: `\n\n[Document: \( {path.basename(filePath)}]\n \){text}` });
  }

  for (const imgPath of imageFiles) {
    const base64 = await fileToBase64(imgPath);
    const mime = path.extname(imgPath) === '.png' ? 'image/png' : 'image/jpeg';
    userContent.push({
      type: 'image_url',
      image_url: { url: `data:\( {mime};base64, \){base64}` }
    });
  }

  messages.push({ role: 'user', content: userContent });

  const completion = await openai.chat.completions.create({
    model,
    messages,
    temperature,
    max_tokens,
  });

  return { content: completion.choices[0].message.content };
}

// ---------------------------------------------------------------
async function callGrok({ model, prompt, textFiles, imageFiles, temperature, max_tokens }) {
  // xAI API is OpenAI-compatible → just change baseURL
  const xai = new OpenAI({
    apiKey: process.env.XAI_API_KEY,
    baseURL: 'https://api.x.ai/v1',
  });

  // Same structure as callOpenAI — Grok-4 family supports vision
  const messages = [{ role: 'system', content: 'You are Grok — expert insurance analyst with real-time knowledge.' }];
  const userContent = [{ type: 'text', text: prompt }];

  for (const filePath of textFiles) {
    const text = await extractTextFromFile(filePath);
    userContent.push({ type: 'text', text: `\n\n[File: \( {path.basename(filePath)}]\n \){text}` });
  }

  for (const imgPath of imageFiles) {
    const base64 = await fileToBase64(imgPath);
    const mime = path.extname(imgPath) === '.png' ? 'image/png' : 'image/jpeg';
    userContent.push({
      type: 'image_url',
      image_url: { url: `data:\( {mime};base64, \){base64}` }
    });
  }

  messages.push({ role: 'user', content: userContent });

  const completion = await xai.chat.completions.create({
    model,
    messages,
    temperature,
    max_tokens,
  });

  return { content: completion.choices[0].message.content };
}

// ---------------------------------------------------------------
async function callGemini({ model, prompt, textFiles, imageFiles, temperature, max_tokens }) {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const generativeModel = genAI.getGenerativeModel({ model });

  const parts = [{ text: prompt }];

  for (const filePath of textFiles) {
    const text = await extractTextFromFile(filePath);
    parts.push({ text: `\n\n--- \( {path.basename(filePath)} ---\n \){text}` });
  }

  for (const imgPath of imageFiles) {
    const base64 = await fileToBase64(imgPath);
    const mime = path.extname(imgPath) === '.png' ? 'image/png' : 'image/jpeg';
    parts.push({
      inlineData: {
        mimeType: mime,
        data: base64
      }
    });
  }

  const result = await generativeModel.generateContent({
    contents: [{ role: 'user', parts }],
    generationConfig: {
      temperature,
      maxOutputTokens: max_tokens
    }
  });

  return { content: result.response.text() };
}

// ---------------------------------------------------------------
// Prompt builders — customize heavily according to your needs
// ---------------------------------------------------------------
function buildScrutinyPrompt(metadata) {
  return `
You are a senior insurance claims adjuster with 15+ years experience.
Class of Business: ${metadata.classOfBusiness}

Perform detailed scrutiny / gap analysis of the attached Field Report.
Look for:
- inconsistencies in facts / timeline
- missing documents / photos / evidence
- policy coverage issues
- fraud red flags
- reserve adequacy concerns
- probing questions the insured / broker should answer

Claim: ${metadata.claimNumber} — ${metadata.insuredName}
Date of loss: ${metadata.dateOfLoss}
Location: ${metadata.locationOfLoss}

Brief loss description: ${metadata.lossDescription}

Focus areas:
${metadata.structuredHeadlines.map(h => `- ${h.main || ''} ${h.subpoints.map(s => `  • ${s.title}`).join('\n')}`).join('\n') || 'No specific focus areas provided — use standard scrutiny checklist'}

Structure your output as markdown with clear headings.
Be critical, professional, and evidence-based.
  `;
}

function buildPreliminaryPrompt(metadata) {
  return `
You are preparing a Preliminary / Interim claims report.
Class: ${metadata.classOfBusiness}

Use the attached documents (mainly Field Report + any additional files).
Claim: ${metadata.claimNumber} — Insured: ${metadata.insuredName}
DOL: ${metadata.dateOfLoss} @ ${metadata.locationOfLoss}

Summarise:
- Circumstances of loss
- Initial reserve recommendation
- Coverage position
- Next steps / outstanding requirements

Follow this structure:
\( {metadata.structuredHeadlines.map(h => ` \){h.number} \( {h.main}\n \){h.subpoints.map(s => `   ${s.number} ${s.title}`).join('\n')}`).join('\n') || 'Use standard preliminary report format'}

Output in professional markdown format.
  `;
}

function buildFinalPrompt(metadata) {
  return `
Prepare a comprehensive Final Adjustment Report.
Class of Business: ${metadata.classOfBusiness}

Incorporate:
- Field report
- Policy wording (attached)
- Endorsements (if any)
- Additional / supporting documents

Claim details:
${metadata.claimNumber} — ${metadata.insuredName}
Loss: ${metadata.dateOfLoss} — ${metadata.locationOfLoss}
Description: ${metadata.lossDescription}

Coverage analysis, quantum calculation, recommended settlement, deductibles, subrogation potential, etc.

Strictly follow this report arrangement:
\( {metadata.structuredHeadlines.map(h => ` \){h.number} \( {h.main}\n \){h.subpoints.map(s => `   ${s.number} ${s.title}`).join('\n')}`).join('\n') || 'Standard final report structure'}

Output clean, professional markdown suitable for insured / reinsurer / file.
  `;
}

module.exports = {
  callLLM,
  buildScrutinyPrompt,
  buildPreliminaryPrompt,
  buildFinalPrompt,
};