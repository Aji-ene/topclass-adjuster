// services/reportGenerator.js
const fs = require('fs/promises');
const { Document, Packer, Paragraph, TextRun, HeadingLevel } = require('docx');

async function generateReport(reportText, outputPath, metadata = {}) {
  // Parse markdown text and convert to DOCX structure
  const lines = reportText.split('\n');
  const children = [];
  
  // Add title
  children.push(
    new Paragraph({
      text: `Claims Report - ${metadata.claimNumber || 'N/A'}`,
      heading: HeadingLevel.TITLE,
      spacing: { after: 400 }
    })
  );
  
  // Add metadata section
  const metaParagraph = new Paragraph({
    children: [
      new TextRun({ text: 'Report Details:', bold: true }),
      new TextRun({ text: `\nType: ${metadata.reportType || 'Unknown'}` }),
      new TextRun({ text: `\nAI Agent: ${metadata.aiAgent || 'Unknown'}` }),
      new TextRun({ text: `\nClass of Business: ${metadata.classOfBusiness || 'N/A'}` }),
      new TextRun({ text: `\nGenerated: ${metadata.generatedAt ? new Date(metadata.generatedAt).toLocaleString() : new Date().toLocaleString()}` }),
    ],
    spacing: { after: 400 }
  });
  children.push(metaParagraph);
  
  // Add separator
  children.push(
    new Paragraph({
      text: '―'.repeat(50),
      spacing: { after: 400 }
    })
  );
  
  // Process report content (simple markdown conversion)
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    if (!line) {
      children.push(new Paragraph({ text: '', spacing: { after: 200 } }));
      continue;
    }
    
    // Handle headings
    if (line.startsWith('# ')) {
      children.push(
        new Paragraph({
          text: line.substring(2),
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 300, after: 200 }
        })
      );
    } else if (line.startsWith('## ')) {
      children.push(
        new Paragraph({
          text: line.substring(3),
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 200, after: 150 }
        })
      );
    } else if (line.startsWith('### ')) {
      children.push(
        new Paragraph({
          text: line.substring(4),
          heading: HeadingLevel.HEADING_3,
          spacing: { before: 150, after: 100 }
        })
      );
    } else if (line.startsWith('- ') || line.startsWith('* ') || /^\d+\./.test(line)) {
      // Handle lists
      children.push(
        new Paragraph({
          text: line,
          bullet: { level: 0 },
          spacing: { after: 100 }
        })
      );
    } else {
      // Regular paragraph
      children.push(
        new Paragraph({
          text: line,
          spacing: { after: 200 }
        })
      );
    }
  }
  
  // Add footer
  children.push(
    new Paragraph({
      text: '―'.repeat(50),
      spacing: { before: 400, after: 200 }
    })
  );
  
  children.push(
    new Paragraph({
      text: 'Confidential - Topclass Adjusters & Loss Assessors',
      alignment: 'center',
      spacing: { before: 200 }
    })
  );
  
  // Create document
  const doc = new Document({
    sections: [{
      properties: {},
      children
    }]
  });

  // Generate buffer and write to file
  const buffer = await Packer.toBuffer(doc);
  await fs.writeFile(outputPath, buffer);
  
  return outputPath;
}

module.exports = {
  generateReport
};