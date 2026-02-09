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
  try {
    const buffer = await fs.readFile(filePath);
    return buffer.toString('base64');
  } catch (err) {
    console.error(`Error reading file for base64: ${filePath}`, err.message);
    return '';
  }
}

// ---------------------------------------------------------------
async function callLLM({ agent, model, prompt, textFiles = [], imageFiles = [], temperature, max_tokens }) {
  console.log(`Calling ${agent} with ${textFiles.length} text files and ${imageFiles.length} images`);
  
  // Validate files exist
  for (const file of [...textFiles, ...imageFiles]) {
    try {
      await fs.access(file);
    } catch (err) {
      console.error(`File not found: ${file}`);
      throw new Error(`File not found: ${path.basename(file)}`);
    }
  }

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

  // Add text files
  for (const filePath of textFiles) {
    const text = await extractTextFromFile(filePath);
    content.push({
      type: 'text',
      text: `\n\n--- Document: ${path.basename(filePath)} ---\n${text}`
    });
  }

  // Add images
  for (const imgPath of imageFiles) {
    const base64 = await fileToBase64(imgPath);
    if (base64) {
      const mime = path.extname(imgPath).toLowerCase() === '.png' ? 'image/png' : 'image/jpeg';
      content.push({
        type: 'image',
        source: { type: 'base64', media_type: mime, data: base64 }
      });
    }
  }

  try {
    const msg = await anthropic.messages.create({
      model,
      max_tokens,
      temperature,
      messages: [{ role: 'user', content }],
    });

    return { content: msg.content[0].text };
  } catch (err) {
    console.error('Claude API error:', err);
    throw new Error(`Claude API error: ${err.message}`);
  }
}

// ---------------------------------------------------------------
async function callOpenAI({ model, prompt, textFiles, imageFiles, temperature, max_tokens }) {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const messages = [
    { 
      role: 'system', 
      content: `You are an expert insurance claims adjuster with 15+ years experience. 
      Write in reported speech (past tense) and essay format. 
      Avoid bullet points, asterisks, hashtags, and other AI-style formatting. 
      Use professional human language suitable for insurance reports. 
      Follow these formatting guidelines:
      1. Font: Times New Roman
      2. Font Size: 12
      3. Line Spacing: 1.5
      4. Style: Normal essay format
      
      Structure your response with clear paragraphs and headings.
      Include a table at the beginning with claim metadata (use HTML table with invisible borders).
      Focus on comprehensive analysis in human-readable language.` 
    }
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
    if (base64) {
      const mime = path.extname(imgPath).toLowerCase() === '.png' ? 'image/png' : 'image/jpeg';
      userContent.push({
        type: 'image_url',
        image_url: { url: `data:${mime};base64,${base64}` }
      });
    }
  }

  messages.push({ role: 'user', content: userContent });

  try {
    const completion = await openai.chat.completions.create({
      model,
      messages,
      temperature,
      max_tokens,
    });

    return { content: completion.choices[0].message.content };
  } catch (err) {
    console.error('OpenAI API error:', err);
    throw new Error(`OpenAI API error: ${err.message}`);
  }
}

// ---------------------------------------------------------------
async function callGrok({ model, prompt, textFiles, imageFiles, temperature, max_tokens }) {
  const xai = new OpenAI({
    apiKey: process.env.XAI_API_KEY,
    baseURL: 'https://api.x.ai/v1',
  });

  const messages = [
    { 
      role: 'system', 
      content: `You are Grok — expert insurance analyst. 
      Write in professional reported speech using past tense. 
      Use essay format with paragraphs, avoiding bullet points and markdown. 
      Formatting requirements:
      - Times New Roman font, size 12
      - 1.5 line spacing
      - Normal essay style
      - Include metadata table at beginning
      Focus on clear, human-readable language suitable for insurance documentation.` 
    }
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
    if (base64) {
      const mime = path.extname(imgPath).toLowerCase() === '.png' ? 'image/png' : 'image/jpeg';
      userContent.push({
        type: 'image_url',
        image_url: { url: `data:${mime};base64,${base64}` }
      });
    }
  }

  messages.push({ role: 'user', content: userContent });

  try {
    const completion = await xai.chat.completions.create({
      model,
      messages,
      temperature,
      max_tokens,
    });

    return { content: completion.choices[0].message.content };
  } catch (err) {
    console.error('Grok API error:', err);
    throw new Error(`Grok API error: ${err.message}`);
  }
}

