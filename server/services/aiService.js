// services/aiService.js
const { OpenAI } = require('openai');
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

exports.analyzeInterim = async (questionnaireContent, analyzedContent) => {
  try {
    const prompt = `
      You are an expert insurance claims assistant. Use the following Analyzed File content as the structure and order for your report. Extract details from the Questionnaire File to populate the report.
      
      ANALYZED FILE (structure and order):
      ${analyzedContent.slice(0, 1000)}
      
      QUESTIONNAIRE FILE (details):
      ${questionnaireContent.slice(0, 1000)}
      
      Return JSON with:
      - OVERVIEW (string, max 500 words, inferred from Questionnaire)
      - "1.0 FACTS OF THE LOSS" (string, max 500 words, based on Questionnaire, ordered by Analyzed)
      - "2.0 PROXIMATE CAUSE OF THE LOSS" (string, max 100 words, based on Questionnaire, ordered by Analyzed)
      - "3.0 PHOTOGRAPHS" (string, max 50 words, based on Questionnaire, ordered by Analyzed)
      - "4.0 OUR UPDATE ON THE CLAIM" (string, max 350 words, based on Questionnaire, ordered by Analyzed)
      - "5.0 EXTENT OF THE LOSS" (string, max 100 words, based on Questionnaire, ordered by Analyzed)
      - "6.0 SALVAGEABLE" (string, max 50 words, based on Questionnaire, ordered by Analyzed)
      - "7.0 FURTHER REQUIREMENTS FROM INSURERS" (string, max 100 words, based on Questionnaire, ordered by Analyzed)
      - "8.0 FURTHER REQUIREMENTS FROM THE INSURED" (string, max 200 words, based on Questionnaire, ordered by Analyzed)
      - "9.0 RESERVE" (string, max 50 words, based on Questionnaire, ordered by Analyzed)
      Where possible, match topics or sections from the Analyzed File and fill with Questionnaire details.
    `;
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are an expert insurance claims assistant." },
        { role: "user", content: prompt }
      ],
      temperature: 0.2,
      max_tokens: 1000,
      response_format: { type: "json_object" }
    });
    const content = response.choices[0].message.content;
    console.log('Interim Raw Response:', content);
    const parsed = JSON.parse(content);
    return {
      OVERVIEW: parsed.OVERVIEW || "No overview provided",
      "1.0 FACTS OF THE LOSS": parsed["1.0 FACTS OF THE LOSS"] || "No facts provided",
      "2.0 PROXIMATE CAUSE OF THE LOSS": parsed["2.0 PROXIMATE CAUSE OF THE LOSS"] || "Cause unknown",
      "3.0 PHOTOGRAPHS": parsed["3.0 PHOTOGRAPHS"] || "No photographs available",
      "4.0 OUR UPDATE ON THE CLAIM": parsed["4.0 OUR UPDATE ON THE CLAIM"] || "No update available",
      "5.0 EXTENT OF THE LOSS": parsed["5.0 EXTENT OF THE LOSS"] || "Extent not determined",
      "6.0 SALVAGEABLE": parsed["6.0 SALVAGEABLE"] || "Salvageability unknown",
      "7.0 FURTHER REQUIREMENTS FROM INSURERS": parsed["7.0 FURTHER REQUIREMENTS FROM INSURERS"] || "No requirements specified",
      "8.0 FURTHER REQUIREMENTS FROM THE INSURED": parsed["8.0 FURTHER REQUIREMENTS FROM THE INSURED"] || "No requirements specified",
      "9.0 RESERVE": parsed["9.0 RESERVE"] || "Reserve not set"
    };
  } catch (error) {
    console.error('Interim AI Error:', error.message);
    return {
      OVERVIEW: "Interim analysis failed",
      "1.0 FACTS OF THE LOSS": "Analysis failed",
      "2.0 PROXIMATE CAUSE OF THE LOSS": "Cause unknown",
      "3.0 PHOTOGRAPHS": "No photographs available",
      "4.0 OUR UPDATE ON THE CLAIM": "No update available",
      "5.0 EXTENT OF THE LOSS": "Extent not determined",
      "6.0 SALVAGEABLE": "Salvageability unknown",
      "7.0 FURTHER REQUIREMENTS FROM INSURERS": "No requirements specified",
      "8.0 FURTHER REQUIREMENTS FROM THE INSURED": "No requirements specified",
      "9.0 RESERVE": "Reserve not set"
    };
  }
};

