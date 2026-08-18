import React, { useState, useEffect } from 'react';
import {
  Container,
  Button,
  Alert,
  Form,
  Card,
  Row,
  Col,
  Badge,
  Tabs,
  Tab,
  ListGroup,
  Modal,
  Spinner,
  ButtonGroup,
} from 'react-bootstrap';
import CollaborationTab from './CollaborationTab';

const CLASSES_OF_BUSINESS = [
  'Agriculture',
  'Aircraft (Hull + Liability)',
  'Aircraft Liability',
  'Allied Lines',
  'Annuity',
  'Assistance',
  'Aviation',
  'Bloodstock',
  'Boiler & Machinery',
  'Bonds (Performance, Bid, Advance Payment, etc.)',
  'Bonds, Credit Guarantee & Suretyship',
  "Builders' Liability",
  'Burglary',
  'Business Interruption',
  'Capital Redemption',
  'Climate',
  'Combined Fire & Special Perils',
  'Combined Fire & Special Perils + Burglary',
  'Combined Fire & Special Perils + Burglary + Money',
  'Commercial Motor / Fleet',
  'Container Insurance',
  'Contractors All Risks (CAR)',
  'Credit Guarantee',
  'Credit Insurance',
  'Credit Life',
  'Crop',
  'Cyber',
  'Cyber Liability',
  'Cyber Risk',
  'Directors & Officers (D&O)',
  'Disability',
  'Electronic Equipment',
  "Employers' Liability",
  'Engineering',
  'Erection All Risks (EAR)',
  'Extended Coverage',
  'Extended Warranty',
  'Fidelity Guarantee',
  'Financial Guarantee',
  'Fire',
  'Fire & Special Peril',
  'Fire and Natural Forces',
  'Fraud',
  'General Accident',
  'General Liability',
  'GIT',
  'Glass',
  'Goods in Transit (GIT)',
  'Government Assets & Employees',
  'Group Life',
  'Hail',
  'Health',
  'Healthcare Professional Indemnity',
  'Individual Life',
  'Individual Life (Endowment)',
  'Individual Life (Term)',
  'Individual Life (Universal Life)',
  'Individual Life (Variable Life)',
  'Individual Life (Whole Life)',
  'Inland Marine',
  'Legal Expenses',
  'Linked',
  'Livestock',
  'Machinery Breakdown',
  'Marine',
  'Marine & Aviation',
  'Marine Cargo',
  'Marine Hull',
  'Marine, Aviation & Transport (MAT)',
  'Marriage and Birth',
  'Material Damage',
  'Medical',
  'Medical Malpractice',
  'Miscellaneous',
  'Money',
  'Money Insurance',
  'Mortgage Guarantee',
  'Motor',
  'Motor Physical Damage',
  'Motor Third-Party',
  'Motor Third-Party Liability only',
  'Motor Vehicle (Comprehensive)',
  'Motor Vehicle Liability',
  "Occupiers' Liability",
  'Oil & Gas',
  'Parametric',
  'Pension',
  'Personal Accident',
  'Pet Insurance',
  'Petroleum & Gas Stations',
  'Plant All Risks',
  'Plants All Risk',
  'Plate Glass',
  'Political Risk',
  'Product Liability',
  'Professional Indemnity',
  'Property',
  'Property (Buildings, Contents, All Risks)',
  'Public Liability',
  "Shipowners' Liability",
  'Sickness',
  'Sprinkler Leakage',
  'Suretyship',
  'Terrorism',
  'Theft',
  'Title Insurance',
  'Tontines (rare)',
  'Travel',
  'Unit-linked long-term',
  'Warranty',
  "Workmen's Compensation",
];

const REQUIRED_DOCUMENTS = {
  'Marine': ['Bill of Lading', 'Survey Report', 'Marine Certificate', 'Invoice', 'Packing List'],
  'Fire & Special Peril': ['Fire Service Report', 'Police Report', 'Building Valuation', 'Inventory List'],
  'Oil & Gas': ['Incident Report', 'Safety Assessment', 'Equipment Inspection Report', 'Maintenance Records'],
  'Professional Indemnity': ['Client Correspondence', 'Service Agreement', 'Professional Opinion', 'Legal Notice'],
  'Money': ['Police Report', 'Cash Register Records', 'Bank Statements', 'Security Footage Log'],
  'Burglary': ['Police Report', 'Break-in Assessment', 'Inventory of Stolen Items', 'Security System Report'],
  'Theft': ['Police Report', 'Statement of Loss', 'Proof of Ownership', 'CCTV Footage'],
  'Machinery Breakdown': ['Engineer Report', 'Maintenance History', 'Repair Estimate', 'Manufacturer Specifications'],
  'GIT': ['Goods in Transit Certificate', 'Transport Documents', 'Consignment Note', 'Driver Statement'],
  'Fraud': ['Police Report', 'Forensic Report', 'Transaction Records', 'Witness Statements'],
  'Business Interruption': ['Financial Statements', 'Profit & Loss Report', 'Business Continuity Plan', 'Revenue Records'],
  'Fidelity Guarantee': ['Employee Records', 'Audit Report', 'Financial Discrepancy Report', 'Internal Investigation'],
  'Property': ['Property Valuation', 'Damage Assessment', 'Repair Quotations', 'Title Documents'],
};

const AI_AGENTS = [
  { value: 'claude', label: 'Claude', description: 'Anthropic - Best for detailed analysis' },
  { value: 'chatgpt', label: 'ChatGPT', description: 'OpenAI - Versatile and creative' },
  { value: 'grok', label: 'Grok', description: 'xAI - Real-time insights' },
  { value: 'gemini', label: 'Gemini', description: 'Google - Multimodal processing' },
];

const DEFAULT_FOCUS_AREAS = [
  'INTRODUCTION',
  'THE INSURED',
  'INTERVIEWS',
  'POLICY TERMS AND CONDITIONS'
];

