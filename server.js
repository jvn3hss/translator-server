const express = require('express');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const Groq = require('groq-sdk');

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

const upload = multer({ 
  dest: 'uploads/',
  limits: { fileSize: 50 * 1024 * 1024 }
});

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
```

## Étape 2 — Crée un fichier .env

Dans le dossier `server-deploy`, crée un fichier **`.env`** avec :
```
GROQ_API_KEY=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
```

## Étape 3 — Crée un .gitignore

Crée un fichier **`.gitignore`** dans `server-deploy` avec :
```
.env
node_modules
uploads

// Route traduction texte
app.post('/translate', async (req, res) => {
  const { text, targetLang } = req.body;
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&dt=ld&q=${encodeURIComponent(text)}`;
    const response = await fetch(url);
    const data = await response.json();
    const translation = data[0].map(item => item[0]).join('');
    const detected = data[2] || 'auto';
    res.json({ translation, detected });
  } catch (e) {
    console.error('Erreur:', e);
    res.status(500).json({ error: e.message });
  }
});

// Route transcription audio
app.post('/transcribe', (req, res) => {
  upload.single('audio')(req, res, async (err) => {
    if (err) {
      console.error('Erreur upload:', err);
      return res.status(500).json({ error: 'Erreur upload: ' + err.message });
    }

    console.log('Fichier reçu:', req.file);

    if (!req.file) {
      return res.status(400).json({ error: 'Aucun fichier reçu' });
    }

    try {
      const filePath = req.file.path;
      const ext = req.file.mimetype.includes('webm') ? '.webm' : 
                  req.file.mimetype.includes('mp4') ? '.mp4' : '.m4a';
      const newPath = filePath + ext;
      fs.renameSync(filePath, newPath);

      const transcription = await groq.audio.transcriptions.create({
        file: fs.createReadStream(newPath),
        model: 'whisper-large-v3',
      });

      fs.unlinkSync(newPath);
      console.log('Transcription:', transcription.text);
      res.json({ text: transcription.text });
    } catch (e) {
      console.error('Erreur transcription:', e);
      res.status(500).json({ error: e.message });
    }
  });
});

app.listen(3001, '0.0.0.0', () => console.log('✅ Serveur lancé sur http://localhost:3001'));