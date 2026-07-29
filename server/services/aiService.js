const fs = require('fs/promises');
const path = require('path');
const sharp = require('sharp');
const Anthropic = require('@anthropic-ai/sdk');
const OpenAI = require('openai');
const sessionStore = require('./sessionStore');

const MAX_IMAGE_BYTES = 4 * 1024 * 1024; // raw buffer cap — keeps base64 (~1.33x) safely under provider limits

function mimeFromExt(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.png') return 'image/png';
  if (ext === '.gif') return 'image/gif';
  if (ext === '.webp') return 'image/webp';
  return 'image/jpeg';
}

// Reads an image and, if it's large, resizes/recompresses it to JPEG so it
// stays under provider size limits. Small images pass through untouched.
async function fileToOptimizedImage(filePath) {
  const original = await fs.readFile(filePath);
  const ext = path.extname(filePath).toLowerCase();

  if (original.length <= MAX_IMAGE_BYTES && ['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(ext)) {
    return { base64: original.toString('base64'), mimeType: mimeFromExt(filePath) };
  }

  try {
    let quality = 85;
    const meta = await sharp(original).metadata();
    let pipeline = sharp(original).rotate(); // bake in EXIF orientation before resizing

    if (meta.width > 1568 || meta.height > 1568) {
      pipeline = pipeline.resize(1568, 1568, { fit: 'inside', withoutEnlargement: true });
    }

    let output = await pipeline.jpeg({ quality }).toBuffer();

    while (output.length > MAX_IMAGE_BYTES && quality > 30) {
      quality -= 15;
      output = await sharp(original)
        .rotate()
        .resize(1568, 1568, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality })
        .toBuffer();
    }

    return { base64: output.toString('base64'), mimeType: 'image/jpeg' };
  } catch (err) {
    console.error(`Error optimizing image ${filePath}, falling back to original:`, err.message);
    return { base64: original.toString('base64'), mimeType: mimeFromExt(filePath) };
  }
}

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
    content.push({ type: 'text', text: `\n\n--- Document: ${path.basename(filePath)} ---\n${text}` });
  }

  for (const imgPath of imageFiles) {
    try {
      const { base64, mimeType } = await fileToOptimizedImage(imgPath);
      content.push({ type: 'image', source: { type: 'base64', media_type: mimeType, data: base64 } });
    } catch (err) {
      console.error(`Error processing image ${imgPath}:`, err);
    }
  }

  const msg = await anthropic.messages.create({
    model: model || 'claude-sonnet-5',
    max_tokens: max_tokens || 4096,
    temperature: temperature ?? 0.3,
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
    userContent.push({ type: 'text', text: `\n\n[Document: ${path.basename(filePath)}]\n${text}` });
  }

  for (const imgPath of imageFiles) {
    try {
      const { base64, mimeType } = await fileToOptimizedImage(imgPath);
      userContent.push({ type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64}` } });
    } catch (err) {
      console.error(`Error processing image ${imgPath}:`, err);
    }
  }

  messages.push({ role: 'user', content: userContent });

  const completion = await openai.chat.completions.create({
    model: model || 'gpt-5',
    messages,
    temperature: temperature ?? 0.3,
    max_tokens: max_tokens || 4096,
  });

  return { content: completion.choices[0].message.content };
}

// ---------------------------------------------------------------
async function callGrok({ model, prompt, textFiles, imageFiles, temperature, max_tokens, metadata }) {
  const xai = new OpenAI({ apiKey: process.env.XAI_API_KEY, baseURL: 'https://api.x.ai/v1' });

  const messages = [
    { role: 'system', content: 'You are Grok — expert insurance analyst with deep knowledge of claims processing and risk assessment.' }
  ];

  const userContent = [{ type: 'text', text: prompt }];

  for (const filePath of textFiles) {
    const text = await extractTextFromFile(filePath);
    userContent.push({ type: 'text', text: `\n\n[File: ${path.basename(filePath)}]\n${text}` });
  }

  for (const imgPath of imageFiles) {
    try {
      const { base64, mimeType } = await fileToOptimizedImage(imgPath);
      userContent.push({ type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64}` } });
    } catch (err) {
      console.error(`Error processing image ${imgPath}:`, err);
    }
  }

  messages.push({ role: 'user', content: userContent });

  const completion = await xai.chat.completions.create({
    model: model || 'grok-4.5',
    messages,
    temperature: temperature ?? 0.3,
    max_tokens: max_tokens || 4096,
  });

  return { content: completion.choices[0].message.content };
}