// ---------------------------------------------------------------
async function callGemini({ model, prompt, textFiles, imageFiles, temperature, max_tokens }) {
  try {
    // Import the Google Generative AI package
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    
    // Model mapping for Gemini
    const modelMap = {
      'gemini-1.5-pro': 'gemini-1.5-pro',
      'gemini-1.5-flash': 'gemini-1.5-flash',
    };
    
    const targetModel = modelMap[model] || 'gemini-1.5-flash';
    
    const genModel = genAI.getGenerativeModel({ 
      model: targetModel,
      systemInstruction: `You are an expert insurance claims adjuster with 15+ years experience.
      Write in reported speech (past tense) and essay format.
      Avoid bullet points, asterisks, hashtags, and other AI-style formatting.
      Use professional human language suitable for insurance reports.
      Formatting requirements:
      1. Font: Times New Roman, Size: 12, Line Spacing: 1.5
      2. Style: Normal essay format with paragraphs
      3. Include metadata table at beginning (HTML table with invisible borders)
      4. Focus on comprehensive analysis in human-readable language.`,
      generationConfig: {
        temperature: temperature || 0.7,
        maxOutputTokens: max_tokens || 4096,
      },
    });
    
    // Prepare content
    let fullPrompt = prompt;
    
    // Add text files
    for (const filePath of textFiles) {
      const text = await extractTextFromFile(filePath);
      fullPrompt += `\n\n[Document: ${path.basename(filePath)}]\n${text}`;
    }
    
    // Prepare images if any
    const imageParts = [];
    for (const imgPath of imageFiles) {
      const base64 = await fileToBase64(imgPath);
      if (base64) {
        const mime = path.extname(imgPath).toLowerCase() === '.png' ? 'image/png' : 'image/jpeg';
        imageParts.push({
          inlineData: {
            mimeType: mime,
            data: base64
          }
        });
      }
    }
    
    // For Gemini, we need to structure the prompt with images
    let result;
    if (imageParts.length > 0) {
      result = await genModel.generateContent([
        { 
          text: fullPrompt 
        },
        ...imageParts
      ]);
    } else {
      result = await genModel.generateContent([
        fullPrompt
      ]);
    }
    
    return { content: result.response.text() };
    
  } catch (error) {
    console.error('Gemini Service Error:', error);
    throw new Error(`Gemini API error: ${error.message}`);
  }
}

