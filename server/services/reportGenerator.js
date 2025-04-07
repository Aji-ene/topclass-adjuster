  // services/reportGenerator.js

  const { Document, Packer, Paragraph, HeadingLevel, AlignmentType } = require('docx');
  const fs = require('fs-extra');
  const path = require('path');
  
  async function generateDocxReport(outputPath, analysisResult, reportType) {
    const doc = new Document({
      sections: [{
        children: [
          new Paragraph({
            text: reportType === 'interim' ? "Interim Insurance Claim Analysis Report" : "Final Insurance Claim Analysis Report",
            heading: HeadingLevel.HEADING_1,
            alignment: AlignmentType.CENTER
          }),
          ...(reportType === 'interim' ? [
            new Paragraph({ text: "OVERVIEW", heading: HeadingLevel.HEADING_2 }),
            new Paragraph(analysisResult.OVERVIEW || "No overview provided"),
            new Paragraph({ text: "1.0 FACTS OF THE LOSS", heading: HeadingLevel.HEADING_2 }),
            new Paragraph(analysisResult["1.0 FACTS OF THE LOSS"] || "No facts provided"),
            new Paragraph({ text: "2.0 PROXIMATE CAUSE OF THE LOSS", heading: HeadingLevel.HEADING_2 }),
            new Paragraph(analysisResult["2.0 PROXIMATE CAUSE OF THE LOSS"] || "Cause unknown"),
            new Paragraph({ text: "3.0 PHOTOGRAPHS", heading: HeadingLevel.HEADING_2 }),
            new Paragraph(analysisResult["3.0 PHOTOGRAPHS"] || "No photographs available"),
            new Paragraph({ text: "4.0 OUR UPDATE ON THE CLAIM", heading: HeadingLevel.HEADING_2 }),
            new Paragraph(analysisResult["4.0 OUR UPDATE ON THE CLAIM"] || "No update available"),
            new Paragraph({ text: "5.0 EXTENT OF THE LOSS", heading: HeadingLevel.HEADING_2 }),
            new Paragraph(analysisResult["5.0 EXTENT OF THE LOSS"] || "Extent not determined"),
            new Paragraph({ text: "6.0 SALVAGEABLE", heading: HeadingLevel.HEADING_2 }),
            new Paragraph(analysisResult["6.0 SALVAGEABLE"] || "Salvageability unknown"),
            new Paragraph({ text: "7.0 FURTHER REQUIREMENTS FROM INSURERS", heading: HeadingLevel.HEADING_2 }),
            new Paragraph(analysisResult["7.0 FURTHER REQUIREMENTS FROM INSURERS"] || "No requirements specified"),
            new Paragraph({ text: "8.0 FURTHER REQUIREMENTS FROM THE INSURED", heading: HeadingLevel.HEADING_2 }),
            new Paragraph(analysisResult["8.0 FURTHER REQUIREMENTS FROM THE INSURED"] || "No requirements specified"),
            new Paragraph({ text: "9.0 RESERVE", heading: HeadingLevel.HEADING_2 }),
            new Paragraph(analysisResult["9.0 RESERVE"] || "Reserve not set")
          ] : [
            new Paragraph(analysisResult["PREFACE"] || "No preface provided"),
            new Paragraph({ text: "1.0 THE INSURED", heading: HeadingLevel.HEADING_2 }),
            new Paragraph(analysisResult["1.0 THE INSURED"] || "Insured details unavailable"),
            new Paragraph({ text: "2.0 FACTS OF THE ACCIDENT", heading: HeadingLevel.HEADING_2 }),
            new Paragraph(analysisResult["2.0 FACTS OF THE ACCIDENT"] || "No facts provided"),
            new Paragraph({ text: "3.0 PROXIMATE CAUSE OF LOSS", heading: HeadingLevel.HEADING_2 }),
            new Paragraph(analysisResult["3.0 PROXIMATE CAUSE OF LOSS"] || "Cause unknown"),
            new Paragraph({ text: "4.0 INTERVIEWS", heading: HeadingLevel.HEADING_2 }),
            new Paragraph(analysisResult["4.0 INTERVIEWS"] || "No interviews conducted"),
            new Paragraph({ text: "4.1 Replace with name", heading: HeadingLevel.HEADING_3 }),
            new Paragraph(analysisResult["4.1 Replace with name"] || "No interview details"),
            new Paragraph({ text: "4.2 Replace with name", heading: HeadingLevel.HEADING_3 }),
            new Paragraph(analysisResult["4.2 Replace with name"] || "No interview details"),
            new Paragraph({ text: "5.0 MOTOR VEHICLE PARTICULARS", heading: HeadingLevel.HEADING_2 }),
            new Paragraph(analysisResult["5.0 MOTOR VEHICLE PARTICULARS"] || "Vehicle details unavailable"),
            new Paragraph({ text: "6.0 DRIVER’S LICENSE", heading: HeadingLevel.HEADING_2 }),
            new Paragraph(analysisResult["6.0 DRIVER’S LICENSE"] || "License details unavailable"),
            new Paragraph({ text: "7.0 POLICY TERMS AND CONDITIONS", heading: HeadingLevel.HEADING_2 }),
            new Paragraph(analysisResult["7.0 POLICY TERMS AND CONDITIONS"] || "Terms not specified"),
            new Paragraph({ text: "7.1 Scope of Cover", heading: HeadingLevel.HEADING_3 }),
            new Paragraph(analysisResult["7.1 Scope of Cover"] || "Scope not defined"),
            new Paragraph({ text: "7.2 Notification of Claim", heading: HeadingLevel.HEADING_3 }),
            new Paragraph(analysisResult["7.2 Notification of Claim"] || "Notification not recorded"),
            new Paragraph({ text: "7.3 Period of Cover", heading: HeadingLevel.HEADING_3 }),
            new Paragraph(analysisResult["7.3 Period of Cover"] || "Period not specified"),
            new Paragraph({ text: "7.4 MEMO 2: JURISDICTION CLAUSE", heading: HeadingLevel.HEADING_3 }),
            new Paragraph(analysisResult["7.4 MEMO 2: JURISDICTION CLAUSE"] || "Jurisdiction not noted"),
            new Paragraph({ text: "7.5 MEMO 5: AUTOMATIC REINSTATEMENT OF SUM INSURED AFTER LOSS CLAUSE", heading: HeadingLevel.HEADING_3 }),
            new Paragraph(analysisResult["7.5 MEMO 5: AUTOMATIC REINSTATEMENT OF SUM INSURED AFTER LOSS CLAUSE"] || "Reinstatement not applicable"),
            new Paragraph({ text: "7.6 MEMO 6: DOCUMENTARY EVIDENCE WARRANTY", heading: HeadingLevel.HEADING_3 }),
            new Paragraph(analysisResult["7.6 MEMO 6: DOCUMENTARY EVIDENCE WARRANTY"] || "No evidence provided"),
            new Paragraph({ text: "7.7 MEMO 8: EXCESS CLAUSE", heading: HeadingLevel.HEADING_3 }),
            new Paragraph(analysisResult["7.7 MEMO 8: EXCESS CLAUSE"] || "Excess not specified"),
            new Paragraph({ text: "7.8 MEMO 14: MAINTENANCE WARRANTY", heading: HeadingLevel.HEADING_3 }),
            new Paragraph(analysisResult["7.8 MEMO 14: MAINTENANCE WARRANTY"] || "Maintenance not verified"),
            new Paragraph({ text: "7.9 MEMO 15: WAY BILL CLAUSE", heading: HeadingLevel.HEADING_3 }),
            new Paragraph(analysisResult["7.9 MEMO 15: WAY BILL CLAUSE"] || "Way bill not provided"),
            new Paragraph({ text: "7.10 MEMO 18: HIRED VEHICLE WARRANTY", heading: HeadingLevel.HEADING_3 }),
            new Paragraph(analysisResult["7.10 MEMO 18: HIRED VEHICLE WARRANTY"] || "Hired vehicle not applicable"),
            new Paragraph({ text: "7.11 MEMO 6: ARBITRATION CLAUSE", heading: HeadingLevel.HEADING_3 }),
            new Paragraph(analysisResult["7.11 MEMO 6: ARBITRATION CLAUSE"] || "Arbitration not applicable"),
            new Paragraph({ text: "7.12 MEMO 7: LOADING AND UNLOADING EXTENSION CLAUSE", heading: HeadingLevel.HEADING_3 }),
            new Paragraph(analysisResult["7.12 MEMO 7: LOADING AND UNLOADING EXTENSION CLAUSE"] || "Extension not applicable"),
            new Paragraph({ text: "7.13 MEMO 9: DISAPPEARANCE OF CONVEYANCE CLAUSE", heading: HeadingLevel.HEADING_3 }),
            new Paragraph(analysisResult["7.13 MEMO 9: DISAPPEARANCE OF CONVEYANCE CLAUSE"] || "Disappearance not noted"),
            new Paragraph({ text: "7.14 MEMO 10: AUTOMATIC REINSTATEMENT OF SUM INSURED AFTER LOSS CLAUSE", heading: HeadingLevel.HEADING_3 }),
            new Paragraph(analysisResult["7.14 MEMO 10: AUTOMATIC REINSTATEMENT OF SUM INSURED AFTER LOSS CLAUSE"] || "Reinstatement not applicable"),
            new Paragraph({ text: "7.15 MEMO 11: POLITICAL RISKS EXCLUSION CLAUSE", heading: HeadingLevel.HEADING_3 }),
            new Paragraph(analysisResult["7.15 MEMO 11: POLITICAL RISKS EXCLUSION CLAUSE"] || "Political risks not excluded"),
            new Paragraph({ text: "7.16 MEMO 12: COLLUSION CLAUSE", heading: HeadingLevel.HEADING_3 }),
            new Paragraph(analysisResult["7.16 MEMO 12: COLLUSION CLAUSE"] || "Collusion not noted"),
            new Paragraph({ text: "7.17 MEMO 13: CARE AND PROTECTION CLAUSE", heading: HeadingLevel.HEADING_3 }),
            new Paragraph(analysisResult["7.17 MEMO 13: CARE AND PROTECTION CLAUSE"] || "Care not verified"),
            new Paragraph({ text: "7.18 MEMO 14: DISHONESTY OF DRIVERS’ CLAUSE", heading: HeadingLevel.HEADING_3 }),
            new Paragraph(analysisResult["7.18 MEMO 14: DISHONESTY OF DRIVERS’ CLAUSE"] || "Dishonesty not reported"),
            new Paragraph({ text: "7.19 MEMO 15: RECORD OF GOODS WARRANTY", heading: HeadingLevel.HEADING_3 }),
            new Paragraph(analysisResult["7.19 MEMO 15: RECORD OF GOODS WARRANTY"] || "Records not provided"),
            new Paragraph({ text: "7.20 MEMO 16: VEHICLE LOAD CLAUSE", heading: HeadingLevel.HEADING_3 }),
            new Paragraph(analysisResult["7.20 MEMO 16: VEHICLE LOAD CLAUSE"] || "Load not specified"),
            new Paragraph({ text: "7.21 MEMO 17: TARPAULIN WARRANTY (APPLICABLE TO VEHICLE WITH OPEN BODY)", heading: HeadingLevel.HEADING_3 }),
            new Paragraph(analysisResult["7.21 MEMO 17: TARPAULIN WARRANTY (APPLICABLE TO VEHICLE WITH OPEN BODY)"] || "Tarpaulin not applicable"),
            new Paragraph({ text: "7.22 MEMO 18: CONTAINERIZED VEHICLES CLAUSE", heading: HeadingLevel.HEADING_3 }),
            new Paragraph(analysisResult["7.22 MEMO 18: CONTAINERIZED VEHICLES CLAUSE"] || "Containerization not applicable"),
            new Paragraph({ text: "7.23 MEMO 19: HIRED VEHICLE WARRANTY", heading: HeadingLevel.HEADING_3 }),
            new Paragraph(analysisResult["7.23 MEMO 19: HIRED VEHICLE WARRANTY"] || "Hired vehicle not applicable"),
            new Paragraph({ text: "7.24 MEMO 20: PRECAUTIONS AND PROTECTIONS", heading: HeadingLevel.HEADING_3 }),
            new Paragraph(analysisResult["7.24 MEMO 20: PRECAUTIONS AND PROTECTIONS"] || "Precautions not specified"),
            new Paragraph({ text: "7.25 MEMO 21: UNATTENDED VEHICLE WARRANTY", heading: HeadingLevel.HEADING_3 }),
            new Paragraph(analysisResult["7.25 MEMO 21: UNATTENDED VEHICLE WARRANTY"] || "Unattended status not verified"),
            new Paragraph({ text: "7.26 MEMO 22: INHERENT VICE OF THE SUBJECT MATTER", heading: HeadingLevel.HEADING_3 }),
            new Paragraph(analysisResult["7.26 MEMO 22: INHERENT VICE OF THE SUBJECT MATTER"] || "Inherent vice not noted"),
            new Paragraph({ text: "7.27 MEMO 23: EXCLUSION OF DELICATE GOODS", heading: HeadingLevel.HEADING_3 }),
            new Paragraph(analysisResult["7.27 MEMO 23: EXCLUSION OF DELICATE GOODS"] || "Delicate goods not excluded"),
            new Paragraph({ text: "7.28 MEMO 24: TERRORISM EXCLUSION CLAUSE", heading: HeadingLevel.HEADING_3 }),
            new Paragraph(analysisResult["7.28 MEMO 24: TERRORISM EXCLUSION CLAUSE"] || "Terrorism not excluded"),
            new Paragraph({ text: "7.29 MEMO 25: ALTERNATIVE DISPUTE RESOLUTION CLAUSE", heading: HeadingLevel.HEADING_3 }),
            new Paragraph(analysisResult["7.29 MEMO 25: ALTERNATIVE DISPUTE RESOLUTION CLAUSE"] || "Dispute resolution not applicable"),
            new Paragraph({ text: "7.30 MEMO 26: CLAIMS/LOSS RATIO WARRANTY", heading: HeadingLevel.HEADING_3 }),
            new Paragraph(analysisResult["7.30 MEMO 26: CLAIMS/LOSS RATIO WARRANTY"] || "Loss ratio not specified"),
            new Paragraph({ text: "7.31 MEMO 27: SALVAGE RETRIEVAL CLAUSE", heading: HeadingLevel.HEADING_3 }),
            new Paragraph(analysisResult["7.31 MEMO 27: SALVAGE RETRIEVAL CLAUSE"] || "Salvage retrieval not applicable"),
            new Paragraph({ text: "7.32 MEMO 28: PREMIUM PAYMENT DEFERRAL CLAUSE", heading: HeadingLevel.HEADING_3 }),
            new Paragraph(analysisResult["7.32 MEMO 28: PREMIUM PAYMENT DEFERRAL CLAUSE"] || "Payment deferral not applicable"),
            new Paragraph({ text: "7.33 MEMO 29: RIOT, STRIKES & CIVIL COMMOTION", heading: HeadingLevel.HEADING_3 }),
            new Paragraph(analysisResult["7.33 MEMO 29: RIOT, STRIKES & CIVIL COMMOTION"] || "Riot not applicable"),
            new Paragraph({ text: "7.34 MEMO 30: CLAIM NOTIFICATION AND DOCUMENTATION WARRANTY", heading: HeadingLevel.HEADING_3 }),
            new Paragraph(analysisResult["7.34 MEMO 30: CLAIM NOTIFICATION AND DOCUMENTATION WARRANTY"] || "Notification not verified"),
            new Paragraph({ text: "7.35 MEMO 31: NO PREMIUM NO COVER WARRANTY", heading: HeadingLevel.HEADING_3 }),
            new Paragraph(analysisResult["7.35 MEMO 31: NO PREMIUM NO COVER WARRANTY"] || "No memo provided"),
            new Paragraph({ text: "7.36 Photographs", heading: HeadingLevel.HEADING_3 }),
            new Paragraph(analysisResult["7.36 Photographs"] || "No photographs available"),
            new Paragraph({ text: "7.37 Adequacy of the Limit Per carrying", heading: HeadingLevel.HEADING_3 }),
            new Paragraph(analysisResult["7.37 Adequacy of the Limit Per carrying"] || "Limit adequacy not assessed"),
            new Paragraph({ text: "7.38 Other Insurances", heading: HeadingLevel.HEADING_3 }),
            new Paragraph(analysisResult["7.38 Other Insurances"] || "No other insurances noted"),
            new Paragraph({ text: "7.39 Breach of Policy Terms", heading: HeadingLevel.HEADING_3 }),
            new Paragraph(analysisResult["7.39 Breach of Policy Terms"] || "No breaches identified"),
            new Paragraph({ text: "7.40 SALVAGE", heading: HeadingLevel.HEADING_3 }),
            new Paragraph(analysisResult["7.40 SALVAGE"] || "Salvage not evaluated"),
            new Paragraph({ text: "8.0 THE INSURED’S CLAIM", heading: HeadingLevel.HEADING_2 }),
            new Paragraph(analysisResult["8.0 THE INSURED’S CLAIM"] || "Claim details unavailable"),
            new Paragraph({ text: "9.0 OUR VERIFICATION OF THE LOSS", heading: HeadingLevel.HEADING_2 }),
            new Paragraph(analysisResult["9.0 OUR VERIFICATION OF THE LOSS"] || "Loss not verified"),
            new Paragraph({ text: "10.0 CONSIDERATION OF LIABILITY", heading: HeadingLevel.HEADING_2 }),
            new Paragraph(analysisResult["10.0 CONSIDERATION OF LIABILITY"] || "Liability not considered"),
            new Paragraph({ text: "11.0 ADJUSTMENT", heading: HeadingLevel.HEADING_2 }),
            new Paragraph(analysisResult["11.0 ADJUSTMENT"] || "No adjustment made"),
            new Paragraph({ text: "12.0 RISK IMPROVEMENT", heading: HeadingLevel.HEADING_2 }),
            new Paragraph(analysisResult["12.0 RISK IMPROVEMENT"] || "No improvements suggested"),
            new Paragraph({ text: "13.0 DISCHARGE OF CLAIM", heading: HeadingLevel.HEADING_2 }),
            new Paragraph(analysisResult["13.0 DISCHARGE OF CLAIM"] || "Claim not discharged"),
            new Paragraph({ text: "14.0 LOSS ADJUSTERS’ FEES AND EXPENSES", heading: HeadingLevel.HEADING_2 }),
            new Paragraph(analysisResult["14.0 LOSS ADJUSTERS’ FEES AND EXPENSES"] || "Fees not calculated"),
            new Paragraph({ text: "15.0 SUMMARY OF ADJUSTMENT AND ADJUSTER’S BILL", heading: HeadingLevel.HEADING_2 }),
            new Paragraph(analysisResult["15.0 SUMMARY OF ADJUSTMENT AND ADJUSTER’S BILL"] || "Summary not available"),
            new Paragraph({ text: "16.0 METHOD OF SETTLEMENT", heading: HeadingLevel.HEADING_2 }),
            new Paragraph(analysisResult["16.0 METHOD OF SETTLEMENT"] || "Settlement method not determined"),
            new Paragraph({ text: "17.0 ATTACHMENT TO THE FINAL REPORT", heading: HeadingLevel.HEADING_2 }),
            new Paragraph(analysisResult["17.0 ATTACHMENT TO THE FINAL REPORT"] || "No attachments provided")
          ])
        ]
      }]
    });
    const buffer = await Packer.toBuffer(doc);
    await fs.writeFile(outputPath, buffer);
  }
  
  async function generateReport(analysisResult) {
    const reportType = analysisResult["OVERVIEW"] ? 'interim' : 'final'; // Infer type based on presence of OVERVIEW
    const outputPath = path.join(__dirname, '../uploads', `${reportType}-report-${Date.now()}.docx`);
    await generateDocxReport(outputPath, analysisResult, reportType);
    return outputPath;
  }
  
  module.exports = { generateReport };
  
    