function Home() {
  // 'generate' is now the single merged workflow tab; 'collaboration' is unchanged.
  const [activeTab, setActiveTab] = useState('generate');
  const [selectedMode, setSelectedMode] = useState('');
  const [selectedAgent, setSelectedAgent] = useState('claude');

  // Claim metadata
  const [claimNumber, setClaimNumber] = useState('');
  const [policyNumber, setPolicyNumber] = useState('');
  const [insuredName, setInsuredName] = useState('');
  const [dateOfLoss, setDateOfLoss] = useState('');
  const [locationOfLoss, setLocationOfLoss] = useState('');
  const [lossDescription, setLossDescription] = useState('');

  const [classOfBusiness, setClassOfBusiness] = useState('');
  const [requiredDocsList, setRequiredDocsList] = useState([]);

  const [headlines, setHeadlines] = useState(
    Array.from({ length: 8 }, (_, i) => ({
      id: i + 1,
      value: '',
      subpoints: [],
    }))
  );

  const [interviewFields, setInterviewFields] = useState([
    { id: 1, name: '', conversation: '' }
  ]);

  // File states
  const [fieldReport, setFieldReport] = useState(null);
  const [policyDocument, setPolicyDocument] = useState(null);
  const [endorsement, setEndorsement] = useState(null);
  const [additionalDocs, setAdditionalDocs] = useState([]);
  const [supportingDocs, setSupportingDocs] = useState([]);
  const [receipts, setReceipts] = useState([]);
  const [photos, setPhotos] = useState([]);

  // Field report: upload OR link
  const [fieldReportMode, setFieldReportMode] = useState('upload'); // 'upload' | 'link'
  const [fieldReportLinkUrl, setFieldReportLinkUrl] = useState('');
  const [fieldReportLinkText, setFieldReportLinkText] = useState(null);
  const [resolvingLink, setResolvingLink] = useState(false);
  const [linkStatus, setLinkStatus] = useState(null); // { ok, message }

  const [excludePhotosFromAI, setExcludePhotosFromAI] = useState(false);

  // Instructions for the report — now REQUIRED for every report type (not
  // just scrutiny). This is what drives how closely the AI mirrors any
  // uploaded reference/training report and what deviations to make from it.
  const [customScrutinyPrompt, setCustomScrutinyPrompt] = useState('');
  const [submitAttempted, setSubmitAttempted] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [generatedReport, setGeneratedReport] = useState(null);

  // Training/Reference Reports State — Step 1 of the merged flow
  const [uploadingTraining, setUploadingTraining] = useState(false);
  const [trainingFiles, setTrainingFiles] = useState([]);
  const [trainingMetadata, setTrainingMetadata] = useState({
    reportType: 'scrutiny',
    classOfBusiness: '',
    description: '',
    author: '',
    yearWritten: new Date().getFullYear(),
  });
  const [showTrainingModal, setShowTrainingModal] = useState(false);
  const [loadedTrainingReports, setLoadedTrainingReports] = useState([]);
  const [useTraining, setUseTraining] = useState(true);
  const [trainingStepOpen, setTrainingStepOpen] = useState(true);

  // Class bullet-point presets (auto-fill + permanent save/clear)
  const [savingPreset, setSavingPreset] = useState(false);
  const [clearingPreset, setClearingPreset] = useState(false);
  const [presetMsg, setPresetMsg] = useState(null);

  // Review / rework loop
  const [reportAccepted, setReportAccepted] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [reworking, setReworking] = useState(false);
  const [reworkError, setReworkError] = useState(null);

  // Letterhead finalization — merged in as the last step instead of a tab
  const [letterheadTemplate, setLetterheadTemplate] = useState(null);
  const [letterheadLoading, setLetterheadLoading] = useState(false);
  const [letterheadError, setLetterheadError] = useState(null);
  const [letterheadResult, setLetterheadResult] = useState(null);
  const [letterheadSessionId, setLetterheadSessionId] = useState(null);

  const API_URL = process.env.REACT_APP_API_URL || '';

  useEffect(() => {
    if (classOfBusiness) {
      setRequiredDocsList(REQUIRED_DOCUMENTS[classOfBusiness] || []);
    } else {
      setRequiredDocsList([]);
    }
  }, [classOfBusiness]);

  // Auto-fill headlines/subpoints from the saved class preset (GIT ships
  // pre-populated from the Indorama final report; other classes fill in
  // once someone saves a default for them — see saveClassBulletsAsDefault).
  useEffect(() => {
    if (!classOfBusiness) return;
    setPresetMsg(null);
    fetch(`${API_URL}/api/class-bullets/${encodeURIComponent(classOfBusiness)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.headlines?.length) {
          setHeadlines(data.headlines);
        }
        // else: nothing saved yet for this class — leave current headlines as-is.
      })
      .catch(() => {}); // preset is a convenience, not required
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classOfBusiness]);

  // Load training reports on component mount
  useEffect(() => {
    fetchTrainingReports();
  }, []);

  const fetchTrainingReports = async () => {
    try {
      const response = await fetch(`${API_URL}/api/files/training-reports`);
      const data = await response.json();
      if (data.success) {
        setLoadedTrainingReports(data.reports || []);
      }
    } catch (err) {
      console.error('Error fetching training reports:', err);
    }
  };

  // Headline helpers
  const addHeadline = () => {
    const newId = Math.max(...headlines.map(h => h.id), 0) + 1;
    setHeadlines([...headlines, { id: newId, value: '', subpoints: [] }]);
  };

  // Inserts a new blank headline directly after the given one, rather than
  // always appending to the end — lets someone drop a headline in-between
  // existing ones without deleting and rebuilding everything below it.
  const insertHeadlineAfter = (afterId) => {
    setHeadlines(prev => {
      const newId = Math.max(...prev.map(h => h.id), 0) + 1;
      const index = prev.findIndex(h => h.id === afterId);
      const updated = [...prev];
      updated.splice(index + 1, 0, { id: newId, value: '', subpoints: [] });
      return updated;
    });
  };

  // Swaps a headline with its neighbor — reordering without deleting.
  const moveHeadlineUp = (id) => {
    setHeadlines(prev => {
      const index = prev.findIndex(h => h.id === id);
      if (index <= 0) return prev;
      const updated = [...prev];
      [updated[index - 1], updated[index]] = [updated[index], updated[index - 1]];
      return updated;
    });
  };

  const moveHeadlineDown = (id) => {
    setHeadlines(prev => {
      const index = prev.findIndex(h => h.id === id);
      if (index === -1 || index >= prev.length - 1) return prev;
      const updated = [...prev];
      [updated[index + 1], updated[index]] = [updated[index], updated[index + 1]];
      return updated;
    });
  };

  const removeHeadline = (id) => {
    setHeadlines(headlines.filter(h => h.id !== id));
  };

  const updateHeadline = (id, value) => {
    setHeadlines(headlines.map(h => h.id === id ? { ...h, value } : h));
  };

  const addSubpoint = (mainId) => {
    setHeadlines(headlines.map(h => {
      if (h.id === mainId) {
        const newSubId = Math.max(...h.subpoints.map(s => s.id || 0), 0) + 1;
        return { ...h, subpoints: [...h.subpoints, { id: newSubId, value: '' }] };
      }
      return h;
    }));
  };

  const updateSubpoint = (mainId, subId, value) => {
    setHeadlines(headlines.map(h => {
      if (h.id === mainId) {
        return {
          ...h,
          subpoints: h.subpoints.map(s => s.id === subId ? { ...s, value } : s)
        };
      }
      return h;
    }));
  };

  const removeSubpoint = (mainId, subId) => {
    setHeadlines(headlines.map(h => {
      if (h.id === mainId) {
        return { ...h, subpoints: h.subpoints.filter(s => s.id !== subId) };
      }
      return h;
    }));
  };

  // Permanent per-class bullet-point presets
  const saveClassBulletsAsDefault = async () => {
    if (!classOfBusiness) return;
    setSavingPreset(true);
    setPresetMsg(null);
    try {
      const res = await fetch(`${API_URL}/api/class-bullets/${encodeURIComponent(classOfBusiness)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ headlines }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      setPresetMsg({ ok: true, text: `Saved as the default bullet set for ${classOfBusiness}.` });
    } catch (err) {
      setPresetMsg({ ok: false, text: err.message });
    } finally {
      setSavingPreset(false);
    }
  };

  const clearClassBulletsDefault = async () => {
    if (!classOfBusiness) return;
    if (!window.confirm(`Remove the saved default bullet set for ${classOfBusiness}?`)) return;
    setClearingPreset(true);
    setPresetMsg(null);
    try {
      const res = await fetch(`${API_URL}/api/class-bullets/${encodeURIComponent(classOfBusiness)}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      setPresetMsg({ ok: true, text: `Cleared the saved default for ${classOfBusiness}.` });
    } catch (err) {
      setPresetMsg({ ok: false, text: err.message });
    } finally {
      setClearingPreset(false);
    }
  };

  // Interview field helpers
  const addInterviewField = () => {
    const newId = Math.max(...interviewFields.map(f => f.id), 0) + 1;
    setInterviewFields([...interviewFields, { id: newId, name: '', conversation: '' }]);
  };

  const removeInterviewField = (id) => {
    setInterviewFields(interviewFields.filter(f => f.id !== id));
  };

  const updateInterviewField = (id, field, value) => {
    setInterviewFields(interviewFields.map(f =>
      f.id === id ? { ...f, [field]: value } : f
    ));
  };

  const hasInterviewsSelected = headlines.some(h =>
    h.value.toUpperCase().includes('INTERVIEW')
  );

  // File helpers
  const handleFileChange = (setter) => (e) => {
    if (e.target.files?.[0]) {
      setter(e.target.files[0]);
    }
  };

  const handleMultipleFiles = (setter) => (e) => {
    if (e.target.files) {
      setter(Array.from(e.target.files));
    }
  };

  const removeFileFromList = (setter, index) => () => {
    setter(prev => prev.filter((_, i) => i !== index));
  };

  const removePhoto = (index) => () => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  // Field report link resolution
  const resolveFieldReportLink = async () => {
    if (!fieldReportLinkUrl.trim()) return;
    setResolvingLink(true);
    setLinkStatus(null);
    try {
      const res = await fetch(`${API_URL}/api/files/fetch-link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: fieldReportLinkUrl.trim(), agent: selectedAgent }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || 'Could not read that link');
      setFieldReportLinkText(data.text);
      setFieldReport(null);
      setLinkStatus({
        ok: true,
        message: data.source?.startsWith('ai-agent-fallback')
          ? `Read via ${selectedAgent} (page needed AI extraction)`
          : 'Field report read successfully',
      });
    } catch (err) {
      setFieldReportLinkText(null);
      setLinkStatus({ ok: false, message: err.message });
    } finally {
      setResolvingLink(false);
    }
  };

  // Training report upload
  const handleTrainingFilesChange = (e) => {
    if (e.target.files) {
      setTrainingFiles(Array.from(e.target.files));
    }
  };

  const uploadTrainingReports = async () => {
    if (trainingFiles.length === 0) {
      setError('Please select at least one training report to upload');
      return;
    }

    if (!trainingMetadata.reportType || !trainingMetadata.classOfBusiness) {
      setError('Please fill in report type and class of business for training reports');
      return;
    }

    setUploadingTraining(true);
    setError(null);

    try {
      const formData = new FormData();
      trainingFiles.forEach(file => formData.append('trainingReports', file));
      formData.append('metadata', JSON.stringify(trainingMetadata));

      const response = await fetch(`${API_URL}/api/files/upload-training`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      if (!data.success) throw new Error(data.message || 'Upload failed');

      alert(`Successfully uploaded ${trainingFiles.length} training report(s)! The system will use it to match style and structure.`);
      setTrainingFiles([]);
      setTrainingMetadata({
        reportType: 'scrutiny',
        classOfBusiness: '',
        description: '',
        author: '',
        yearWritten: new Date().getFullYear(),
      });
      fetchTrainingReports();
      setTrainingStepOpen(false); // collapse Step 1 once assimilated; user can reopen to add more
    } catch (err) {
      setError(err.message || 'Error uploading training reports');
    } finally {
      setUploadingTraining(false);
    }
  };

  const deleteTrainingReport = async (reportId) => {
    if (!window.confirm('Are you sure you want to delete this training report?')) {
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/files/training-reports/${reportId}`, {
        method: 'DELETE',
      });

      const data = await response.json();
      if (!data.success) throw new Error(data.message || 'Delete failed');

      alert('Training report deleted successfully!');
      fetchTrainingReports();
    } catch (err) {
      setError(err.message || 'Error deleting training report');
    }
  };

  // Report generation
  const handleGenerate = async () => {
    setSubmitAttempted(true);

    if (!selectedMode) return setError('Please select a mode');
    if (!selectedAgent) return setError('Please select an AI agent');
    if (!classOfBusiness) return setError('Please select Class of Business');
    if (!customScrutinyPrompt.trim()) {
      return setError('Please provide instructions for this report before generating.');
    }
    if (!fieldReport && !fieldReportLinkText) {
      return setError('Please upload the Field Report or provide a link to it');
    }

    if (selectedMode === 'final' && !policyDocument) {
      return setError('Please upload the Policy Document for Final Report');
    }

    const formData = new FormData();

    let reportTypeForApi = selectedMode === 'preliminary' ? 'interim' : selectedMode;

    formData.append('reportType', reportTypeForApi);
    formData.append('classOfBusiness', classOfBusiness);
    formData.append('aiAgent', selectedAgent);

    formData.append('claimNumber', claimNumber);
    formData.append('policyNumber', policyNumber);
    formData.append('insuredName', insuredName);
    formData.append('dateOfLoss', dateOfLoss);
    formData.append('locationOfLoss', locationOfLoss);
    formData.append('lossDescription', lossDescription);

    // Add training preference
    formData.append('useTraining', useTraining);

    // Instructions are now required for every report type — always send
    // them, not just for scrutiny (backend metadata.customPrompt needs to
    // be wired up for the 'interim'/'final' report types too).
    formData.append('customScrutinyPrompt', customScrutinyPrompt.trim());

    if (hasInterviewsSelected) {
      formData.append('interviews', JSON.stringify(interviewFields.filter(f =>
        f.name.trim() || f.conversation.trim()
      )));
    }

    const structuredHeadlines = headlines
      .filter(h => h.value.trim() || h.subpoints.some(s => s.value.trim()))
      .map(h => ({
        main: h.value.trim(),
        number: `${h.id}.0`,
        subpoints: h.subpoints
          .filter(s => s.value.trim())
          .map((s, idx) => ({
            title: s.value.trim(),
            number: `${h.id}.${idx + 1}`,
          })),
      }));

    formData.append('headlines', JSON.stringify(structuredHeadlines));
    formData.append('excludePhotosFromAI', excludePhotosFromAI);

    // Field report: file OR resolved link text (backend: accept either
    // `questionnaire` file or a `fieldReportText` string — see
    // IMPLEMENTATION_PLAN.md §2 for the reportGenerator.js change needed).
    if (fieldReport) {
      formData.append('questionnaire', fieldReport);
    } else if (fieldReportLinkText) {
      formData.append('fieldReportText', fieldReportLinkText);
      formData.append('fieldReportSourceUrl', fieldReportLinkUrl.trim());
    }

    if (policyDocument) {
      formData.append('policyDocument', policyDocument);
    }

    if (endorsement) {
      formData.append('endorsement', endorsement);
    }

    [...additionalDocs, ...supportingDocs].forEach(file =>
      formData.append('additionalDocs', file)
    );

    // Receipts sent under their own field — see route/files.js multer
    // config in IMPLEMENTATION_PLAN.md (add { name: 'receipts', maxCount: 12 }).
    receipts.forEach(file => formData.append('receipts', file));

    photos.forEach(photo => formData.append('photos', photo));

    setLoading(true);
    setError(null);
    setReportAccepted(false);
    setLetterheadResult(null);

    try {
      const response = await fetch(`${API_URL}/api/files/process-files`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      if (!data.success) throw new Error(data.message || 'Failed to process');

      setGeneratedReport(data.report);
    } catch (err) {
      setError(err.message || 'Error generating report');
    } finally {
      setLoading(false);
    }
  };

  // Rework loop — send feedback, get a revised report back in place
  const submitRework = async () => {
    if (!feedback.trim()) return;
    setReworking(true);
    setReworkError(null);
    try {
      const res = await fetch(`${API_URL}/api/files/rework`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentReport: generatedReport,
          feedback: feedback.trim(),
          aiAgent: selectedAgent,
          reportType: selectedMode === 'preliminary' ? 'interim' : selectedMode,
          classOfBusiness,
          claimNumber,
          policyNumber,
          insuredName,
          dateOfLoss,
          locationOfLoss,
          lossDescription,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || 'Rework failed');
      setGeneratedReport(data.report);
      setFeedback('');
      setShowFeedback(false);
    } catch (err) {
      setReworkError(err.message);
    } finally {
      setReworking(false);
    }
  };

  // Download handlers
  const downloadReportAsTxt = () => {
    if (!generatedReport) return;
    const blob = new Blob([generatedReport], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedMode}_report_${claimNumber || 'generated'}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadReportAsDocx = async () => {
    if (!generatedReport) return;

    try {
      // Multipart, not JSON — the original photo File objects ride along so
      // the "Photo: <filename> — <caption>" lines in the report text can be
      // matched to real image bytes and embedded server-side.
      const formData = new FormData();
      formData.append('reportText', generatedReport);
      formData.append('metadata', JSON.stringify({
        reportType: selectedMode === 'preliminary' ? 'interim' : selectedMode,
        aiAgent: selectedAgent,
        claimNumber,
        policyNumber,
        insuredName,
        dateOfLoss,
        locationOfLoss,
        classOfBusiness,
        generatedAt: new Date().toISOString(),
      }));
      photos.forEach(photo => formData.append('photos', photo));

      const res = await fetch(`${API_URL}/api/files/export/docx`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        throw new Error(`Server responded ${res.status}: ${errText || 'Download failed'}`);
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${selectedMode}_report_${claimNumber || 'generated'}.docx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError('DOCX download failed: ' + err.message);
    }
  };

  // Letterhead finalization — merged in here instead of a separate tab.
  // Reuses the existing /api/files/letterhead-rewrite endpoint by turning
  // the accepted report text into a file client-side, so no backend
  // change is required for this step specifically.
  const submitLetterhead = async () => {
    if (!letterheadTemplate) {
      setLetterheadError('Please upload your letterhead template.');
      return;
    }
    setLetterheadLoading(true);
    setLetterheadError(null);
    try {
      const reportFile = new File(
        [generatedReport],
        `${selectedMode}_report_${claimNumber || 'generated'}.txt`,
        { type: 'text/plain' }
      );
      const formData = new FormData();
      formData.append('letterhead', letterheadTemplate);
      formData.append('fieldReports', reportFile);
      formData.append('agent', selectedAgent);
      formData.append(
        'instructions',
        'Place this accepted, final report onto the letterhead exactly as written — apply the letterhead formatting only, do not alter the wording.'
      );
      formData.append('isFollowUp', 'false');
      formData.append('metadata', JSON.stringify({
        claimNumber, policyNumber, insuredName, dateOfLoss, locationOfLoss, classOfBusiness,
      }));

      const res = await fetch(`${API_URL}/api/files/letterhead-rewrite`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || 'Failed to place on letterhead');

      setLetterheadSessionId(data.sessionId);
      setLetterheadResult(data.report);
    } catch (err) {
      setLetterheadError(err.message || 'Error placing report on letterhead');
    } finally {
      setLetterheadLoading(false);
    }
  };

  const downloadLetterheadAsTxt = () => {
    if (!letterheadResult) return;
    const blob = new Blob([letterheadResult], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `letterhead_${selectedMode}_report_${claimNumber || 'final'}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadLetterheadAsDocx = async () => {
    if (!letterheadResult) return;
    try {
      // Multipart, not JSON — same reasoning as downloadReportAsDocx above.
      const formData = new FormData();
      formData.append('reportText', letterheadResult);
      formData.append('metadata', JSON.stringify({
        reportType: selectedMode === 'preliminary' ? 'interim' : selectedMode,
        aiAgent: selectedAgent,
        claimNumber,
        policyNumber,
        insuredName,
        dateOfLoss,
        locationOfLoss,
        classOfBusiness,
        generatedAt: new Date().toISOString(),
        letterhead: true,
      }));
      photos.forEach(photo => formData.append('photos', photo));

      const res = await fetch(`${API_URL}/api/files/export/docx`, {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) throw new Error(`Server responded ${res.status}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `letterhead_${selectedMode}_report_${claimNumber || 'final'}.docx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setLetterheadError('DOCX download failed: ' + err.message);
    }
  };

  // Filter training reports by current selection
  const relevantTrainingReports = loadedTrainingReports.filter(report => {
    if (!classOfBusiness) return false;
    const reportType = selectedMode === 'preliminary' ? 'interim' : selectedMode;
    return report.classOfBusiness === classOfBusiness &&
           (!reportType || report.reportType === reportType);
  });

  return (
    <Container className="py-4">
      <h1 className="mb-4 text-center">Topclass Adjusters Claims Processing</h1>

      <Tabs activeKey={activeTab} onSelect={(k) => setActiveTab(k)} className="mb-4">
        {/* MERGED WORKFLOW TAB */}
        <Tab eventKey="generate" title="Generate Report">

          {/* STEP 1 — TRAINING REPORTS (assimilated first) */}
          <Card className="mb-4 border-primary">
            <Card.Body>
              <div
                className="d-flex justify-content-between align-items-center"
                style={{ cursor: 'pointer' }}
                onClick={() => setTrainingStepOpen(o => !o)}
              >
                <h3 className="mb-0">
                  Step 1 · Training Reports{' '}
                  <Badge bg="secondary">{loadedTrainingReports.length} on file</Badge>
                </h3>
                <Button variant="link" size="sm">{trainingStepOpen ? 'Collapse' : 'Expand'}</Button>
              </div>

              {trainingStepOpen && (
                <>
                  <Alert variant="info" className="mt-3">
                    <strong>How it works:</strong> Upload your existing high-quality reports first.
                    The system assimilates them — learning writing style, structure, terminology,
                    table formatting, and photo placement — before you move on to building a new
                    report below. The new report will mirror this format, with room for the
                    instructions you give it in Step 3.
                  </Alert>

                  <Card className="mb-4 border-primary">
                    <Card.Body>
                      <h5>Upload New Training Reports</h5>

                      <Form.Group className="mb-3">
                        <Form.Label>Select Report Files</Form.Label>
                        <Form.Control
                          type="file"
                          multiple
                          accept=".docx,.pdf,.txt"
                          onChange={handleTrainingFilesChange}
                        />
                        {trainingFiles.length > 0 && (
                          <div className="mt-2">
                            <strong>Selected Files:</strong>
                            {trainingFiles.map((file, idx) => (
                              <Badge key={idx} bg="secondary" className="me-2 mb-1 d-block">
                                {file.name}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </Form.Group>

                      <Row>
                        <Col md={6}>
                          <Form.Group className="mb-3">
                            <Form.Label>Report Type</Form.Label>
                            <Form.Select
                              value={trainingMetadata.reportType}
                              onChange={e => setTrainingMetadata({ ...trainingMetadata, reportType: e.target.value })}
                            >
                              <option value="scrutiny">Scrutiny</option>
                              <option value="interim">Preliminary/Interim</option>
                              <option value="final">Final</option>
                            </Form.Select>
                          </Form.Group>
                        </Col>
                        <Col md={6}>
                          <Form.Group className="mb-3">
                            <Form.Label>Class of Business</Form.Label>
                            <Form.Select
                              value={trainingMetadata.classOfBusiness}
                              onChange={e => setTrainingMetadata({ ...trainingMetadata, classOfBusiness: e.target.value })}
                            >
                              <option value="">-- Select Class --</option>
                              {CLASSES_OF_BUSINESS.map(cls => (
                                <option key={cls} value={cls}>{cls}</option>
                              ))}
                            </Form.Select>
                          </Form.Group>
                        </Col>
                      </Row>

                      <Row>
                        <Col md={6}>
                          <Form.Group className="mb-3">
                            <Form.Label>Author/Adjuster Name (Optional)</Form.Label>
                            <Form.Control
                              value={trainingMetadata.author}
                              onChange={e => setTrainingMetadata({ ...trainingMetadata, author: e.target.value })}
                              placeholder="e.g., John Smith"
                            />
                          </Form.Group>
                        </Col>
                        <Col md={6}>
                          <Form.Group className="mb-3">
                            <Form.Label>Year Written (Optional)</Form.Label>
                            <Form.Control
                              type="number"
                              value={trainingMetadata.yearWritten}
                              onChange={e => setTrainingMetadata({ ...trainingMetadata, yearWritten: parseInt(e.target.value) })}
                              min="2000"
                              max={new Date().getFullYear()}
                            />
                          </Form.Group>
                        </Col>
                      </Row>

                      <Form.Group className="mb-3">
                        <Form.Label>Description (Optional)</Form.Label>
                        <Form.Control
                          as="textarea"
                          rows={2}
                          value={trainingMetadata.description}
                          onChange={e => setTrainingMetadata({ ...trainingMetadata, description: e.target.value })}
                          placeholder="Brief description of this report (e.g., Warehouse fire claim with detailed damage assessment)"
                        />
                      </Form.Group>

                      <Button
                        variant="primary"
                        onClick={uploadTrainingReports}
                        disabled={uploadingTraining || trainingFiles.length === 0}
                      >
                        {uploadingTraining ? 'Uploading...' : 'Upload & Assimilate'}
                      </Button>
                    </Card.Body>
                  </Card>

                  <h5 className="mb-3">Uploaded Training Reports ({loadedTrainingReports.length})</h5>

                  {loadedTrainingReports.length === 0 ? (
                    <Alert variant="warning">
                      No training reports uploaded yet. Upload some reference reports to train the AI.
                    </Alert>
                  ) : (
                    <ListGroup>
                      {loadedTrainingReports.map(report => (
                        <ListGroup.Item key={report.id}>
                          <Row className="align-items-center">
                            <Col md={8}>
                              <div>
                                <strong>{report.filename}</strong>
                                <br />
                                <Badge bg="info" className="me-2">{report.reportType}</Badge>
                                <Badge bg="secondary" className="me-2">{report.classOfBusiness}</Badge>
                                {report.author && <small className="text-muted">by {report.author}</small>}
                              </div>
                              {report.description && (
                                <small className="text-muted d-block mt-1">{report.description}</small>
                              )}
                              <small className="text-muted">
                                Uploaded: {new Date(report.uploadedAt).toLocaleDateString()}
                                {report.yearWritten && ` | Written: ${report.yearWritten}`}
                              </small>
                            </Col>
                            <Col md={4} className="text-end">
                              <Button
                                variant="outline-danger"
                                size="sm"
                                onClick={() => deleteTrainingReport(report.id)}
                              >
                                Delete
                              </Button>
                            </Col>
                          </Row>
                        </ListGroup.Item>
                      ))}
                    </ListGroup>
                  )}
                </>
              )}
            </Card.Body>
          </Card>

          {/* STEP 2 — CLASS, TASK, AGENT, CLAIM METADATA */}
          <Card className="mb-4">
            <Card.Body>
              <h3 className="mb-3">Step 2 · Claim Setup</h3>

              <Form.Group className="mb-4">
                <Form.Label>Select Class of Business</Form.Label>
                <Form.Select
                  value={classOfBusiness}
                  onChange={e => setClassOfBusiness(e.target.value)}
                >
                  <option value="">-- Choose Class --</option>
                  {CLASSES_OF_BUSINESS.map(cls => (
                    <option key={cls} value={cls}>{cls}</option>
                  ))}
                </Form.Select>
              </Form.Group>

              {requiredDocsList.length > 0 && (
                <Alert variant="info" className="mb-4">
                  <strong>Suggested Documents for {classOfBusiness}:</strong>
                  <ul className="mb-0 mt-2">
                    {requiredDocsList.map((doc, idx) => (
                      <li key={idx}>{doc}</li>
                    ))}
                  </ul>
                  <small className="text-muted d-block mt-2">
                    Note: These are recommended but not mandatory
                  </small>
                </Alert>
              )}

              <Form.Group className="mb-4">
                <Form.Label>Choose Task</Form.Label>
                <div className="d-flex flex-wrap gap-2">
                  <Button
                    variant={selectedMode === 'scrutiny' ? 'primary' : 'outline-primary'}
                    onClick={() => setSelectedMode('scrutiny')}
                  >
                    Field Report Scrutiny / Analysis
                  </Button>
                  <Button
                    variant={selectedMode === 'preliminary' ? 'primary' : 'outline-primary'}
                    onClick={() => setSelectedMode('preliminary')}
                  >
                    Preliminary Report
                  </Button>
                  <Button
                    variant={selectedMode === 'final' ? 'primary' : 'outline-primary'}
                    onClick={() => setSelectedMode('final')}
                  >
                    Final Report
                  </Button>
                </div>
              </Form.Group>

              <Form.Group className="mb-4">
                <Form.Label className="d-flex align-items-center gap-2">
                  Select AI Agent <Badge bg="info">Sonnet 5 / Opus 4.8 · GPT-5.5 · Grok 4.5 · Gemini 3.1/3.5</Badge>
                </Form.Label>
                <Row>
                  {AI_AGENTS.map(agent => (
                    <Col md={6} lg={3} key={agent.value} className="mb-3">
                      <Card
                        className={`h-100 cursor-pointer ${selectedAgent === agent.value ? 'border-primary border-2' : ''}`}
                        onClick={() => setSelectedAgent(agent.value)}
                        style={{ cursor: 'pointer' }}
                      >
                        <Card.Body className="text-center">
                          <Form.Check
                            type="radio"
                            id={`agent-${agent.value}`}
                            name="aiAgent"
                            checked={selectedAgent === agent.value}
                            onChange={() => {}}
                            label=""
                            className="mb-2"
                          />
                          <strong className="d-block mb-1">{agent.label}</strong>
                          <small className="text-muted">{agent.description}</small>
                        </Card.Body>
                      </Card>
                    </Col>
                  ))}
                </Row>
              </Form.Group>

              {relevantTrainingReports.length > 0 && (
                <Alert variant="success" className="mb-4">
                  <div className="d-flex justify-content-between align-items-center">
                    <div>
                      <strong>📚 Training Available:</strong> {relevantTrainingReports.length} reference report(s) found for {classOfBusiness} {selectedMode ? `(${selectedMode})` : ''}
                    </div>
                    <Form.Check
                      type="switch"
                      id="use-training"
                      label="Use Training"
                      checked={useTraining}
                      onChange={e => setUseTraining(e.target.checked)}
                    />
                  </div>
                  <Button
                    variant="link"
                    size="sm"
                    onClick={() => setShowTrainingModal(true)}
                    className="p-0 mt-2"
                  >
                    View Training Reports
                  </Button>
                </Alert>
              )}

              {selectedMode && (
                <>
                  <Row>
                    <Col md={6}><Form.Group className="mb-3">
                      <Form.Label>Claim Number</Form.Label>
                      <Form.Control
                        value={claimNumber}
                        onChange={e => setClaimNumber(e.target.value)}
                        placeholder="e.g. CLM-2026-00123"
                      />
                    </Form.Group></Col>
                    <Col md={6}><Form.Group className="mb-3">
                      <Form.Label>Policy Number</Form.Label>
                      <Form.Control
                        value={policyNumber}
                        onChange={e => setPolicyNumber(e.target.value)}
                      />
                    </Form.Group></Col>
                  </Row>

                  <Form.Group className="mb-3">
                    <Form.Label>Insured Name</Form.Label>
                    <Form.Control
                      value={insuredName}
                      onChange={e => setInsuredName(e.target.value)}
                    />
                  </Form.Group>

                  <Row>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Date of Loss</Form.Label>
                        <Form.Control
                          type="date"
                          value={dateOfLoss}
                          onChange={e => setDateOfLoss(e.target.value)}
                        />
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Location of Loss</Form.Label>
                        <Form.Control
                          value={locationOfLoss}
                          onChange={e => setLocationOfLoss(e.target.value)}
                          placeholder="City, Address"
                        />
                      </Form.Group>
                    </Col>
                  </Row>

                  <Form.Group className="mb-4">
                    <Form.Label>Loss Description</Form.Label>
                    <Form.Control
                      as="textarea"
                      rows={3}
                      value={lossDescription}
                      onChange={e => setLossDescription(e.target.value)}
                      placeholder="Brief summary of the incident..."
                    />
                  </Form.Group>
                </>
              )}
            </Card.Body>
          </Card>

          {/* STEP 3+ — DOCUMENTS, BULLETS, GENERATION (only once a task is chosen) */}
          {selectedMode && (
            <Card className="mb-4">
              <Card.Body>
                <div className="d-flex justify-content-between align-items-center mb-4">
                  <h3 className="mb-0">
                    Step 3 · {selectedMode === 'scrutiny'
                      ? 'Field Report Scrutiny & Analysis'
                      : `${selectedMode.charAt(0).toUpperCase() + selectedMode.slice(1)} Report`}
                  </h3>
                  <Badge bg="secondary" className="fs-6">
                    Using: {AI_AGENTS.find(a => a.value === selectedAgent)?.label}
                  </Badge>
                </div>

                {selectedMode === 'scrutiny' && (
                  <Alert variant="info" className="mb-4">
                    <strong>AI Expert Mode:</strong> The AI will act as an experienced insurance claims adjuster.
                    It will review the field report in detail, ask intelligent probing questions,
                    highlight missing details, inconsistencies, or gaps in evidence,
                    suggest documents/photographs needed, and provide tailored recommendations
                    based on the selected class of business.
                  </Alert>
                )}

                {/* Instructions — REQUIRED for every report type. This is what
                    tells the AI how closely to mirror the uploaded reference/
                    training report and what to change from the standard format. */}
                <Card className="mb-4 border-warning">
                  <Card.Body>
                    <Form.Group>
                      <Form.Label className="d-flex align-items-center gap-2">
                        <strong>Instructions for This Report</strong>
                        <Badge bg="danger">Required</Badge>
                      </Form.Label>
                      <Form.Control
                        as="textarea"
                        rows={4}
                        value={customScrutinyPrompt}
                        onChange={e => setCustomScrutinyPrompt(e.target.value)}
                        placeholder="Tell the AI what to focus on, how closely to mirror the attached reference/training report, and any modifications you want from the standard format..."
                        isInvalid={submitAttempted && !customScrutinyPrompt.trim()}
                      />
                      <Form.Text className="text-muted">
                        This drives how the AI writes the report — including how closely it
                        mirrors any training/reference report uploaded in Step 1. Required for
                        every report type.
                      </Form.Text>
                      <Form.Control.Feedback type="invalid">
                        Please provide instructions for this report before generating.
                      </Form.Control.Feedback>
                    </Form.Group>
                  </Card.Body>
                </Card>

                {/* Field Report — upload OR link */}
                <Form.Group className="mb-4">
                  <Form.Label>Field Report (required)</Form.Label>
                  <Tabs
                    activeKey={fieldReportMode}
                    onSelect={(k) => {
                      setFieldReportMode(k);
                      if (k === 'upload') {
                        setFieldReportLinkText(null);
                        setLinkStatus(null);
                      } else {
                        setFieldReport(null);
                      }
                    }}
                    className="mb-2"
                  >
                    <Tab eventKey="upload" title="Upload file">
                      <Form.Control
                        type="file"
                        accept=".docx,.pdf,.txt"
                        onChange={handleFileChange(setFieldReport)}
                      />
                      {fieldReport && <small className="text-success d-block mt-1">✓ {fieldReport.name}</small>}
                    </Tab>
                    <Tab eventKey="link" title="Paste a link">
                      <div className="d-flex gap-2">
                        <Form.Control
                          type="url"
                          placeholder="https://... link to the field report"
                          value={fieldReportLinkUrl}
                          onChange={e => setFieldReportLinkUrl(e.target.value)}
                        />
                        <Button
                          onClick={resolveFieldReportLink}
                          disabled={resolvingLink || !fieldReportLinkUrl.trim()}
                        >
                          {resolvingLink ? <Spinner size="sm" animation="border" /> : 'Read link'}
                        </Button>
                      </div>
                      {linkStatus && (
                        <Alert variant={linkStatus.ok ? 'success' : 'danger'} className="mt-2 py-2 mb-0">
                          {linkStatus.message}
                        </Alert>
                      )}
                    </Tab>
                  </Tabs>
                </Form.Group>

                <Form.Group className="mb-4">
                  <Form.Label>
                    Upload Policy Document {selectedMode === 'final' ? '(required)' : '(optional)'}
                  </Form.Label>
                  <Form.Control
                    type="file"
                    accept=".docx,.pdf,.txt"
                    onChange={handleFileChange(setPolicyDocument)}
                  />
                  {policyDocument && <small className="text-success d-block mt-1">✓ {policyDocument.name}</small>}
                </Form.Group>

                <Form.Group className="mb-4">
                  <Form.Label>Upload Endorsement (optional)</Form.Label>
                  <Form.Control
                    type="file"
                    accept=".docx,.pdf,.txt"
                    onChange={handleFileChange(setEndorsement)}
                  />
                  {endorsement && <small className="text-success d-block mt-1">✓ {endorsement.name}</small>}
                </Form.Group>

                <Form.Group className="mb-4">
                  <Form.Label>Additional Documents (optional)</Form.Label>
                  <Form.Control
                    type="file"
                    multiple
                    accept=".docx,.pdf,.txt,.xls,.xlsx"
                    onChange={handleMultipleFiles(setAdditionalDocs)}
                  />
                  {additionalDocs.length > 0 && (
                    <div className="mt-2">
                      {additionalDocs.map((file, idx) => (
                        <Badge key={idx} bg="secondary" className="me-2 mb-1">
                          {file.name}
                          <Button variant="link" size="sm" className="text-white p-0 ms-1" onClick={removeFileFromList(setAdditionalDocs, idx)}>×</Button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </Form.Group>

                <Form.Group className="mb-4">
                  <Form.Label>Receipts (optional)</Form.Label>
                  <Form.Control
                    type="file"
                    multiple
                    accept=".docx,.pdf,.txt,.jpg,.jpeg,.png"
                    onChange={handleMultipleFiles(setReceipts)}
                  />
                  {receipts.length > 0 && (
                    <div className="mt-2">
                      {receipts.map((file, idx) => (
                        <Badge key={idx} bg="secondary" className="me-2 mb-1">
                          {file.name}
                          <Button variant="link" size="sm" className="text-white p-0 ms-1" onClick={removeFileFromList(setReceipts, idx)}>×</Button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </Form.Group>

                {selectedMode === 'final' && (
                  <Form.Group className="mb-4">
                    <Form.Label>Supporting Documents</Form.Label>
                    <Form.Control
                      type="file"
                      multiple
                      accept=".docx,.pdf,.txt,.xls,.xlsx"
                      onChange={handleMultipleFiles(setSupportingDocs)}
                    />
                    {supportingDocs.length > 0 && (
                      <div className="mt-2">
                        {supportingDocs.map((file, idx) => (
                          <Badge key={idx} bg="secondary" className="me-2 mb-1">
                            {file.name}
                            <Button variant="link" size="sm" className="text-white p-0 ms-1" onClick={removeFileFromList(setSupportingDocs, idx)}>×</Button>
                          </Badge>
                        ))}
                      </div>
                    )}
                  </Form.Group>
                )}

                <h5 className="mb-3">
                  {selectedMode === 'scrutiny' ? 'Key Focus Areas for Scrutiny' : 'Report Arrangement'}
                </h5>

                {classOfBusiness && (
                  <div className="d-flex align-items-center gap-2 mb-3">
                    <Button size="sm" variant="outline-primary" onClick={saveClassBulletsAsDefault} disabled={savingPreset}>
                      {savingPreset ? <Spinner size="sm" animation="border" /> : `Save as ${classOfBusiness} default`}
                    </Button>
                    <Button size="sm" variant="outline-danger" onClick={clearClassBulletsDefault} disabled={clearingPreset}>
                      {clearingPreset ? <Spinner size="sm" animation="border" /> : 'Clear saved default'}
                    </Button>
                    {presetMsg && (
                      <span className={`small ${presetMsg.ok ? 'text-success' : 'text-danger'}`}>{presetMsg.text}</span>
                    )}
                  </div>
                )}

                <Button variant="outline-primary" size="sm" onClick={addHeadline} className="mb-3">
                  + Add Headline
                </Button>

                {headlines.map((headline, index) => (
                  <React.Fragment key={headline.id}>
                    <Card className="mb-2">
                      <Card.Body>
                        <div className="d-flex gap-2 mb-2">
                          <Form.Select
                            value={headline.value}
                            onChange={e => updateHeadline(headline.id, e.target.value)}
                            className="me-2"
                          >
                            <option value="">-- Select or type custom --</option>
                            {DEFAULT_FOCUS_AREAS.map(area => (
                              <option key={area} value={area}>{area}</option>
                            ))}
                          </Form.Select>
                          <Form.Control
                            placeholder={`Or type custom headline ${headline.id}`}
                            value={!DEFAULT_FOCUS_AREAS.includes(headline.value) ? headline.value : ''}
                            onChange={e => updateHeadline(headline.id, e.target.value)}
                          />
                          <Button
                            variant="outline-secondary"
                            size="sm"
                            onClick={() => moveHeadlineUp(headline.id)}
                            disabled={index === 0}
                            title="Move up"
                          >
                            ↑
                          </Button>
                          <Button
                            variant="outline-secondary"
                            size="sm"
                            onClick={() => moveHeadlineDown(headline.id)}
                            disabled={index === headlines.length - 1}
                            title="Move down"
                          >
                            ↓
                          </Button>
                          <Button variant="outline-danger" size="sm" onClick={() => removeHeadline(headline.id)}>
                            Remove
                          </Button>
                        </div>

                        {headline.subpoints.map(sub => (
                          <div key={sub.id} className="d-flex gap-2 ms-4 mb-2">
                            <Form.Control
                              size="sm"
                              placeholder={`Subpoint ${headline.id}.${sub.id}`}
                              value={sub.value}
                              onChange={e => updateSubpoint(headline.id, sub.id, e.target.value)}
                            />
                            <Button variant="outline-danger" size="sm" onClick={() => removeSubpoint(headline.id, sub.id)}>
                              ×
                            </Button>
                          </div>
                        ))}

                        <Button variant="outline-secondary" size="sm" className="ms-4" onClick={() => addSubpoint(headline.id)}>
                          + Add Subpoint
                        </Button>
                      </Card.Body>
                    </Card>

                    <div className="text-center mb-3">
                      <Button
                        variant="link"
                        size="sm"
                        className="text-decoration-none"
                        onClick={() => insertHeadlineAfter(headline.id)}
                      >
                        + Insert headline here
                      </Button>
                    </div>
                  </React.Fragment>
                ))}

                {hasInterviewsSelected && (
                  <Card className="mb-4 border-info">
                    <Card.Body>
                      <h5 className="mb-3">Interview Details</h5>
                      {interviewFields.map(field => (
                        <Card key={field.id} className="mb-3">
                          <Card.Body>
                            <Row>
                              <Col md={4}>
                                <Form.Group className="mb-2">
                                  <Form.Label>Name of Person Interviewed</Form.Label>
                                  <Form.Control
                                    placeholder="e.g. John Doe, Operations Manager"
                                    value={field.name}
                                    onChange={e => updateInterviewField(field.id, 'name', e.target.value)}
                                  />
                                </Form.Group>
                              </Col>
                              <Col md={8}>
                                <Form.Group className="mb-2">
                                  <Form.Label>Conversation Summary</Form.Label>
                                  <Form.Control
                                    as="textarea"
                                    rows={2}
                                    placeholder="Key points from the interview..."
                                    value={field.conversation}
                                    onChange={e => updateInterviewField(field.id, 'conversation', e.target.value)}
                                  />
                                </Form.Group>
                              </Col>
                            </Row>
                            {interviewFields.length > 1 && (
                              <Button
                                variant="outline-danger"
                                size="sm"
                                onClick={() => removeInterviewField(field.id)}
                              >
                                Remove Interview
                              </Button>
                            )}
                          </Card.Body>
                        </Card>
                      ))}
                      <Button variant="outline-primary" size="sm" onClick={addInterviewField}>
                        + Add Another Interview
                      </Button>
                    </Card.Body>
                  </Card>
                )}

                <Form.Group className="mb-4">
                  <Form.Check
                    type="checkbox"
                    label="Exclude uploaded photos from AI processing"
                    checked={excludePhotosFromAI}
                    onChange={e => setExcludePhotosFromAI(e.target.checked)}
                  />
                </Form.Group>

                <Form.Group className="mb-4">
                  <Form.Label>Upload Photos / Evidence</Form.Label>
                  <Form.Control
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleMultipleFiles(setPhotos)}
                    disabled={excludePhotosFromAI}
                  />
                  {photos.length > 0 && (
                    <div className="mt-2">
                      <Row>
                        {photos.map((photo, idx) => (
                          <Col key={idx} xs={6} md={4} lg={3} className="mb-2">
                            <div className="position-relative">
                              <img
                                src={URL.createObjectURL(photo)}
                                alt={`Evidence ${idx + 1}`}
                                className="img-thumbnail w-100"
                                style={{ height: '150px', objectFit: 'cover' }}
                              />
                              <Button
                                variant="danger"
                                size="sm"
                                className="position-absolute top-0 end-0 m-1"
                                onClick={removePhoto(idx)}
                              >
                                ×
                              </Button>
                            </div>
                          </Col>
                        ))}
                      </Row>
                    </div>
                  )}
                </Form.Group>

                <div className="text-center mt-4">
                  <Button
                    variant="success"
                    size="lg"
                    onClick={handleGenerate}
                    disabled={loading || !customScrutinyPrompt.trim()}
                  >
                    {loading ? 'Processing...' : `Generate ${selectedMode === 'scrutiny' ? 'Scrutiny Report' : `${selectedMode} Report`}`}
                  </Button>
                </div>
              </Card.Body>
            </Card>
          )}

          {error && (
            <Alert variant="danger" dismissible onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          {/* STEP 4 — GENERATED REPORT + REVIEW / REWORK */}
          {generatedReport && (
            <Card className="mb-4">
              <Card.Body>
                <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
                  <h4 className="mb-0">Step 4 · Generated Report</h4>
                </div>

                <pre
                  className="bg-light p-3 rounded"
                  style={{
                    maxHeight: '500px',
                    overflow: 'auto',
                    fontFamily: 'Times New Roman, serif',
                    fontSize: '12pt',
                    lineHeight: '1.5',
                    whiteSpace: 'pre-wrap'
                  }}
                >
                  {generatedReport}
                </pre>

                {!reportAccepted ? (
                  <div className="mt-3">
                    <p className="text-muted mb-2">
                      Review the report above. Accept it to move on to download and letterhead
                      placement, or request changes and it'll be reworked in place.
                    </p>
                    <ButtonGroup>
                      <Button variant="success" onClick={() => setReportAccepted(true)}>
                        Accept report
                      </Button>
                      <Button variant="outline-secondary" onClick={() => setShowFeedback(s => !s)}>
                        Request changes
                      </Button>
                    </ButtonGroup>

                    {showFeedback && (
                      <div className="mt-3">
                        <Form.Control
                          as="textarea"
                          rows={3}
                          placeholder="e.g. Expand paragraph 6 on the driver's statement; tighten the subrogation section; fix the excess figure..."
                          value={feedback}
                          onChange={e => setFeedback(e.target.value)}
                        />
                        <Button
                          className="mt-2"
                          onClick={submitRework}
                          disabled={reworking || !feedback.trim()}
                        >
                          {reworking ? <Spinner size="sm" animation="border" /> : 'Rework report'}
                        </Button>
                        {reworkError && <div className="text-danger small mt-2">{reworkError}</div>}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="mt-3">
                    <Alert variant="success" className="py-2">Report accepted.</Alert>
                    <ButtonGroup>
                      <Button variant="outline-primary" onClick={downloadReportAsTxt}>
                        Download TXT
                      </Button>
                      <Button variant="outline-primary" onClick={downloadReportAsDocx}>
                        Download DOCX
                      </Button>
                    </ButtonGroup>
                    <div className="mt-2">
                      <Button variant="link" size="sm" onClick={() => setReportAccepted(false)}>
                        Actually, I need to change something
                      </Button>
                    </div>
                  </div>
                )}
              </Card.Body>
            </Card>
          )}

          {/* STEP 5 — LETTERHEAD FINALIZATION (only once accepted) */}
          {generatedReport && reportAccepted && (
            <Card className="mb-4 border-success">
              <Card.Body>
                <h4 className="mb-3">Step 5 · Place on Letterhead</h4>
                <Alert variant="info">
                  Upload your official letterhead template and the accepted report above will be
                  placed into it exactly as written, with the letterhead's formatting applied.
                </Alert>

                <Form.Group className="mb-3">
                  <Form.Label>Letterhead Template (required)</Form.Label>
                  <Form.Control
                    type="file"
                    accept=".docx,.pdf,.txt,image/*"
                    onChange={handleFileChange(setLetterheadTemplate)}
                  />
                  <Form.Text className="text-muted">Doc, PDF, or an image/scan of the letterhead.</Form.Text>
                  {letterheadTemplate && <small className="text-success d-block mt-1">✓ {letterheadTemplate.name}</small>}
                </Form.Group>

                <Button variant="success" onClick={submitLetterhead} disabled={letterheadLoading}>
                  {letterheadLoading ? <Spinner size="sm" animation="border" /> : 'Place on letterhead'}
                </Button>

                {letterheadError && (
                  <Alert variant="danger" dismissible onClose={() => setLetterheadError(null)} className="mt-3">
                    {letterheadError}
                  </Alert>
                )}

                {letterheadResult && (
                  <div className="mt-4">
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <h5 className="mb-0">Letterhead Version</h5>
                      <ButtonGroup>
                        <Button variant="outline-primary" onClick={downloadLetterheadAsTxt}>
                          Download TXT
                        </Button>
                        <Button variant="success" onClick={downloadLetterheadAsDocx}>
                          Download DOCX
                        </Button>
                      </ButtonGroup>
                    </div>
                    <pre
                      className="bg-light p-3 rounded"
                      style={{
                        maxHeight: '500px',
                        overflow: 'auto',
                        fontFamily: 'Times New Roman, serif',
                        fontSize: '12pt',
                        lineHeight: '1.5',
                        whiteSpace: 'pre-wrap'
                      }}
                    >
                      {letterheadResult}
                    </pre>
                  </div>
                )}
              </Card.Body>
            </Card>
          )}
        </Tab>

        {/* COLLABORATION TAB — unchanged */}
        <Tab eventKey="collaboration" title={<span>🤝 AI Collaboration</span>}>
          <CollaborationTab />
        </Tab>
      </Tabs>

      {/* Training Reports Modal */}
      <Modal show={showTrainingModal} onHide={() => setShowTrainingModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Reference Reports for Current Selection</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {relevantTrainingReports.length === 0 ? (
            <Alert variant="info">No training reports found for this combination.</Alert>
          ) : (
            <ListGroup>
              {relevantTrainingReports.map(report => (
                <ListGroup.Item key={report.id}>
                  <strong>{report.filename}</strong>
                  <br />
                  <Badge bg="info" className="me-2">{report.reportType}</Badge>
                  <Badge bg="secondary">{report.classOfBusiness}</Badge>
                  {report.description && (
                    <p className="mb-1 mt-2"><small>{report.description}</small></p>
                  )}
                  <small className="text-muted">
                    {report.author && `Author: ${report.author} | `}
                    Uploaded: {new Date(report.uploadedAt).toLocaleDateString()}
                  </small>
                </ListGroup.Item>
              ))}
            </ListGroup>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowTrainingModal(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
}

export default Home;
