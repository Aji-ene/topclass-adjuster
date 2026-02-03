// services/llmService.js
const fs = require('fs/promises');
const path = require('path');
const Anthropic = require('@anthropic-ai/sdk');
const OpenAI = require('openai');

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
    return `[File content not extracted — ${ext} file: ${path.basename(filePath)}]`;
  } catch (err) {
    console.warn(`Could not extract text from ${filePath}:`, err.message);
    return `[Error reading file: ${path.basename(filePath)}]`;
  }
}

// ---------------------------------------------------------------
async function fileToBase64(filePath) {
  const buffer = await fs.readFile(filePath);
  return buffer.toString('base64');
}

// ---------------------------------------------------------------
async function callLLM({ agent, model, prompt, textFiles = [], imageFiles = [], temperature, max_tokens }) {
  switch (agent) {
    case 'claude':
      return callClaude({ model, prompt, textFiles, imageFiles, temperature, max_tokens });
    case 'chatgpt':
      return callOpenAI({ model, prompt, textFiles, imageFiles, temperature, max_tokens });
    case 'grok':
      return callGrok({ model, prompt, textFiles, imageFiles, temperature, max_tokens });
    case 'gemini':
      return callGemini({ model, prompt, textFiles, imageFiles, temperature, max_tokens });
    default:
      throw new Error(`Unsupported agent: ${agent}`);
  }
}

// ---------------------------------------------------------------
async function callClaude({ model, prompt, textFiles, imageFiles, temperature, max_tokens }) {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const content = [{ type: 'text', text: prompt }];

  for (const filePath of textFiles) {
    const text = await extractTextFromFile(filePath);
    content.push({
      type: 'text',
      text: `\n\n--- Document: ${path.basename(filePath)} ---\n${text}`
    });
  }

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

  const messages = [
    { role: 'system', content: 'You are an expert insurance claims adjuster.' }
  ];

  const userContent = [{ type: 'text', text: prompt }];

  for (const filePath of textFiles) {
    const text = await extractTextFromFile(filePath);
    userContent.push({
      type: 'text',
      text: `\n\n[Document: ${path.basename(filePath)}]\n${text}`
    });
  }

  for (const imgPath of imageFiles) {
    const base64 = await fileToBase64(imgPath);
    const mime = path.extname(imgPath) === '.png' ? 'image/png' : 'image/jpeg';
    userContent.push({
      type: 'image_url',
      image_url: { url: `data:${mime};base64,${base64}` }
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
  const xai = new OpenAI({
    apiKey: process.env.XAI_API_KEY,
    baseURL: 'https://api.x.ai/v1',
  });

  const messages = [
    { role: 'system', content: 'You are Grok — expert insurance analyst.' }
  ];

  const userContent = [{ type: 'text', text: prompt }];

  for (const filePath of textFiles) {
    const text = await extractTextFromFile(filePath);
    userContent.push({
      type: 'text',
      text: `\n\n[File: ${path.basename(filePath)}]\n${text}`
    });
  }

  for (const imgPath of imageFiles) {
    const base64 = await fileToBase64(imgPath);
    const mime = path.extname(imgPath) === '.png' ? 'image/png' : 'image/jpeg';
    userContent.push({
      type: 'image_url',
      image_url: { url: `data:${mime};base64,${base64}` }
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
  try {
    // 1. New SDK Import (2026 Unified Client)
    const { CreateClient } = await import('@google/genai');
    
    // The new client handles versioning (v1/v1beta) automatically
    const client = CreateClient({ 
      apiKey: process.env.GEMINI_API_KEY 
    });

    // 2. Modern Model Mapping
    // Maps your existing input strings to the 2026 production models
    const modelMap = {
      'gemini-1.5-pro': 'gemini-3-pro',
      'gemini-1.5-flash': 'gemini-3-flash',
      'gemini-3-pro': 'gemini-3-pro',
      'gemini-3-flash': 'gemini-3-flash'
    };

    const targetModel = modelMap[model] || 'gemini-3-flash';

    // 3. Prepare Content Parts
    const parts = [{ text: prompt }];

    // Attach Text Data
    for (const filePath of textFiles) {
      const text = await extractTextFromFile(filePath);
      parts.push({
        text: `\n\n--- Document: ${path.basename(filePath)} ---\n${text}`
      });
    }

    // Attach Image Data
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

    // 4. Execute Generation
    // Note: The new SDK uses 'config' rather than 'generationConfig'
    const result = await client.models.generateContent({
      model: targetModel,
      contents: [{ role: 'user', parts }],
      config: { 
        temperature: temperature || 0.7, 
        maxOutputTokens: max_tokens || 4096 
      }
    });

    return { content: result.response.text() };

  } catch (error) {
    console.error('Gemini Service Error:', error);
    
    // Error handling for common 2026 API issues
    if (error.message.includes('quota')) {
      throw new Error('Gemini API quota exceeded. Please check your billing tier.');
    }
    
    throw new Error(`Gemini API error: ${error.message}`);
  }
}



// ---------------------------------------------------------------
// Prompt builders
// ---------------------------------------------------------------
function buildScrutinyPrompt(metadata) {
  const focus =
    metadata.structuredHeadlines?.map(h =>
      `- ${h.main}\n${h.subpoints.map(s => `  • ${s.title}`).join('\n')}`
    ).join('\n') || 'No specific focus areas provided — use standard scrutiny checklist';

  return `
You are a senior insurance claims adjuster with 15+ years experience.
Class of Business: ${metadata.classOfBusiness}

Claim: ${metadata.claimNumber} — ${metadata.insuredName}
Date of Loss: ${metadata.dateOfLoss}
Location: ${metadata.locationOfLoss}

Loss description:
${metadata.lossDescription}

Focus areas:
${focus}

Provide a professional, critical markdown report.
`;
}

function buildPreliminaryPrompt(metadata) {
  const structure =
    metadata.structuredHeadlines?.map(h =>
      `${h.number}. ${h.main}\n${h.subpoints.map(s => `   ${s.number} ${s.title}`).join('\n')}`
    ).join('\n') || 'Use standard preliminary report format';

  return `
Prepare a Preliminary / Interim Claims Report.

Claim: ${metadata.claimNumber}
Insured: ${metadata.insuredName}
Class: ${metadata.classOfBusiness}
Date & Location of Loss: ${metadata.dateOfLoss} @ ${metadata.locationOfLoss}

Follow this structure:
${structure}

Output professional markdown.
`;
}

function buildFinalPrompt(metadata) {
  const structure =
    metadata.structuredHeadlines?.map(h =>
      `${h.number}. ${h.main}\n${h.subpoints.map(s => `   ${s.number} ${s.title}`).join('\n')}`
    ).join('\n') || 'Standard final report structure';

  return `
Prepare a Final Adjustment Report.

Claim: ${metadata.claimNumber}
Insured: ${metadata.insuredName}
Class: ${metadata.classOfBusiness}
Loss: ${metadata.dateOfLoss} — ${metadata.locationOfLoss}

Strictly follow this structure:
${structure}

Produce clean, professional markdown suitable for file and reinsurers.
`;
}

// ---------------------------------------------------------------
// Export all functions
module.exports = {
  callLLM,
  buildScrutinyPrompt,
  buildPreliminaryPrompt,
  buildFinalPrompt
};