exports.analyzeFull = async (questionnaireContent, analyzedContent) => {
  try {
    const prompt = `
      You are an expert insurance claims adjuster. Use the following structure for your report, ordering it as listed below. Extract details from the Questionnaire File to populate each section, assuming the role of an insurance claims adjuster expert. The Analyzed File is provided for reference but does not dictate the structure—use the predefined sections below.
      
      ANALYZED FILE (reference only):
      ${analyzedContent.slice(0, 1000)}
      
      QUESTIONNAIRE FILE (details):
      ${questionnaireContent.slice(0, 1000)}
      
      Return JSON with these sections, populated with details from the Questionnaire:
      - "PREFACE" (string, max 200 words)
      - "1.0 THE INSURED" (string, max 100 words)
      - "2.0 FACTS OF THE ACCIDENT" (string, max 500 words)
      - "3.0 PROXIMATE CAUSE OF LOSS" (string, max 100 words)
      - "4.0 INTERVIEWS" (string, max 200 words)
      - "4.1 Replace with name" (string, max 100 words)
      - "4.2 Replace with name" (string, max 100 words)
      - "5.0 MOTOR VEHICLE PARTICULARS" (string, max 200 words)
      - "6.0 DRIVER’S LICENSE" (string, max 100 words)
      - "7.0 POLICY TERMS AND CONDITIONS" (string, max 200 words)
      - "7.1 Scope of Cover" (string, max 100 words)
      - "7.2 Notification of Claim" (string, max 100 words)
      - "7.3 Period of Cover" (string, max 100 words)
      - "7.4 MEMO 2: JURISDICTION CLAUSE" (string, max 100 words)
      - "7.5 MEMO 5: AUTOMATIC REINSTATEMENT OF SUM INSURED AFTER LOSS CLAUSE" (string, max 100 words)
      - "7.6 MEMO 6: DOCUMENTARY EVIDENCE WARRANTY" (string, max 100 words)
      - "7.7 MEMO 8: EXCESS CLAUSE" (string, max 100 words)
      - "7.8 MEMO 14: MAINTENANCE WARRANTY" (string, max 100 words)
      - "7.9 MEMO 15: WAY BILL CLAUSE" (string, max 100 words)
      - "7.10 MEMO 18: HIRED VEHICLE WARRANTY" (string, max 100 words)
      - "7.11 MEMO 6: ARBITRATION CLAUSE" (string, max 100 words)
      - "7.12 MEMO 7: LOADING AND UNLOADING EXTENSION CLAUSE" (string, max 100 words)
      - "7.13 MEMO 9: DISAPPEARANCE OF CONVEYANCE CLAUSE" (string, max 100 words)
      - "7.14 MEMO 10: AUTOMATIC REINSTATEMENT OF SUM INSURED AFTER LOSS CLAUSE" (string, max 100 words)
      - "7.15 MEMO 11: POLITICAL RISKS EXCLUSION CLAUSE" (string, max 100 words)
      - "7.16 MEMO 12: COLLUSION CLAUSE" (string, max 100 words)
      - "7.17 MEMO 13: CARE AND PROTECTION CLAUSE" (string, max 100 words)
      - "7.18 MEMO 14: DISHONESTY OF DRIVERS’ CLAUSE" (string, max 100 words)
      - "7.19 MEMO 15: RECORD OF GOODS WARRANTY" (string, max 100 words)
      - "7.20 MEMO 16: VEHICLE LOAD CLAUSE" (string, max 100 words)
      - "7.21 MEMO 17: TARPAULIN WARRANTY (APPLICABLE TO VEHICLE WITH OPEN BODY)" (string, max 100 words)
      - "7.22 MEMO 18: CONTAINERIZED VEHICLES CLAUSE" (string, max 100 words)
      - "7.23 MEMO 19: HIRED VEHICLE WARRANTY" (string, max 100 words)
      - "7.24 MEMO 20: PRECAUTIONS AND PROTECTIONS" (string, max 100 words)
      - "7.25 MEMO 21: UNATTENDED VEHICLE WARRANTY" (string, max 100 words)
      - "7.26 MEMO 22: INHERENT VICE OF THE SUBJECT MATTER" (string, max 100 words)
      - "7.27 MEMO 23: EXCLUSION OF DELICATE GOODS" (string, max 100 words)
      - "7.28 MEMO 24: TERRORISM EXCLUSION CLAUSE" (string, max 100 words)
      - "7.29 MEMO 25: ALTERNATIVE DISPUTE RESOLUTION CLAUSE" (string, max 100 words)
      - "7.30 MEMO 26: CLAIMS/LOSS RATIO WARRANTY" (string, max 100 words)
      - "7.31 MEMO 27: SALVAGE RETRIEVAL CLAUSE" (string, max 100 words)
      - "7.32 MEMO 28: PREMIUM PAYMENT DEFERRAL CLAUSE" (string, max 100 words)
      - "7.33 MEMO 29: RIOT, STRIKES & CIVIL COMMOTION" (string, max 100 words)
      - "7.34 MEMO 30: CLAIM NOTIFICATION AND DOCUMENTATION WARRANTY" (string, max 100 words)
      - "7.35 MEMO 31: NO PREMIUM NO COVER WARRANTY" (string, max 100 words)
      - "7.36 Photographs" (string, max 50 words)
      - "7.37 Adequacy of the Limit Per carrying" (string, max 100 words)
      - "7.38 Other Insurances" (string, max 100 words)
      - "7.39 Breach of Policy Terms" (string, max 200 words)
      - "7.40 SALVAGE" (string, max 50 words)
      - "8.0 THE INSURED’S CLAIM" (string, max 300 words)
      - "9.0 OUR VERIFICATION OF THE LOSS" (string, max 300 words)
      - "10.0 CONSIDERATION OF LIABILITY" (string, max 200 words)
      - "11.0 ADJUSTMENT" (string, max 200 words)
      - "12.0 RISK IMPROVEMENT" (string, max 100 words)
      - "13.0 DISCHARGE OF CLAIM" (string, max 100 words)
      - "14.0 LOSS ADJUSTERS’ FEES AND EXPENSES" (string, max 100 words)
      - "15.0 SUMMARY OF ADJUSTMENT AND ADJUSTER’S BILL" (string, max 200 words)
      - "16.0 METHOD OF SETTLEMENT" (string, max 100 words)
      - "17.0 ATTACHMENT TO THE FINAL REPORT" (string, max 100 words)
    `;
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are an expert insurance claims adjuster." },
        { role: "user", content: prompt }
      ],
      temperature: 0.2,
      max_tokens: 2500, // Increased to fit all sections (~4,000 words max)
      response_format: { type: "json_object" }
    });
    const content = response.choices[0].message.content;
    console.log('Full Raw Response:', content);
    const parsed = JSON.parse(content);
    return {
      "PREFACE": parsed["PREFACE"] || "No preface provided",
      "1.0 THE INSURED": parsed["1.0 THE INSURED"] || "Insured details unavailable",
      "2.0 FACTS OF THE ACCIDENT": parsed["2.0 FACTS OF THE ACCIDENT"] || "No facts provided",
      "3.0 PROXIMATE CAUSE OF LOSS": parsed["3.0 PROXIMATE CAUSE OF LOSS"] || "Cause unknown",
      "4.0 INTERVIEWS": parsed["4.0 INTERVIEWS"] || "No interviews conducted",
      "4.1 Replace with name": parsed["4.1 Replace with name"] || "No interview details",
      "4.2 Replace with name": parsed["4.2 Replace with name"] || "No interview details",
      "5.0 MOTOR VEHICLE PARTICULARS": parsed["5.0 MOTOR VEHICLE PARTICULARS"] || "Vehicle details unavailable",
      "6.0 DRIVER’S LICENSE": parsed["6.0 DRIVER’S LICENSE"] || "License details unavailable",
      "7.0 POLICY TERMS AND CONDITIONS": parsed["7.0 POLICY TERMS AND CONDITIONS"] || "Terms not specified",
      "7.1 Scope of Cover": parsed["7.1 Scope of Cover"] || "Scope not defined",
      "7.2 Notification of Claim": parsed["7.2 Notification of Claim"] || "Notification not recorded",
      "7.3 Period of Cover": parsed["7.3 Period of Cover"] || "Period not specified",
      "7.4 MEMO 2: JURISDICTION CLAUSE": parsed["7.4 MEMO 2: JURISDICTION CLAUSE"] || "Jurisdiction not noted",
      "7.5 MEMO 5: AUTOMATIC REINSTATEMENT OF SUM INSURED AFTER LOSS CLAUSE": parsed["7.5 MEMO 5: AUTOMATIC REINSTATEMENT OF SUM INSURED AFTER LOSS CLAUSE"] || "Reinstatement not applicable",
      "7.6 MEMO 6: DOCUMENTARY EVIDENCE WARRANTY": parsed["7.6 MEMO 6: DOCUMENTARY EVIDENCE WARRANTY"] || "No evidence provided",
      "7.7 MEMO 8: EXCESS CLAUSE": parsed["7.7 MEMO 8: EXCESS CLAUSE"] || "Excess not specified",
      "7.8 MEMO 14: MAINTENANCE WARRANTY": parsed["7.8 MEMO 14: MAINTENANCE WARRANTY"] || "Maintenance not verified",
      "7.9 MEMO 15: WAY BILL CLAUSE": parsed["7.9 MEMO 15: WAY BILL CLAUSE"] || "Way bill not provided",
      "7.10 MEMO 18: HIRED VEHICLE WARRANTY": parsed["7.10 MEMO 18: HIRED VEHICLE WARRANTY"] || "Hired vehicle not applicable",
      "7.11 MEMO 6: ARBITRATION CLAUSE": parsed["7.11 MEMO 6: ARBITRATION CLAUSE"] || "Arbitration not applicable",
      "7.12 MEMO 7: LOADING AND UNLOADING EXTENSION CLAUSE": parsed["7.12 MEMO 7: LOADING AND UNLOADING EXTENSION CLAUSE"] || "Extension not applicable",
      "7.13 MEMO 9: DISAPPEARANCE OF CONVEYANCE CLAUSE": parsed["7.13 MEMO 9: DISAPPEARANCE OF CONVEYANCE CLAUSE"] || "Disappearance not noted",
      "7.14 MEMO 10: AUTOMATIC REINSTATEMENT OF SUM INSURED AFTER LOSS CLAUSE": parsed["7.14 MEMO 10: AUTOMATIC REINSTATEMENT OF SUM INSURED AFTER LOSS CLAUSE"] || "Reinstatement not applicable",
      "7.15 MEMO 11: POLITICAL RISKS EXCLUSION CLAUSE": parsed["7.15 MEMO 11: POLITICAL RISKS EXCLUSION CLAUSE"] || "Political risks not excluded",
      "7.16 MEMO 12: COLLUSION CLAUSE": parsed["7.16 MEMO 12: COLLUSION CLAUSE"] || "Collusion not noted",
      "7.17 MEMO 13: CARE AND PROTECTION CLAUSE": parsed["7.17 MEMO 13: CARE AND PROTECTION CLAUSE"] || "Care not verified",
      "7.18 MEMO 14: DISHONESTY OF DRIVERS’ CLAUSE": parsed["7.18 MEMO 14: DISHONESTY OF DRIVERS’ CLAUSE"] || "Dishonesty not reported",
      "7.19 MEMO 15: RECORD OF GOODS WARRANTY": parsed["7.19 MEMO 15: RECORD OF GOODS WARRANTY"] || "Records not provided",
      "7.20 MEMO 16: VEHICLE LOAD CLAUSE": parsed["7.20 MEMO 16: VEHICLE LOAD CLAUSE"] || "Load not specified",
      "7.21 MEMO 17: TARPAULIN WARRANTY (APPLICABLE TO VEHICLE WITH OPEN BODY)": parsed["7.21 MEMO 17: TARPAULIN WARRANTY (APPLICABLE TO VEHICLE WITH OPEN BODY)"] || "Tarpaulin not applicable",
      "7.22 MEMO 18: CONTAINERIZED VEHICLES CLAUSE": parsed["7.22 MEMO 18: CONTAINERIZED VEHICLES CLAUSE"] || "Containerization not applicable",
      "7.23 MEMO 19: HIRED VEHICLE WARRANTY": parsed["7.23 MEMO 19: HIRED VEHICLE WARRANTY"] || "Hired vehicle not applicable",
      "7.24 MEMO 20: PRECAUTIONS AND PROTECTIONS": parsed["7.24 MEMO 20: PRECAUTIONS AND PROTECTIONS"] || "Precautions not specified",
      "7.25 MEMO 21: UNATTENDED VEHICLE WARRANTY": parsed["7.25 MEMO 21: UNATTENDED VEHICLE WARRANTY"] || "Unattended status not verified",
      "7.26 MEMO 22: INHERENT VICE OF THE SUBJECT MATTER": parsed["7.26 MEMO 22: INHERENT VICE OF THE SUBJECT MATTER"] || "Inherent vice not noted",
      "7.27 MEMO 23: EXCLUSION OF DELICATE GOODS": parsed["7.27 MEMO 23: EXCLUSION OF DELICATE GOODS"] || "Delicate goods not excluded",
      "7.28 MEMO 24: TERRORISM EXCLUSION CLAUSE": parsed["7.28 MEMO 24: TERRORISM EXCLUSION CLAUSE"] || "Terrorism not excluded",
      "7.29 MEMO 25: ALTERNATIVE DISPUTE RESOLUTION CLAUSE": parsed["7.29 MEMO 25: ALTERNATIVE DISPUTE RESOLUTION CLAUSE"] || "Dispute resolution not applicable",
      "7.30 MEMO 26: CLAIMS/LOSS RATIO WARRANTY": parsed["7.30 MEMO 26: CLAIMS/LOSS RATIO WARRANTY"] || "Loss ratio not specified",
      "7.31 MEMO 27: SALVAGE RETRIEVAL CLAUSE": parsed["7.31 MEMO 27: SALVAGE RETRIEVAL CLAUSE"] || "Salvage retrieval not applicable",
      "7.32 MEMO 28: PREMIUM PAYMENT DEFERRAL CLAUSE": parsed["7.32 MEMO 28: PREMIUM PAYMENT DEFERRAL CLAUSE"] || "Payment deferral not applicable",
      "7.33 MEMO 29: RIOT, STRIKES & CIVIL COMMOTION": parsed["7.33 MEMO 29: RIOT, STRIKES & CIVIL COMMOTION"] || "Riot not applicable",
      "7.34 MEMO 30: CLAIM NOTIFICATION AND DOCUMENTATION WARRANTY": parsed["7.34 MEMO 30: CLAIM NOTIFICATION AND DOCUMENTATION WARRANTY"] || "Notification not verified",
      "7.35 MEMO 31: NO PREMIUM NO COVER WARRANTY": parsed["7.35 MEMO 31: NO PREMIUM NO COVER WARRANTY"] || "No memo provided",
      "7.36 Photographs": parsed["7.36 Photographs"] || "No photographs available",
      "7.37 Adequacy of the Limit Per carrying": parsed["7.37 Adequacy of the Limit Per carrying"] || "Limit adequacy not assessed",
      "7.38 Other Insurances": parsed["7.38 Other Insurances"] || "No other insurances noted",
      "7.39 Breach of Policy Terms": parsed["7.39 Breach of Policy Terms"] || "No breaches identified",
      "7.40 SALVAGE": parsed["7.40 SALVAGE"] || "Salvage not evaluated",
      "8.0 THE INSURED’S CLAIM": parsed["8.0 THE INSURED’S CLAIM"] || "Claim details unavailable",
      "9.0 OUR VERIFICATION OF THE LOSS": parsed["9.0 OUR VERIFICATION OF THE LOSS"] || "Loss not verified",
      "10.0 CONSIDERATION OF LIABILITY": parsed["10.0 CONSIDERATION OF LIABILITY"] || "Liability not considered",
      "11.0 ADJUSTMENT": parsed["11.0 ADJUSTMENT"] || "No adjustment made",
      "12.0 RISK IMPROVEMENT": parsed["12.0 RISK IMPROVEMENT"] || "No improvements suggested",
      "13.0 DISCHARGE OF CLAIM": parsed["13.0 DISCHARGE OF CLAIM"] || "Claim not discharged",
      "14.0 LOSS ADJUSTERS’ FEES AND EXPENSES": parsed["14.0 LOSS ADJUSTERS’ FEES AND EXPENSES"] || "Fees not calculated",
      "15.0 SUMMARY OF ADJUSTMENT AND ADJUSTER’S BILL": parsed["15.0 SUMMARY OF ADJUSTMENT AND ADJUSTER’S BILL"] || "Summary not available",
      "16.0 METHOD OF SETTLEMENT": parsed["16.0 METHOD OF SETTLEMENT"] || "Settlement method not determined",
      "17.0 ATTACHMENT TO THE FINAL REPORT": parsed["17.0 ATTACHMENT TO THE FINAL REPORT"] || "No attachments provided"
    };
  } catch (error) {
    console.error('Full AI Error:', error.message);
    return {
      "PREFACE": "Analysis failed",
      "1.0 THE INSURED": "Insured details unavailable",
      "2.0 FACTS OF THE ACCIDENT": "No facts provided",
      "3.0 PROXIMATE CAUSE OF LOSS": "Cause unknown",
      "4.0 INTERVIEWS": "No interviews conducted",
      "4.1 Replace with name": "No interview details",
      "4.2 Replace with name": "No interview details",
      "5.0 MOTOR VEHICLE PARTICULARS": "Vehicle details unavailable",
      "6.0 DRIVER’S LICENSE": "License details unavailable",
      "7.0 POLICY TERMS AND CONDITIONS": "Terms not specified",
      "7.1 Scope of Cover": "Scope not defined",
      "7.2 Notification of Claim": "Notification not recorded",
      "7.3 Period of Cover": "Period not specified",
      "7.4 MEMO 2: JURISDICTION CLAUSE": "Jurisdiction not noted",
      "7.5 MEMO 5: AUTOMATIC REINSTATEMENT OF SUM INSURED AFTER LOSS CLAUSE": "Reinstatement not applicable",
      "7.6 MEMO 6: DOCUMENTARY EVIDENCE WARRANTY": "No evidence provided",
      "7.7 MEMO 8: EXCESS CLAUSE": "Excess not specified",
      "7.8 MEMO 14: MAINTENANCE WARRANTY": "Maintenance not verified",
      "7.9 MEMO 15: WAY BILL CLAUSE": "Way bill not provided",
      "7.10 MEMO 18: HIRED VEHICLE WARRANTY": "Hired vehicle not applicable",
      "7.11 MEMO 6: ARBITRATION CLAUSE": "Arbitration not applicable",
      "7.12 MEMO 7: LOADING AND UNLOADING EXTENSION CLAUSE": "Extension not applicable",
      "7.13 MEMO 9: DISAPPEARANCE OF CONVEYANCE CLAUSE": "Disappearance not noted",
      "7.14 MEMO 10: AUTOMATIC REINSTATEMENT OF SUM INSURED AFTER LOSS CLAUSE": "Reinstatement not applicable",
      "7.15 MEMO 11: POLITICAL RISKS EXCLUSION CLAUSE": "Political risks not excluded",
      "7.16 MEMO 12: COLLUSION CLAUSE": "Collusion not noted",
      "7.17 MEMO 13: CARE AND PROTECTION CLAUSE": "Care not verified",
      "7.18 MEMO 14: DISHONESTY OF DRIVERS’ CLAUSE": "Dishonesty not reported",
      "7.19 MEMO 15: RECORD OF GOODS WARRANTY": "Records not provided",
      "7.20 MEMO 16: VEHICLE LOAD CLAUSE": "Load not specified",
      "7.21 MEMO 17: TARPAULIN WARRANTY (APPLICABLE TO VEHICLE WITH OPEN BODY)": "Tarpaulin not applicable",
      "7.22 MEMO 18: CONTAINERIZED VEHICLES CLAUSE": "Containerization not applicable",
      "7.23 MEMO 19: HIRED VEHICLE WARRANTY": "Hired vehicle not applicable",
      "7.24 MEMO 20: PRECAUTIONS AND PROTECTIONS": "Precautions not specified",
      "7.25 MEMO 21: UNATTENDED VEHICLE WARRANTY": "Unattended status not verified",
      "7.26 MEMO 22: INHERENT VICE OF THE SUBJECT MATTER": "Inherent vice not noted",
      "7.27 MEMO 23: EXCLUSION OF DELICATE GOODS": "Delicate goods not excluded",
      "7.28 MEMO 24: TERRORISM EXCLUSION CLAUSE": "Terrorism not excluded",
      "7.29 MEMO 25: ALTERNATIVE DISPUTE RESOLUTION CLAUSE": "Dispute resolution not applicable",
      "7.30 MEMO 26: CLAIMS/LOSS RATIO WARRANTY": "Loss ratio not specified",
      "7.31 MEMO 27: SALVAGE RETRIEVAL CLAUSE": "Salvage retrieval not applicable",
      "7.32 MEMO 28: PREMIUM PAYMENT DEFERRAL CLAUSE": "Payment deferral not applicable",
      "7.33 MEMO 29: RIOT, STRIKES & CIVIL COMMOTION": "Riot not applicable",
      "7.34 MEMO 30: CLAIM NOTIFICATION AND DOCUMENTATION WARRANTY": "Notification not verified",
      "7.35 MEMO 31: NO PREMIUM NO COVER WARRANTY": "No memo provided",
      "7.36 Photographs": "No photographs available",
      "7.37 Adequacy of the Limit Per carrying": "Limit adequacy not assessed",
      "7.38 Other Insurances": "No other insurances noted",
      "7.39 Breach of Policy Terms": "No breaches identified",
      "7.40 SALVAGE": "Salvage not evaluated",
      "8.0 THE INSURED’S CLAIM": "Claim details unavailable",
      "9.0 OUR VERIFICATION OF THE LOSS": "Loss not verified",
      "10.0 CONSIDERATION OF LIABILITY": "Liability not considered",
      "11.0 ADJUSTMENT": "No adjustment made",
      "12.0 RISK IMPROVEMENT": "No improvements suggested",
      "13.0 DISCHARGE OF CLAIM": "Claim not discharged",
      "14.0 LOSS ADJUSTERS’ FEES AND EXPENSES": "Fees not calculated",
      "15.0 SUMMARY OF ADJUSTMENT AND ADJUSTER’S BILL": "Summary not available",
      "16.0 METHOD OF SETTLEMENT": "Settlement method not determined",
      "17.0 ATTACHMENT TO THE FINAL REPORT": "No attachments provided"
    };
  }
};