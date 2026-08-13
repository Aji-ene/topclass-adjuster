const docx = require('docx');
const fs = require('fs/promises');
const sharp = require('sharp');

const MAX_IMAGE_WIDTH_PX = 450;
const MAX_IMAGE_HEIGHT_PX = 350;

// Matches lines the LLM was instructed to emit for photos, e.g.:
//   "Photo: IMG_0231.jpg — collapsed roof section, north elevation"
// The em dash is what the prompt asks for; if the model omits the caption
// we still treat it as a photo reference with an empty caption.
function parsePhotoLine(line) {
  const trimmed = line.trim();
  if (!/^Photo:/i.test(trimmed)) return null;

  const withCaption = trimmed.match(/^Photo:\s*(.+?)\s*—\s*(.*)$/i);
  if (withCaption) {
    return { filename: withCaption[1].trim(), caption: withCaption[2].trim() };
  }

  const withoutCaption = trimmed.match(/^Photo:\s*(.+)$/i);
  if (withoutCaption) {
    return { filename: withoutCaption[1].trim(), caption: '' };
  }

  return null;
}

// Case-insensitive lookup — the model may not reproduce the exact casing
// of the original filename.
function findPhotoPath(photoMap, filename) {
  if (!photoMap) return null;
  if (photoMap[filename]) return photoMap[filename];
  const lower = filename.toLowerCase();
  const key = Object.keys(photoMap).find(k => k.toLowerCase() === lower);
  return key ? photoMap[key] : null;
}

// Reads the photo off disk, normalizes it to PNG (so format quirks like
// webp don't trip up the docx renderer), and scales it down to fit the
// page while preserving aspect ratio. Returns the two paragraphs (image +
// caption) to splice into the report in place of the raw marker line.
async function buildImageParagraphs(photoPath, captionText) {
  const { Paragraph, TextRun, ImageRun, AlignmentType } = docx;

  const original = await fs.readFile(photoPath);
  const image = sharp(original).rotate(); // bake in EXIF orientation
  const meta = await image.metadata();
  const pngBuffer = await image.png().toBuffer();

  let width = meta.width || MAX_IMAGE_WIDTH_PX;
  let height = meta.height || MAX_IMAGE_HEIGHT_PX;
  const scale = Math.min(MAX_IMAGE_WIDTH_PX / width, MAX_IMAGE_HEIGHT_PX / height, 1);
  width = Math.max(1, Math.round(width * scale));
  height = Math.max(1, Math.round(height * scale));

  return [
    new Paragraph({
      children: [
        new ImageRun({
          data: pngBuffer,
          transformation: { width, height },
          type: 'png',
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { before: 120, after: 60 },
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: captionText || ' ',
          italics: true,
          font: 'Times New Roman',
          size: 20, // 10pt
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 240 },
    }),
  ];
}

// Builds the paragraph/image elements that make up the report body,
// swapping any "Photo: filename — caption" line for the actual embedded
// image when a matching upload is found in photoMap. Falls back to
// printing the raw line as text if the referenced photo can't be found or
// fails to process, so nothing silently disappears from the report.
async function buildReportElements(reportText, photoMap) {
  const { Paragraph, TextRun } = docx;
  const elements = [];
  const lines = reportText.split('\n');

  for (const line of lines) {
    const photoRef = parsePhotoLine(line);

    if (photoRef) {
      const photoPath = findPhotoPath(photoMap, photoRef.filename);
      if (photoPath) {
        try {
          const imageElements = await buildImageParagraphs(photoPath, photoRef.caption || photoRef.filename);
          elements.push(...imageElements);
          continue;
        } catch (err) {
          console.warn(`Could not embed photo "${photoRef.filename}":`, err.message);
          // falls through to the plain-text rendering below
        }
      } else {
        console.warn(`Report referenced photo "${photoRef.filename}" but no matching upload was provided.`);
      }
    }

    const isHeading = line.match(/^[A-Z\s]+:/) || line.match(/^#+\s/) ||
                      (line.trim().length > 0 && line === line.toUpperCase() && line.length < 100);

    elements.push(new Paragraph({
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
        after: line.trim() === '' ? 240 : 0,
      },
    }));
  }

  return elements;
}

/**
 * @param {string} reportText
 * @param {string} outputPath
 * @param {object} metadata
 * @param {Object.<string,string>} [photoMap] - original filename -> path on disk of the uploaded photo
 */
async function generateReport(reportText, outputPath, metadata, photoMap = {}) {
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

  // Convert report text to paragraphs, embedding actual photos wherever the
  // text has a "Photo: filename — caption" marker that matches an upload.
  const reportElements = await buildReportElements(reportText, photoMap);

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
          ...reportElements,
        ],
      },
    ],
  });

  // Write to file
  const buffer = await Packer.toBuffer(doc);
  await fs.writeFile(outputPath, buffer);
}

module.exports = { generateReport };
