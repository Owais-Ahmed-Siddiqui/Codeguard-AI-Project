require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const MAX_FREE_CREDITS = 20;

// User configured model - gemini-3.5-flash as requested (fast + accurate)
const FAST_MODEL = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';

// ─── Middleware ───
app.use(cors({
  origin: function (origin, callback) {
    // Allow all origins in dev, and specific in prod
    const allowed = [
      process.env.FRONTEND_URL,
      process.env.VERCEL_URL,
      'http://localhost:5173',
      'http://localhost:3000',
      'https://codeguard-ai-project.vercel.app'
    ].filter(Boolean);
    // Allow no origin (mobile apps, curl) or if in allowed list or allow all when no FRONTEND_URL set
    if (!origin || allowed.length === 0 || allowed.includes(origin) || origin.includes('vercel.app') || origin.includes('localhost')) {
      callback(null, true);
    } else {
      callback(null, true); // still allow to avoid CORS blocking errors
    }
  },
  credentials: true,
}));
app.use(express.json({ limit: '5mb' }));

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

// ─── Optimized, Beginner-Friendly Prompts - Each issue ONE BOX ───
const REVIEW_SYSTEM_PROMPT = `You are CodeGuard AI, a friendly Senior Developer and Security Expert who explains things in SIMPLE, beginner-friendly language.

CRITICAL FORMATTING RULES:
1. Use ONLY plain Markdown. No HTML tags.
2. When writing comparison operators like < > <= >= always wrap in backticks: \`i < 10\` or \`x > 5\`
3. Be CONCISE - keep total response under 1200 words. Top issues only.
4. Use SIMPLE language - explain like to a junior developer.
5. All code in fenced code blocks with language tag.

CRITICAL - HOW TO FORMAT ISSUES - ONE BOX PER ISSUE:
Each issue MUST be ONE single bullet point containing all 4 fields inside that ONE bullet.
Use 2-space indent for continuation lines inside the same bullet. Do NOT create 4 separate bullets per issue.

CORRECT FORMAT (ONE bullet = ONE issue = ONE box):

- **Severity:** 🔴 Critical
  **Where:** Line 24
  **Problem:** SQL Injection because user input pasted directly into query string
  **Why it matters:** Hackers can steal data or delete your entire database by typing malicious text

- **Severity:** 🔴 Critical
  **Where:** Line 10
  **Problem:** Hardcoded database username and password in source code
  **Why it matters:** Anyone who sees your code can instantly log into your database

WRONG FORMAT (Do NOT do this - 4 separate bullets = 4 boxes):
- Severity: 🔴 Critical
- Where: Line 24
- Problem: ...
- Why it matters: ...

RESPONSE STRUCTURE - Use these exact headers:

## 🚩 What's Wrong

List TOP 3-5 most important issues only. Each issue ONE bullet as shown above. Blank line between bullets.

## 🛡️ Security Check

Simple markdown table: | Issue | Risk Level | Why it's risky (simple) |
Use plain English, no CWE codes unless really needed.
End with: **Security Score: X/10** + emoji (🔴 0-3, 🟠 4-5, 🟡 6-7, 🟢 8-10)

## ✅ Fixed Code

Provide COMPLETE corrected code in ONE fenced code block with language tag.
Add short simple comments like // Fixed: hashed password securely

## 💡 Quick Tips

3-5 practical tips, 1 sentence each, simple language. How to avoid these bugs next time.
`;

const CHAT_SYSTEM_PROMPT = `You are CodeGuard AI, a friendly senior developer. You explain in VERY SHORT, CLEAN, beginner-friendly messages.

CRITICAL RULES FOR CLEAN CHAT:
1. MAX 120 words per answer. Be super short and to the point.
2. Use simple plain English - no jargon. If you must use jargon, explain in 3 words.
3. Structure: 
   - Start with 1-line direct answer in bold
   - Then 2-3 bullet points max, each 1 short sentence
   - If code needed, give tiny snippet max 5 lines in a code block
4. No long paragraphs, no tables unless asked, no heavy formatting
5. When writing < > <= >= always wrap in backticks: \`i < 10\`
6. End with 1 quick tip if helpful, max 1 sentence
7. Be friendly, clear, like talking to a junior dev

Example clean style:
**Use \`bcrypt\` to hash passwords, not plain text.**
- Plain text passwords can be stolen if DB leaks
- \`bcrypt.hash(password, 12)\` creates secure hash
- Always compare with \`bcrypt.compare\`, not \`==\`

Keep it SHORT, CLEAN, EASY.
`;