// ---------------------------------------------------------------
// Enhanced Prompt Builders
// ---------------------------------------------------------------
function buildScrutinyPrompt(metadata) {
  // Base formatting instructions
  let prompt = `
CRITICAL FORMATTING INSTRUCTIONS:
1. Write in REPORTED SPEECH (past tense) - e.g., "The adjuster visited", "Documents were reviewed"
2. Use ESSAY FORMAT with paragraphs - NO bullet points, NO asterisks, NO hashtags
3. Use professional, human language - avoid AI-style formatting
4. Font: Times New Roman, Size: 12pt, Line Spacing: 1.5
5. Create a metadata table at the top with invisible borders using HTML
6. Format: Normal essay style with clear headings and subheadings

CLAIM METADATA TABLE (use HTML table with invisible borders):
Claim Number: ${metadata.claimNumber}
Policy Number: ${metadata.policyNumber}
Insured Name: ${metadata.insuredName}
Date of Loss: ${metadata.dateOfLoss}
Location of Loss: ${metadata.locationOfLoss}
Class of Business: ${metadata.classOfBusiness}

REPORT PREPARATION INSTRUCTIONS:
You are a senior insurance claims adjuster with 15+ years experience.

Loss Description:
${metadata.lossDescription || 'No description provided'}

`;

  // Add scrutiny items if any
  if (metadata.scrutinyItems && metadata.scrutinyItems.length > 0) {
    prompt += `\nFOCUS AREAS FOR SCRUTINY:\n`;
    metadata.scrutinyItems.forEach(item => {
      prompt += `\n${item}:\n`;
      
      if (item === 'THE INSURED') {
        prompt += `   - Conduct online research about the insured entity
   - Write a brief 3-paragraph company/industry profile
   - Include company background, industry position, and relevant context\n`;
      }
      
      if (item === 'POLICY TERMS AND CONDITION') {
        prompt += `   - First, read through the Policy and Endorsement Documents thoroughly
   - Identify and list APPLICABLE Memos/Clauses/Warranties/Conditions/Exclusions relevant to this claim
   - Then list those that are NOT RELEVANT to this claim
   - Provide detailed analysis of policy coverage\n`;
      }
      
      if (item === 'INTERVIEWS') {
        prompt += `   - List specific conversations with interviewees
   - Include names and positions of those interviewed
   - Summarize key statements and findings
   - Assess credibility and consistency of statements\n`;
        
        if (metadata.interviewDetails && metadata.interviewDetails.length > 0) {
          prompt += `\nINTERVIEW DETAILS PROVIDED:\n`;
          metadata.interviewDetails.forEach((interview, idx) => {
            prompt += `${idx + 1}. ${interview.name || 'Unnamed'}: ${interview.conversation || 'No details provided'}\n`;
          });
        }
      }
      
      if (item === 'INTRODUCTION') {
        prompt += `   - Provide comprehensive introduction to the claim
   - Include background context and claim history
   - Set the stage for detailed analysis\n`;
      }
    });
  }

  // Add custom headlines if any
  if (metadata.structuredHeadlines && metadata.structuredHeadlines.length > 0) {
    prompt += `\nADDITIONAL CUSTOM FOCUS AREAS:\n`;
    metadata.structuredHeadlines.forEach(h => {
      prompt += `${h.number}. ${h.main}\n`;
      if (h.subpoints && h.subpoints.length > 0) {
        h.subpoints.forEach(s => {
          prompt += `   ${s.number} ${s.title}\n`;
        });
      }
    });
  }

  // Add custom scrutiny prompt if provided
  if (metadata.customScrutinyPrompt) {
    prompt += `\nADDITIONAL ANALYSIS INSTRUCTIONS:\n${metadata.customScrutinyPrompt}\n`;
  }

  // Add image analysis instruction only if photos are included
  if (!metadata.excludePhotos) {
    prompt += `\nPHOTOGRAPH ANALYSIS:
- Examine all uploaded photographs
- Identify and describe relevant evidence in the photographs
- Include a "PHOTOGRAPHIC EVIDENCE" section describing key photos
- Note any missing photographic evidence that would be helpful\n`;
  } else {
    prompt += `\nPHOTOGRAPH NOTE:
- Photos were uploaded but excluded from AI analysis per user request
- Photos are available for manual review in the claim file\n`;
  }

  // Add risk improvement section
  prompt += `\nRISK IMPROVEMENT / RISK MITIGATION ANALYSIS:
- Based on the claim analysis, provide risk improvement recommendations
- Suggest measures to avoid future occurrences
- Include specific, actionable recommendations
- Consider operational, procedural, and technical improvements\n`;

  // Add document requirements
  prompt += `\nDOCUMENTARY REQUIREMENTS:
- List documents needed for processing this claim type
- Note which documents are present and which are missing
- Suggest sources for obtaining missing documents\n`;

  // Final formatting reminder
  prompt += `\nFORMATTING REMINDER:
- Use Times New Roman style formatting throughout
- Maintain 1.5 line spacing between paragraphs
- Write in complete, professional sentences
- Structure the report with clear headings and subheadings
- End with comprehensive conclusions and recommendations`;

  return prompt;
}

