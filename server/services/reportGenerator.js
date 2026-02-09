const docx = require('docx');
const fs = require('fs/promises');

async function generateReport(reportText, outputPath, metadata) {
  const {
    Document,
    Packer,
    Paragraph,
    TextRun,
    Table,
    TableCell,
    TableRow,
    WidthType,
    BorderStyle,
    AlignmentType,
  } = docx;

  // Create header table with invisible borders
  const headerTable = new Table({
    width: {
      size: 100,
      type: WidthType.PERCENTAGE,
    },
    borders: {
      top: { style: BorderStyle.NONE },
      bottom: { style: BorderStyle.NONE },
      left: { style: BorderStyle.NONE },
      right: { style: BorderStyle.NONE },
      insideHorizontal: { style: BorderStyle.NONE },
      insideVertical: { style: BorderStyle.NONE },
    },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: 'Claim Number:',
                    bold: true,
                    font: 'Times New Roman',
                    size: 24, // 12pt
                  }),
                ],
                spacing: { line: 360 }, // 1.5 line spacing
              }),
            ],
            width: { size: 30, type: WidthType.PERCENTAGE },
          }),
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: metadata.claimNumber || 'N/A',
                    font: 'Times New Roman',
                    size: 24,
                  }),
                ],
                spacing: { line: 360 },
              }),
            ],
            width: { size: 70, type: WidthType.PERCENTAGE },
          }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: 'Policy Number:',
                    bold: true,
                    font: 'Times New Roman',
                    size: 24,
                  }),
                ],
                spacing: { line: 360 },
              }),
            ],
          }),
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: metadata.policyNumber || 'N/A',
                    font: 'Times New Roman',
                    size: 24,
                  }),
                ],
                spacing: { line: 360 },
              }),
            ],
          }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: 'Insured Name:',
                    bold: true,
                    font: 'Times New Roman',
                    size: 24,
                  }),
                ],
                spacing: { line: 360 },
              }),
            ],
          }),
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: metadata.insuredName || 'N/A',
                    font: 'Times New Roman',
                    size: 24,
                  }),
                ],
                spacing: { line: 360 },
              }),
            ],
          }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: 'Date of Loss:',
                    bold: true,
                    font: 'Times New Roman',
                    size: 24,
                  }),
                ],
                spacing: { line: 360 },
              }),
            ],
          }),
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: metadata.dateOfLoss || 'N/A',
                    font: 'Times New Roman',
                    size: 24,
                  }),
                ],
                spacing: { line: 360 },
              }),
            ],
          }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: 'Location of Loss:',
                    bold: true,
                    font: 'Times New Roman',
                    size: 24,
                  }),
                ],
                spacing: { line: 360 },
              }),
            ],
          }),
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: metadata.locationOfLoss || 'N/A',
                    font: 'Times New Roman',
                    size: 24,
                  }),
                ],
                spacing: { line: 360 },
              }),
            ],
          }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: 'Class of Business:',
                    bold: true,
                    font: 'Times New Roman',
                    size: 24,
                  }),
                ],
                spacing: { line: 360 },
              }),
            ],
          }),
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: metadata.classOfBusiness || 'N/A',
                    font: 'Times New Roman',
                    size: 24,
                  }),
                ],
                spacing: { line: 360 },
              }),
            ],
          }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: 'Report Type:',
                    bold: true,
                    font: 'Times New Roman',
                    size: 24,
                  }),
                ],
                spacing: { line: 360 },
              }),
            ],
          }),
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: (metadata.reportType || 'Unknown').toUpperCase(),
                    font: 'Times New Roman',
                    size: 24,
                  }),
                ],
                spacing: { line: 360 },
              }),
            ],
          }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: 'Generated:',
                    bold: true,
                    font: 'Times New Roman',
                    size: 24,
                  }),
                ],
                spacing: { line: 360 },
              }),
            ],
          }),
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: new Date(metadata.generatedAt).toLocaleString(),
                    font: 'Times New Roman',
                    size: 24,
                  }),
                ],
                spacing: { line: 360 },
              }),
            ],
          }),
        ],
      }),
    ],
  });

  // Convert report text to paragraphs
  const reportParagraphs = reportText.split('\n').map(line => {
    // Check if line is a heading (simple heuristic)
    const isHeading = line.match(/^[A-Z\s]+:/) || line.match(/^#+\s/) || 
                      (line.trim().length > 0 && line === line.toUpperCase() && line.length < 100);
    
    return new Paragraph({
      children: [
        new TextRun({
          text: line || ' ', // Empty line for spacing
          font: 'Times New Roman',
          size: 24, // 12pt (half-points)
          bold: isHeading,
        }),
      ],
      spacing: {
        line: 360, // 1.5 line spacing (240 = single, 360 = 1.5, 480 = double)
        after: line.trim() === '' ? 240 : 0, // Extra space after empty lines
      },
    });
  });

  // Create document
  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          headerTable,
          new Paragraph({
            text: '', // Spacing after table
            spacing: { after: 400 },
          }),
          ...reportParagraphs,
        ],
      },
    ],
  });

  // Write to file
  const buffer = await Packer.toBuffer(doc);
  await fs.writeFile(outputPath, buffer);
}

module.exports = { generateReport };