// ---------------------------------------------------------------
async function callGemini({ model, prompt, textFiles, imageFiles, temperature, max_tokens, metadata }) {
  try {
    const { GoogleGenAI } = await import('@google/genai');
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY, apiVersion: 'v1beta' });

    const modelMap = {
      'gemini-1.5-pro': 'gemini-3.1-pro-preview',  
      'gemini-3-pro': 'gemini-3.1-pro-preview',
      'gemini-3-flash': 'gemini-3.5-flash',
      'gemini-2.5-pro': 'gemini-3.1-pro-preview',
      'gemini-3-flash-preview': 'gemini-3.5-flash',
      'gemini-3.1-pro-preview': 'gemini-3.1-pro-preview',
      'gemini-3.5-flash': 'gemini-3.5-flash',
    };
    const targetModel = modelMap[model] || 'gemini-3.5-flash';

    const parts = [{ text: prompt }];

    for (const filePath of textFiles) {
      const text = await extractTextFromFile(filePath);
      parts.push({ text: `\n\n[Document: ${path.basename(filePath)}]\n${text}` });
    }

    for (const imgPath of imageFiles) {
      try {
        const { base64, mimeType } = await fileToOptimizedImage(imgPath);
        parts.push({ inlineData: { mimeType, data: base64 } });
      } catch (err) {
        console.error(`Error processing image ${imgPath}:`, err);
      }
    }

    const result = await ai.models.generateContent({
      model: targetModel,
      contents: [{ role: 'user', parts }],
      config: { temperature: temperature ?? 0.3, maxOutputTokens: max_tokens || 4096, thinking: { level: 'high' } }
    });

    return { content: result.response.text() };
  } catch (error) {
    console.error('Gemini Service Error:', error);
    throw new Error(`Gemini API error: ${error.message}`);
  }
}

// ---------------------------------------------------------------
function formatTrainingExamples(trainingExamples) {
  if (!trainingExamples || trainingExamples.length === 0) return '';

  let trainingSection = '\n\n═══════════════════════════════════════════════════════════\n';
  trainingSection += '📚 REFERENCE EXAMPLES - LEARN FROM THESE REPORTS\n';
  trainingSection += '═══════════════════════════════════════════════════════════\n\n';
  trainingSection += `You have ${trainingExamples.length} reference report(s) to learn from. Study these carefully:\n\n`;
  trainingSection += '**CRITICAL INSTRUCTIONS:**\n';
  trainingSection += '1. Analyze the WRITING STYLE, TONE, and STRUCTURE of these reference reports\n';
  trainingSection += '2. Note the SPECIFIC TERMINOLOGY and PHRASING used\n';
  trainingSection += '3. Observe how sections are ORGANIZED and FORMATTED\n';
  trainingSection += '4. Pay attention to the LEVEL OF DETAIL provided\n';
  trainingSection += '5. MIMIC this exact style in your new report\n';
  trainingSection += '6. Match the PROFESSIONAL TONE and FORMALITY LEVEL\n';
  trainingSection += '7. Use SIMILAR SENTENCE STRUCTURES and PARAGRAPH LENGTH\n\n';

  trainingExamples.forEach((example, idx) => {
    trainingSection += `───────────────────────────────────────────────────────────\n`;
    trainingSection += `REFERENCE REPORT ${idx + 1}:\n`;
    trainingSection += `Title: ${example.filename}\n`;
    if (example.author) trainingSection += `Author: ${example.author}\n`;
    if (example.yearWritten) trainingSection += `Year: ${example.yearWritten}\n`;
    if (example.description) trainingSection += `Description: ${example.description}\n`;
    trainingSection += `───────────────────────────────────────────────────────────\n\n`;

    const contentPreview = example.textContent.substring(0, 15000);
    trainingSection += `${contentPreview}\n\n`;
    if (example.textContent.length > 15000) trainingSection += `[... Report continues ...]\n\n`;
  });

  trainingSection += '═══════════════════════════════════════════════════════════\n';
  trainingSection += 'END OF REFERENCE EXAMPLES\n';
  trainingSection += '═══════════════════════════════════════════════════════════\n\n';
  trainingSection += '**NOW CREATE YOUR REPORT:**\n';
  trainingSection += 'Using the EXACT SAME STYLE, TONE, and STRUCTURE as the reference reports above,\n';
  trainingSection += 'create a new report for the current claim. Match the writing style as closely as possible.\n\n';

  return trainingSection;
}

