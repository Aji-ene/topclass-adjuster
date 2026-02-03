// services/reportGenerator.js
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';

export async function generateReport(reportText, outputPath, metadata = {}) {
  // Your DOCX generation logic here
  const doc = new Document({
    sections: [{
      properties: {},
      children: [
        new Paragraph({
          text: `Report - ${metadata.claimNumber}`,
          heading: HeadingLevel.TITLE,
        }),
        // ... rest of your DOCX generation
      ]
    }]
  });

  const buffer = await Packer.toBuffer(doc);
  await fs.writeFile(outputPath, buffer);
}