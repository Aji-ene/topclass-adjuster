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
async function callLLM({ agent, model, prompt, textFiles = [], imageFiles = [], temperature, max_tokens, metadata }) {
  switch (agent) {
    case 'claude':
      return callClaude({ model, prompt, textFiles, imageFiles, temperature, max_tokens, metadata });
    case 'chatgpt':
      return callOpenAI({ model, prompt, textFiles, imageFiles, temperature, max_tokens, metadata });
    case 'grok':
      return callGrok({ model, prompt, textFiles, imageFiles, temperature, max_tokens, metadata });
    case 'gemini':
      return callGemini({ model, prompt, textFiles, imageFiles, temperature, max_tokens, metadata });
    default:
      throw new Error(`Unsupported agent: ${agent}`);
  }
}

// ---------------------------------------------------------------
async function callClaude({ model, prompt, textFiles, imageFiles, temperature, max_tokens, metadata }) {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const content = [{ type: 'text', text: prompt }];

  for (const filePath of textFiles) {
    const text = await extractTextFromFile(filePath);
    content.push({
      type: 'text',
      text: `\n\n--- Document: ${path.basename(filePath)} ---\n${text}`
    });
  }

  // FIX: Process images properly
  for (const imgPath of imageFiles) {
    try {
      const base64 = await fileToBase64(imgPath);
      const ext = path.extname(imgPath).toLowerCase();
      let mime = 'image/jpeg';
      
      if (ext === '.png') mime = 'image/png';
      else if (ext === '.gif') mime = 'image/gif';
      else if (ext === '.webp') mime = 'image/webp';
      
      content.push({
        type: 'image',
        source: { type: 'base64', media_type: mime, data: base64 }
      });
    } catch (err) {
      console.error(`Error processing image ${imgPath}:`, err);
    }
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
async function callOpenAI({ model, prompt, textFiles, imageFiles, temperature, max_tokens, metadata }) {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const messages = [
    { role: 'system', content: 'You are an expert insurance claims adjuster with extensive experience in analyzing claims and writing professional reports.' }
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
    try {
      const base64 = await fileToBase64(imgPath);
      const ext = path.extname(imgPath).toLowerCase();
      let mime = 'image/jpeg';
      
      if (ext === '.png') mime = 'image/png';
      else if (ext === '.gif') mime = 'image/gif';
      else if (ext === '.webp') mime = 'image/webp';
      
      userContent.push({
        type: 'image_url',
        image_url: { url: `data:${mime};base64,${base64}` }
      });
    } catch (err) {
      console.error(`Error processing image ${imgPath}:`, err);
    }
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
async function callGrok({ model, prompt, textFiles, imageFiles, temperature, max_tokens, metadata }) {
  const xai = new OpenAI({
    apiKey: process.env.XAI_API_KEY,
    baseURL: 'https://api.x.ai/v1',
  });

  const messages = [
    { role: 'system', content: 'You are Grok — expert insurance analyst with deep knowledge of claims processing and risk assessment.' }
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
    try {
      const base64 = await fileToBase64(imgPath);
      const ext = path.extname(imgPath).toLowerCase();
      let mime = 'image/jpeg';
      
      if (ext === '.png') mime = 'image/png';
      else if (ext === '.gif') mime = 'image/gif';
      else if (ext === '.webp') mime = 'image/webp';
      
      userContent.push({
        type: 'image_url',
        image_url: { url: `data:${mime};base64,${base64}` }
      });
    } catch (err) {
      console.error(`Error processing image ${imgPath}:`, err);
    }
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
async function callGemini({ model, prompt, textFiles, imageFiles, temperature, max_tokens, metadata }) {
  try {
    const { GoogleGenAI } = await import('@google/genai');

    const ai = new GoogleGenAI({ 
      apiKey: process.env.GEMINI_API_KEY,
      apiVersion: 'v1beta' 
    });

    const modelMap = {
      'gemini-1.5-pro': 'gemini-2.5-pro',
      'gemini-3-pro': 'gemini-3-pro-preview',
      'gemini-3-flash': 'gemini-3-flash-preview',
      'gemini-2.5-pro': 'gemini-2.5-pro',
      'gemini-3-flash-preview': 'gemini-3-flash-preview',
    };

    const targetModel = modelMap[model] || 'gemini-3-flash-preview';

    const parts = [{ text: prompt }];

    for (const filePath of textFiles) {
      const text = await extractTextFromFile(filePath);
      parts.push({ text: `\n\n[Document: ${path.basename(filePath)}]\n${text}` });
    }

    for (const imgPath of imageFiles) {
      try {
        const base64 = await fileToBase64(imgPath);
        const ext = path.extname(imgPath).toLowerCase();
        let mime = 'image/jpeg';
        
        if (ext === '.png') mime = 'image/png';
        else if (ext === '.gif') mime = 'image/gif';
        else if (ext === '.webp') mime = 'image/webp';
        
        parts.push({ inlineData: { mimeType: mime, data: base64 } });
      } catch (err) {
        console.error(`Error processing image ${imgPath}:`, err);
      }
    }

    const result = await ai.models.generateContent({
      model: targetModel,
      contents: [{ role: 'user', parts }],
      config: { 
        temperature: temperature || 0.7, 
        maxOutputTokens: max_tokens || 4096,
        thinking: { level: 'high' } 
      }
    });

    return { content: result.response.text() };

  } catch (error) {
    console.error('Gemini Service Error:', error);
    throw new Error(`Gemini API error: ${error.message}`);
  }
}

// ---------------------------------------------------------------
// Prompt builders
// ---------------------------------------------------------------
function buildScrutinyPrompt(metadata) {
  let focus = '';
  
  // Check if user has structured headlines
  if (metadata.structuredHeadlines && metadata.structuredHeadlines.length > 0) {
    metadata.structuredHeadlines.forEach(h => {
      const mainHeadline = h.main.toUpperCase();
      
      // Handle special focus areas
      if (mainHeadline.includes('THE INSURED')) {
        focus += `\n\n${h.main}:\nConduct an online search for "${metadata.insuredName}" and write a comprehensive 3-paragraph background covering the company's history, operations, industry standing, and any relevant business activities. Use reported speech (past tense) and write in essay format, not bullet points.`;
      } else if (mainHeadline.includes('POLICY TERMS') || mainHeadline.includes('POLICY CONDITIONS')) {
        focus += `\n\n${h.main}:\nCarefully review the Policy Document and any Endorsements provided. First, list all applicable Memos, Clauses, Warranties, Conditions, and Exclusions that are RELEVANT to this specific claim. Then, separately list those that are NOT relevant to this claim. Write in reported speech and essay format.`;
      } else if (mainHeadline.includes('INTERVIEW')) {
        focus += `\n\n${h.main}:\nDocument the interviews conducted. For each person interviewed, state their name, position, and a comprehensive summary of the conversation in reported speech (past tense). Write in paragraph form, not bullet points.`;
        
        // Add interview data if provided
        if (metadata.interviews && metadata.interviews.length > 0) {
          focus += '\n\nInterviews conducted:';
          metadata.interviews.forEach(interview => {
            if (interview.name || interview.conversation) {
              focus += `\n- ${interview.name}: ${interview.conversation}`;
            }
          });
        }
      } else {
        focus += `\n- ${h.main}`;
      }
      
      // Add subpoints
      if (h.subpoints && h.subpoints.length > 0) {
        h.subpoints.forEach(s => {
          focus += `\n  • ${s.title}`;
        });
      }
    });
  } else {
    focus = 'No specific focus areas provided — use standard scrutiny checklist';
  }

  let prompt = `
You are a senior insurance claims adjuster with 15+ years experience in ${metadata.classOfBusiness} insurance.

CRITICAL WRITING REQUIREMENTS:
1. Write ENTIRELY in reported speech (past tense)
2. Use essay format with flowing paragraphs - NO bullet points, NO asterisks, NO hashtags
3. Write in natural, human language - avoid AI-style formatting
4. Be professional but conversational in tone
5. Use proper paragraph structure with topic sentences and supporting details

Claim Details:
Claim Number: ${metadata.claimNumber}
Policy Number: ${metadata.policyNumber}
Insured: ${metadata.insuredName}
Date of Loss: ${metadata.dateOfLoss}
Location: ${metadata.locationOfLoss}
Class of Business: ${metadata.classOfBusiness}

Loss Description:
${metadata.lossDescription}

Focus areas for scrutiny:
${focus}

PHOTOGRAPHS SECTION:
Review all uploaded photographs carefully. In a dedicated "PHOTOGRAPHS" section at the end of your report, describe each photograph in detail, explaining what it shows, its relevance to the claim, and any observations about the damage or evidence depicted. Write in reported speech.

${metadata.customPrompt ? `\nADDITIONAL ANALYSIS REQUIRED:\n${metadata.customPrompt}\n` : ''}

RISK MITIGATION ANALYSIS:
At the end of the report, include a comprehensive "RISK IMPROVEMENT AND MITIGATION" section that analyzes this claim and provides recommendations on how to prevent similar incidents in the future. Consider industry best practices, safety measures, policy recommendations, and operational improvements.

Remember: Write everything in reported speech (past tense), use essay format with paragraphs, avoid all bullet points and AI-style formatting.
`;

  return prompt;
}

function buildPreliminaryPrompt(metadata) {
  const structure =
    metadata.structuredHeadlines?.map(h => {
      let section = `${h.number}. ${h.main}`;
      
      // Handle special sections
      const mainHeadline = h.main.toUpperCase();
      if (mainHeadline.includes('THE INSURED')) {
        section += '\n   Conduct online research and write 3 comprehensive paragraphs about the insured entity.';
      } else if (mainHeadline.includes('POLICY TERMS') || mainHeadline.includes('POLICY CONDITIONS')) {
        section += '\n   Review policy documents and categorize applicable clauses, exclusions, and conditions.';
      } else if (mainHeadline.includes('INTERVIEW')) {
        section += '\n   Document all interviews in reported speech with names and detailed conversation summaries.';
      }
      
      if (h.subpoints && h.subpoints.length > 0) {
        section += '\n' + h.subpoints.map(s => `   ${s.number} ${s.title}`).join('\n');
      }
      
      return section;
    }).join('\n') || 'Use standard preliminary report format';

  return `
You are preparing a Preliminary / Interim Claims Report for ${metadata.classOfBusiness} insurance.

CRITICAL WRITING REQUIREMENTS:
1. Write ENTIRELY in reported speech (past tense)
2. Use essay format with flowing paragraphs - NO bullet points, NO asterisks, NO hashtags
3. Write in natural, human language - avoid AI-style formatting
4. Be professional but conversational in tone

Claim Information:
Claim Number: ${metadata.claimNumber}
Policy Number: ${metadata.policyNumber}
Insured: ${metadata.insuredName}
Date of Loss: ${metadata.dateOfLoss}
Location: ${metadata.locationOfLoss}
Class of Business: ${metadata.classOfBusiness}

Report Structure:
${structure}

PHOTOGRAPHS SECTION:
Review and describe all uploaded photographs in detail, explaining their relevance to the claim.

RISK IMPROVEMENT AND MITIGATION:
Include a final section analyzing how to prevent similar incidents, with specific recommendations for risk reduction.

Write everything in reported speech (past tense) using essay format. Avoid bullet points and AI-style formatting.
`;
}

function buildFinalPrompt(metadata) {
  const structure =
    metadata.structuredHeadlines?.map(h => {
      let section = `${h.number}. ${h.main}`;
      
      const mainHeadline = h.main.toUpperCase();
      if (mainHeadline.includes('THE INSURED')) {
        section += '\n   Research and write 3 comprehensive paragraphs about the insured.';
      } else if (mainHeadline.includes('POLICY TERMS') || mainHeadline.includes('POLICY CONDITIONS')) {
        section += '\n   Analyze policy documents thoroughly, listing applicable and non-applicable clauses.';
      } else if (mainHeadline.includes('INTERVIEW')) {
        section += '\n   Document interviews comprehensively in reported speech.';
      }
      
      if (h.subpoints && h.subpoints.length > 0) {
        section += '\n' + h.subpoints.map(s => `   ${s.number} ${s.title}`).join('\n');
      }
      
      return section;
    }).join('\n') || 'Standard final report structure';

  return `
You are preparing a Final Adjustment Report for ${metadata.classOfBusiness} insurance.

CRITICAL WRITING REQUIREMENTS:
1. Write ENTIRELY in reported speech (past tense)
2. Use essay format with flowing paragraphs - NO bullet points, NO asterisks, NO hashtags
3. Write in natural, human language - avoid AI-style formatting
4. Maintain professional but conversational tone throughout

Claim Information:
Claim Number: ${metadata.claimNumber}
Policy Number: ${metadata.policyNumber}
Insured: ${metadata.insuredName}
Date of Loss: ${metadata.dateOfLoss}
Location: ${metadata.locationOfLoss}
Class of Business: ${metadata.classOfBusiness}

Report Structure:
${structure}

PHOTOGRAPHS SECTION:
Provide detailed descriptions of all photographs, explaining what they show and their significance to the claim.

RISK IMPROVEMENT AND MITIGATION:
Conclude with a comprehensive analysis of preventive measures and recommendations to avoid similar incidents in the future. Consider industry standards, safety protocols, and operational improvements.

This is a final report for insurers and reinsurers. Write everything in reported speech (past tense) using essay format. Avoid all bullet points and AI-style formatting.
`;
}

// ---------------------------------------------------------------
module.exports = {
  callLLM,
  buildScrutinyPrompt,
  buildPreliminaryPrompt,
  buildFinalPrompt
};