// ---------------------------------------------------------------
function buildScrutinyPrompt(metadata) {
  let focus = '';

  if (metadata.structuredHeadlines && metadata.structuredHeadlines.length > 0) {
    metadata.structuredHeadlines.forEach(h => {
      const mainHeadline = h.main.toUpperCase();
      if (mainHeadline.includes('THE INSURED')) {
        focus += `\n\n${h.main}:\nConduct an online search for "${metadata.insuredName}" and write a comprehensive 3-paragraph background covering the company's history, operations, industry standing, and any relevant business activities. Use reported speech (past tense) and write in essay format, not bullet points.`;
      } else if (mainHeadline.includes('POLICY TERMS') || mainHeadline.includes('POLICY CONDITIONS')) {
        focus += `\n\n${h.main}:\nCarefully review the Policy Document and any Endorsements provided. First, list all applicable Memos, Clauses, Warranties, Conditions, and Exclusions that are RELEVANT to this specific claim. Then, separately list those that are NOT relevant to this claim. Write in reported speech and essay format.`;
      } else if (mainHeadline.includes('INTERVIEW')) {
        focus += `\n\n${h.main}:\nDocument the interviews conducted. For each person interviewed, state their name, position, and a comprehensive summary of the conversation in reported speech (past tense). Write in paragraph form, not bullet points.`;
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
      if (h.subpoints && h.subpoints.length > 0) {
        h.subpoints.forEach(s => { focus += `\n  • ${s.title}`; });
      }
    });
  } else {
    focus = 'No specific focus areas provided — use standard scrutiny checklist';
  }

  const trainingSection = formatTrainingExamples(metadata.trainingExamples);

  return `
You are a senior insurance claims adjuster with 15+ years experience in ${metadata.classOfBusiness} insurance.

${trainingSection}

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
}

function buildPreliminaryPrompt(metadata) {
  const structure =
    metadata.structuredHeadlines?.map(h => {
      let section = `${h.number}. ${h.main}`;
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

${formatTrainingExamples(metadata.trainingExamples)}

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

${formatTrainingExamples(metadata.trainingExamples)}

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

// =================================================================
// NEW: LETTERHEAD REWRITE
// =================================================================

function buildLetterheadPrompt({ metadata, historyBlock, isFollowUp }) {
  const {
    instructions,
    insuredName,
    claimNumber,
    policyNumber,
    dateOfLoss,
    locationOfLoss,
    classOfBusiness,
  } = metadata;

  return `
You are a senior insurance claims adjuster producing an official report on the firm's letterhead.

${historyBlock}

TASK:
${isFollowUp
  ? 'This is a FOLLOW-UP request in an ongoing letterhead rewrite session. Use the prior context above (the letterhead template and the report you already produced) and apply the new instruction below. Return the FULL updated report, not just the changed part, unless the instruction explicitly asks for a fragment.'
  : `You have been given (1) an official letterhead template document/image, and (2) one or more field reports and supporting documents. Rewrite the field report content INTO the letterhead's structure, heading style, numbering convention, and formatting — matching its layout, section order, and formality as closely as the source material allows. Where the field report is missing information the letterhead format expects, note it as "[TO BE CONFIRMED]" rather than inventing facts.`}

CRITICAL WRITING REQUIREMENTS:
1. Match the letterhead's own structure and section headings — do not impose the standard Scrutiny/Preliminary/Final template unless the letterhead itself uses it.
2. Write in reported speech (past tense), essay format, no bullet points or markdown symbols in the final report body.
3. If photographs are provided, analyze each one and integrate relevant observations into the appropriate section (or a dedicated Photographs section if the letterhead has one) rather than just listing them.
4. Do not fabricate figures, names, or dates that are not present in the source documents.

Claim Reference Details (use only where they fit the letterhead's fields):
Claim Number: ${claimNumber || 'Not provided'}
Policy Number: ${policyNumber || 'Not provided'}
Insured: ${insuredName || 'Not provided'}
Date of Loss: ${dateOfLoss || 'Not provided'}
Location: ${locationOfLoss || 'Not provided'}
Class of Business: ${classOfBusiness || 'Not provided'}

USER INSTRUCTIONS FOR THIS REQUEST:
${instructions || 'No additional instructions — rewrite the field report faithfully into the letterhead format.'}

If anything about the letterhead format or the requested changes is ambiguous, end your response with a short "QUESTIONS FOR YOU:" section listing what you need clarified before finalizing — but still provide your best-effort full draft above it.
`;
}

/**
 * @param {object} params
 */
async function rewriteToLetterhead(params) {
  const {
    agent = 'claude',
    model,
    sessionId,
    letterheadFiles = [],
    letterheadImages = [],
    fieldReportFiles = [],
    policyFiles = [],
    endorsementFiles = [],
    additionalFiles = [],
    photoFiles = [],
    instructions = '',
    metadata = {},
    isFollowUp = false,
    temperature = 0.3,
    max_tokens = 4096,
  } = params;

  const resolvedSessionId = sessionId || sessionStore.makeSessionId(metadata.claimNumber);

  const historyBlock = sessionStore.formatHistoryForPrompt(resolvedSessionId, { tab: 'letterhead' });

  const prompt = buildLetterheadPrompt({
    metadata: { ...metadata, instructions },
    historyBlock,
    isFollowUp,
  });

  sessionStore.appendEntry(resolvedSessionId, {
    tab: 'letterhead',
    agent,
    role: 'user',
    prompt: instructions || '[initial letterhead rewrite request]',
  });

  const textFiles = [...letterheadFiles, ...fieldReportFiles, ...policyFiles, ...endorsementFiles, ...additionalFiles];
  const imageFiles = [...letterheadImages, ...photoFiles];

  const result = await callLLM({
    agent,
    model,
    prompt,
    textFiles,
    imageFiles,
    temperature,
    max_tokens,
    metadata,
  });

  sessionStore.appendEntry(resolvedSessionId, {
    tab: 'letterhead',
    agent,
    role: 'assistant',
    response: result.content,
  });

  return { ...result, sessionId: resolvedSessionId };
}

// =================================================================
// NEW: MULTI-AGENT COLLABORATION
// =================================================================

function buildCollaborationTurnPrompt({ basePrompt, agentLabel, priorTurns, roundNumber, totalRounds, historyBlock }) {
  let priorTurnsBlock = '';
  if (priorTurns.length > 0) {
    priorTurnsBlock = '\n\nRESPONSES SO FAR IN THIS DISCUSSION:\n';
    priorTurns.forEach(t => {
      priorTurnsBlock += `\n--- ${t.agentLabel} (round ${t.round}) ---\n${t.content}\n`;
    });
  }

  return `
You are ${agentLabel}, one of several AI adjusters collaborating on this claims task. This is round ${roundNumber} of ${totalRounds}.

${historyBlock}

TASK FROM THE USER:
${basePrompt}
${priorTurnsBlock}

INSTRUCTIONS:
- If this is round 1, give your own independent analysis/draft.
- If other agents have already responded this round or in earlier rounds, read their input above. Agree where you agree, but explicitly flag anything you think is wrong, incomplete, or worth reconsidering — don't just restate what's already been said.
- Keep your response focused; the goal is a better final answer, not a longer one.
- Write in reported speech, essay format, no bullet points in the substantive analysis (a short list is fine only for flagging disagreements).
`;
}

function buildSynthesisPrompt({ basePrompt, allTurns, historyBlock }) {
  let transcript = '';
  allTurns.forEach(t => {
    transcript += `\n--- ${t.agentLabel} (round ${t.round}) ---\n${t.content}\n`;
  });

  return `
You are producing the FINAL synthesized answer from a multi-agent collaboration.

${historyBlock}

ORIGINAL TASK:
${basePrompt}

FULL DISCUSSION TRANSCRIPT:
${transcript}

Produce one final, coherent report/answer that takes the best of each agent's contribution, resolves any disagreements with a clear rationale, and reads as a single unified document — not a summary of who said what. Write in reported speech, essay format, professional tone.
`;
}

const AGENT_LABELS = { claude: 'Claude', chatgpt: 'ChatGPT', grok: 'Grok', gemini: 'Gemini' };

/**
 * @param {object} params
 */
async function runCollaboration(params) {
  const {
    agents = ['claude', 'chatgpt'],
    discuss = false,
    rounds = 2,
    synthesizerAgent,
    prompt,
    textFiles = [],
    imageFiles = [],
    sessionId,
    metadata = {},
    temperature = 0.3,
    max_tokens = 4096,
  } = params;

  const resolvedSessionId = sessionId || sessionStore.makeSessionId(metadata.claimNumber);
  const historyBlock = sessionStore.formatHistoryForPrompt(resolvedSessionId, { tab: 'collaboration' });

  sessionStore.appendEntry(resolvedSessionId, {
    tab: 'collaboration',
    agent: 'collaboration',
    role: 'user',
    prompt,
    meta: { agents, discuss, rounds },
  });

  // ---- Mode 1: parallel, independent answers ----
  if (!discuss) {
    const results = await Promise.all(agents.map(async (agentKey) => {
      const turnPrompt = `${historyBlock}\n\nTASK:\n${prompt}`;
      const res = await callLLM({
        agent: agentKey,
        prompt: turnPrompt,
        textFiles,
        imageFiles,
        temperature,
        max_tokens,
        metadata,
      });
      return { agent: agentKey, agentLabel: AGENT_LABELS[agentKey] || agentKey, content: res.content };
    }));

    results.forEach(r => {
      sessionStore.appendEntry(resolvedSessionId, {
        tab: 'collaboration',
        agent: r.agent,
        role: 'assistant',
        response: r.content,
      });
    });

    return { mode: 'parallel', sessionId: resolvedSessionId, results };
  }

  // ---- Mode 2: sequential discussion + synthesis ----
  const allTurns = [];
  for (let round = 1; round <= rounds; round++) {
    for (const agentKey of agents) {
      const turnPrompt = buildCollaborationTurnPrompt({
        basePrompt: prompt,
        agentLabel: AGENT_LABELS[agentKey] || agentKey,
        priorTurns: allTurns,
        roundNumber: round,
        totalRounds: rounds,
        historyBlock,
      });

      const res = await callLLM({
        agent: agentKey,
        prompt: turnPrompt,
        textFiles,
        imageFiles,
        temperature,
        max_tokens,
        metadata,
      });

      const turn = { agent: agentKey, agentLabel: AGENT_LABELS[agentKey] || agentKey, round, content: res.content };
      allTurns.push(turn);

      sessionStore.appendEntry(resolvedSessionId, {
        tab: 'collaboration',
        agent: agentKey,
        role: 'assistant',
        response: res.content,
        meta: { round },
      });
    }
  }

  const finalAgent = synthesizerAgent || agents[0];
  const synthesisPrompt = buildSynthesisPrompt({ basePrompt: prompt, allTurns, historyBlock });
  const synthesisRes = await callLLM({
    agent: finalAgent,
    prompt: synthesisPrompt,
    textFiles,
    imageFiles,
    temperature,
    max_tokens,
    metadata,
  });

  sessionStore.appendEntry(resolvedSessionId, {
    tab: 'collaboration',
    agent: finalAgent,
    role: 'assistant',
    response: synthesisRes.content,
    meta: { synthesis: true },
  });

  return {
    mode: 'discussion',
    sessionId: resolvedSessionId,
    rounds: allTurns,
    synthesis: { agent: finalAgent, content: synthesisRes.content },
  };
}

// ---------------------------------------------------------------
module.exports = {
  callLLM,
  buildScrutinyPrompt,
  buildPreliminaryPrompt,
  buildFinalPrompt,
  extractTextFromFile,
  rewriteToLetterhead,
  runCollaboration,
  sessionStore,
};