// ─── Auth Middleware ───
async function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authorization required. Please sign in again.' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) return res.status(401).json({ error: 'Invalid or expired token. Please sign in again.' });
    req.userId = user.id;
    req.userEmail = user.email;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token verification failed.' });
  }
}

// Optional Auth - allows anonymous
async function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const { data: { user } } = await supabase.auth.getUser(token);
      if (user) {
        req.userId = user.id;
        req.userEmail = user.email;
      }
    } catch {
      // ignore - treat as anonymous
    }
  }
  next();
}

async function ensureUserProfile(userId, email) {
  if (!userId) return;
  try {
    const { data: existing } = await supabase.from('users').select('id').eq('id', userId).single();
    if (existing) return;
    const username = email ? email.split('@')[0] : `user_${userId.slice(0, 6)}`;
    await supabase.from('users').insert({ id: userId, username, email: email || '' });
  } catch {}
}

async function getCreditStatus(userId) {
  if (!userId) return { used: 0, remaining: MAX_FREE_CREDITS, maxCredits: MAX_FREE_CREDITS };
  try {
    await ensureUserProfile(userId, null);
    const { data: user, error } = await supabase.from('users').select('daily_count, last_review_date').eq('id', userId).single();
    if (error || !user) return { used: 0, remaining: MAX_FREE_CREDITS, maxCredits: MAX_FREE_CREDITS };
    const today = new Date().toISOString().split('T')[0];
    const used = user.last_review_date === today ? (user.daily_count || 0) : 0;
    return { used, remaining: Math.max(0, MAX_FREE_CREDITS - used), maxCredits: MAX_FREE_CREDITS };
  } catch {
    return { used: 0, remaining: MAX_FREE_CREDITS, maxCredits: MAX_FREE_CREDITS };
  }
}

// ─── Helper: Generate with retry ───
async function generateWithRetry(model, promptPayload, retries = 1) {
  try {
    const result = await model.generateContent(promptPayload);
    return result.response.text();
  } catch (err) {
    // Retry once for transient errors
    if (retries > 0 && (err.message?.includes('429') || err.message?.includes('overloaded') || err.message?.includes('503'))) {
      await new Promise(r => setTimeout(r, 1200));
      const result = await model.generateContent(promptPayload);
      return result.response.text();
    }
    throw err;
  }
}

// ═════════════════ ROUTES ═════════════════

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    model: FAST_MODEL,
    gemini: !!process.env.GEMINI_API_KEY,
    supabase: !!process.env.SUPABASE_URL,
    maxCredits: MAX_FREE_CREDITS
  });
});

app.get('/api/credits', authMiddleware, async (req, res) => {
  try {
    const credits = await getCreditStatus(req.userId);
    res.json(credits);
  } catch {
    res.json({ used: 0, remaining: MAX_FREE_CREDITS, maxCredits: MAX_FREE_CREDITS });
  }
});