function buildPreliminaryPrompt(metadata) {
  const structure =
    metadata.structuredHeadlines?.map(h =>
      `${h.number}. ${h.main}\n${h.subpoints.map(s => `   ${s.number} ${s.title}`).join('\n')}`
    ).join('\n') || 'Standard preliminary report format';

  return `
FORMATTING INSTRUCTIONS:
1. Write in reported speech (past tense)
2. Use essay format with paragraphs - NO bullet points
3. Use Times New Roman style, 12pt, 1.5 line spacing
4. Include metadata table at top with invisible borders
5. Style: Normal essay format

METADATA TABLE:
Claim: ${metadata.claimNumber}
Insured: ${metadata.insuredName}
Class: ${metadata.classOfBusiness}
Loss Date: ${metadata.dateOfLoss}
Loss Location: ${metadata.locationOfLoss}

PREPARE PRELIMINARY / INTERIM CLAIMS REPORT:

Follow this structure:
${structure}

DOCUMENT ANALYSIS:
- Review all provided documents
- Note missing information
- Assess preliminary liability

PHOTOGRAPHIC EVIDENCE:
${metadata.excludePhotos ? '- Photos were uploaded but excluded from AI analysis per user request' : '- Describe and analyze uploaded photographs\n- Note evidentiary value of each image'}

PRELIMINARY FINDINGS:
- Provide initial assessment
- Identify areas requiring further investigation
- Note immediate actions taken

RISK MITIGATION:
- Suggest immediate risk control measures
- Provide preliminary recommendations

REQUIRED DOCUMENTS:
- List documents needed for this class of business
- Note which are present and which are missing

OUTPUT: Professional essay format, no markdown, complete paragraphs.
`;
}

function buildFinalPrompt(metadata) {
  const structure =
    metadata.structuredHeadlines?.map(h =>
      `${h.number}. ${h.main}\n${h.subpoints.map(s => `   ${s.number} ${s.title}`).join('\n')}`
    ).join('\n') || 'Standard final report structure';

  return `
FORMATTING INSTRUCTIONS:
1. Write in reported speech (past tense)
2. Use essay format with paragraphs - NO bullet points
3. Use Times New Roman style, 12pt, 1.5 line spacing
4. Include comprehensive metadata table at top
5. Style: Normal essay format

PREPARE FINAL ADJUSTMENT REPORT:

CLAIM DETAILS:
Claim: ${metadata.claimNumber}
Insured: ${metadata.insuredName}
Class: ${metadata.classOfBusiness}
Loss: ${metadata.dateOfLoss} at ${metadata.locationOfLoss}

Strictly follow this structure:
${structure}

POLICY ANALYSIS:
- Thoroughly analyze policy terms and conditions
- Identify applicable and non-applicable clauses
- Assess coverage and exclusions

EVIDENCE REVIEW:
- Analyze all documents
${metadata.excludePhotos ? '- Note: Photos were uploaded but excluded from AI analysis' : '- Analyze all photographs\n- Describe photographic evidence in detail'}
- Assess credibility and relevance
- Note evidentiary gaps

LIABILITY ASSESSMENT:
- Provide detailed liability analysis
- Consider contributory factors
- Assess compliance with policy terms

QUANTUM ASSESSMENT:
- Calculate loss amount
- Provide detailed breakdown
- Justify calculations

RISK IMPROVEMENT RECOMMENDATIONS:
- Comprehensive risk mitigation strategy
- Specific actionable recommendations
- Long-term prevention measures

PHOTOGRAPHIC SECTION:
${metadata.excludePhotos ? '- Note: Photos were provided but excluded from AI analysis. Available for manual review.' : '- Detailed description of photographic evidence\n- Evidentiary value assessment\n- Missing photographic evidence noted'}

REQUIRED DOCUMENTS CHECKLIST:
- List all documents required for this claim type
- Note status of each document (present/missing)
- Suggest sources for missing documents

CONCLUSIONS:
- Clear, justified conclusions
- Professional recommendations
- Final settlement position

OUTPUT: Professional final report suitable for file and reinsurers, essay format, no markdown.
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

