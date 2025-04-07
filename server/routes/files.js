// routes/files.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs-extra');
const fileController = require('../controllers/fileController');

// Configure multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads');
    fs.ensureDirSync(uploadDir);
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Create unique filename with original extension
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

// File filter to accept only .docx, .pdf, and .txt
const fileFilter = (req, file, cb) => {
  const allowedFileTypes = ['.docx', '.pdf', '.txt'];
  const ext = path.extname(file.originalname).toLowerCase();
  
  if (allowedFileTypes.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only .docx, .pdf, and .txt are allowed.'), false);
  }
};

// Configure multer upload
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024 // 10MB default
  }
});

// File upload routes
router.post('/upload-questionnaire', upload.single('questionnaire'), fileController.uploadQuestionnaire);
router.post('/upload-analyzed', upload.single('analyzedFile'), fileController.uploadAnalyzedFile);
router.post('/process-files', upload.fields([

    { name: 'questionnaire', maxCount: 1 },
  
    { name: 'analyzedFile', maxCount: 1 },
  
  ]), fileController.processFiles);
// router.get('/download/:fileId', fileController.downloadFile);

router.get('/download/:filename', (req, res) => {
  const filePath = path.join(__dirname, '../uploads', req.params.filename);
  res.download(filePath, (err) => {
    if (err) {
      console.error('Download Error:', err);
      res.status(404).json({ success: false, message: 'Report not found' });
    }
  });
});


module.exports = router;