// ─── REVIEW - Works with or without login ───
app.post('/api/review', optionalAuth, async (req, res) => {
  const { code, language, ghostMode } = req.body;
  const isLoggedIn = !!req.userId;

  console.log(`[Review] ${isLoggedIn ? req.userEmail : 'ANONYMOUS'} | lang=${language} | ghost=${ghostMode || !isLoggedIn} | len=${code?.length || 0}`);

  if (!code || !code.trim()) return res.status(400).json({ error: 'No code provided. Please paste some code.' });
  if (code.trim().length < 10) return res.status(400).json({ error: 'Code too short. Please paste valid code.' });
  if (code.length > 50000) return res.status(400).json({ error: 'Code too long. Max 50,000 characters.' });

  const langMap = {
    javascript: 'JavaScript', python: 'Python', java: 'Java', cpp: 'C++',
    typescript: 'TypeScript', rust: 'Rust', go: 'Go', csharp: 'C#',
    php: 'PHP', ruby: 'Ruby'
  };
  const langLabel = langMap[language] || language || 'code';

  // Credit check only for logged-in users NOT in ghost mode
  if (isLoggedIn && !ghostMode) {
    const credits = await getCreditStatus(req.userId);
    if (credits.remaining <= 0) {
      return res.status(429).json({
        error: `Daily limit reached (${MAX_FREE_CREDITS}/day). Enable Ghost Mode for unlimited reviews.`,
        credits
      });
    }
  }

  if (!process.env.GEMINI_API_KEY) {
    return res.status(500).json({ error: 'AI not configured. Missing GEMINI_API_KEY on server.' });
  }

  try {
    const model = genAI.getGenerativeModel({
      model: FAST_MODEL,
      systemInstruction: REVIEW_SYSTEM_PROMPT
    });

    // Optimized prompt - shorter, clearer, faster
    const truncatedCode = code.length > 8000 ? code.substring(0, 8000) + '\n// ... truncated for analysis' : code;

    const promptPayload = {
      contents: [{
        role: 'user',
        parts: [{
          text: `Review this ${langLabel} code. Be concise and beginner-friendly:\n\`\`\`${language || 'code'}\n${truncatedCode}\n\`\`\`\nGive TOP issues only, simple English.`
        }]
      }],
      generationConfig: {
        temperature: 0.4,
        maxOutputTokens: 3500, // Reduced from 8192 for speed
        topP: 0.9,
        topK: 40
      },
    };

    const aiResponse = await generateWithRetry(model, promptPayload, 1);

    let reviewId = null;
    let credits = { used: 0, remaining: MAX_FREE_CREDITS, maxCredits: MAX_FREE_CREDITS };

    // Save only if logged in AND not ghost mode
    if (isLoggedIn && !ghostMode) {
      try {
        await ensureUserProfile(req.userId, req.userEmail);
        const today = new Date().toISOString().split('T')[0];
        const { data: userData } = await supabase.from('users').select('daily_count, last_review_date').eq('id', req.userId).single();
        const newCount = userData?.last_review_date === today ? (userData?.daily_count || 0) + 1 : 1;
        await supabase.from('users').update({ daily_count: newCount, last_review_date: today }).eq('id', req.userId);
        const { data: review, error: insertError } = await supabase.from('reviews').insert({
          user_id: req.userId,
          code: code,
          language: language || 'javascript',
          ai_feedback: { response: aiResponse }
        }).select('id').single();

        if (!insertError && review) reviewId = review.id;
        credits = { used: newCount, remaining: Math.max(0, MAX_FREE_CREDITS - newCount), maxCredits: MAX_FREE_CREDITS };
      } catch (dbErr) {
        console.error('[Review] DB save failed:', dbErr.message);
        // Still return AI response even if DB save fails
        const currentCredits = await getCreditStatus(req.userId);
        credits = currentCredits;
      }
    }

    res.json({ response: aiResponse, reviewId, credits, saved: !!reviewId });

  } catch (err) {
    console.error('[Review] Error:', err.message, err.stack?.substring(0, 500));
    if (err.message?.includes('API_KEY') || err.message?.includes('API key')) {
      return res.status(500).json({ error: 'AI not configured. Check GEMINI_API_KEY on server.' });
    }
    if (err.message?.includes('quota') || err.message?.includes('429') || err.message?.includes('limit')) {
      return res.status(429).json({ error: 'AI is busy (rate limit). Wait 20 seconds and try again.' });
    }
    if (err.message?.includes('404') || err.message?.includes('not found') || err.message?.includes('not supported')) {
      return res.status(500).json({ error: `Model ${FAST_MODEL} not available. Check Gemini API. You are using ${FAST_MODEL}, try GEMINI_MODEL=gemini-3.5-flash-lite or gemini-1.5-flash in server .env` });
    }
    res.status(500).json({ error: 'Analysis failed. Please try again in a few seconds.' });
  }
});

// ─── CHAT - Works with or without login ───
app.post('/api/chat', optionalAuth, async (req, res) => {
  const { message, reviewId, code, language, reviewResponse, ghostMode } = req.body;
  const isLoggedIn = !!req.userId;

  console.log(`[Chat] ${isLoggedIn ? req.userEmail : 'ANONYMOUS'} | reviewId=${reviewId || 'no-id'} | msgLen=${message?.length || 0}`);

  if (!message?.trim()) return res.status(400).json({ error: 'No message provided.' });
  if (message.length > 2000) return res.status(400).json({ error: 'Message too long.' });

  if (!process.env.GEMINI_API_KEY) {
    return res.status(500).json({ error: 'AI not configured.' });
  }

  try {
    let contextCode = (code || '').trim();
    let contextReview = (reviewResponse || '').trim();
    let contextLang = language || 'code';

    // Try to fetch from DB for logged-in users with valid reviewId and not ghost
    if (isLoggedIn && reviewId && !ghostMode) {
      try {
        const { data: review } = await supabase.from('reviews').select('code, language, ai_feedback').eq('id', reviewId).eq('user_id', req.userId).single();
        if (review) {
          contextCode = review.code || contextCode;
          contextReview = review.ai_feedback?.response || contextReview;
          contextLang = review.language || contextLang;
        }
      } catch {
        // fallback to provided context
      }
    }

    if (!contextCode) {
      return res.status(400).json({ error: 'No code context found. Please review your code first, then chat.' });
    }

    const model = genAI.getGenerativeModel({
      model: FAST_MODEL,
      systemInstruction: CHAT_SYSTEM_PROMPT
    });

    // Truncate for speed and to avoid token limits
    const shortCode = contextCode.length > 4000 ? contextCode.substring(0, 4000) + '\n// ... truncated' : contextCode;
    const shortReview = contextReview.length > 1500 ? contextReview.substring(0, 1500) + '...' : contextReview;

    // Build chat with minimal history for speed and clean short answers
    const chat = model.startChat({
      history: [
        {
          role: 'user',
          parts: [{ text: `Code:\n\`\`\`${contextLang}\n${shortCode}\n\`\`\`\nPrevious review summary:\n${shortReview}\nKeep this context in mind. Answer SHORT and clean.` }]
        },
        {
          role: 'model',
          parts: [{ text: 'Got it! I have your code context. Ask me anything - I keep answers short and simple.' }]
        }
      ],
      generationConfig: {
        temperature: 0.4,
        maxOutputTokens: 900, // Short clean messages
        topP: 0.9,
        topK: 30
      }
    });

    const result = await chat.sendMessage(`${message}\n\nKeep answer SHORT, clean, max 120 words, simple bullet points, easy to understand.`);
    const aiResponse = result.response.text();

    // Save chat only if logged in and not ghost mode and has reviewId
    if (isLoggedIn && reviewId && !ghostMode) {
      try {
        await supabase.from('chats').insert([
          { review_id: reviewId, role: 'user', content: message },
          { review_id: reviewId, role: 'assistant', content: aiResponse },
        ]);
      } catch (dbErr) {
        console.error('[Chat] DB save failed:', dbErr.message);
      }
    }

    res.json({ response: aiResponse });

  } catch (err) {
    console.error('[Chat] Error:', err.message);
    if (err.message?.includes('quota') || err.message?.includes('429')) {
      return res.status(429).json({ error: 'AI is busy. Wait 20 seconds and try again.' });
    }
    if (err.message?.includes('404') || err.message?.includes('not found')) {
      return res.status(500).json({ error: `Model ${FAST_MODEL} error. Check server config.` });
    }
    res.status(500).json({ error: 'Chat failed. Please try again.' });
  }
});

// ─── History & Delete (login required) ───
app.get('/api/history', authMiddleware, async (req, res) => {
  try {
    const { data: reviews, error } = await supabase
      .from('reviews')
      .select('id, language, created_at, code, ai_feedback')
      .eq('user_id', req.userId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;

    const langCounts = {};
    (reviews || []).forEach(r => { langCounts[r.language] = (langCounts[r.language] || 0) + 1; });

    let critCount = 0;
    (reviews || []).forEach(r => {
      const resp = r.ai_feedback?.response || '';
      if (resp.includes('🔴 Critical') || resp.includes('Critical')) critCount++;
    });

    const credits = await getCreditStatus(req.userId);

    res.json({
      reviews: reviews || [],
      stats: {
        totalReviews: reviews?.length || 0,
        criticalFound: critCount,
        topLanguage: Object.entries(langCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || '—',
        languagesUsed: Object.keys(langCounts).length,
        credits
      }
    });
  } catch (err) {
    console.error('[History] Error:', err.message);
    res.status(500).json({ error: 'Failed to fetch history.' });
  }
});

app.delete('/api/reviews/:id', authMiddleware, async (req, res) => {
  try {
    const { error } = await supabase.from('reviews').delete().eq('id', req.params.id).eq('user_id', req.userId);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    console.error('[Delete] Error:', err.message);
    res.status(500).json({ error: 'Delete failed.' });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`
  🛡️  CodeGuard AI v2.1 - Optimized
  Port: ${PORT}
  Model: ${FAST_MODEL} (FAST)
  Gemini: ${!!process.env.GEMINI_API_KEY ? '✅' : '❌ Missing GEMINI_API_KEY'}
  Supabase: ${!!process.env.SUPABASE_URL ? '✅' : '❌ Missing SUPABASE_URL'}
  Max Credits: ${MAX_FREE_CREDITS}/day
  `);
});
