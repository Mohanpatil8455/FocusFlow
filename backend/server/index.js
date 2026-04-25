import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import mongoose from 'mongoose'
import crypto from 'node:crypto'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

const PORT = Number(process.env.PORT || 5174)
const MONGODB_URI = process.env.MONGODB_URI
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173'
const JWT_SECRET = process.env.JWT_SECRET || 'dev_insecure_change_me'

if (!MONGODB_URI) {
  console.error('Missing MONGODB_URI in server/.env')
  process.exit(1)
}

await mongoose.connect(MONGODB_URI)

const UserSchema = new mongoose.Schema(
  {
    name: { type: String, default: '' },
    email: { type: String, unique: true, index: true },
    passwordHash: { type: String },
  },
  { timestamps: true },
)

const User = mongoose.model('User', UserSchema)

const SessionSchema = new mongoose.Schema(
  {
    sid: { type: String, unique: true, index: true },
    notesText: { type: String, default: '' },
    totalFocusSeconds: { type: Number, default: 0 },
    totalDistractionSeconds: { type: Number, default: 0 },
    timer: {
      durationMinutes: { type: Number, default: 25 },
      remainingSeconds: { type: Number, default: 25 * 60 },
      running: { type: Boolean, default: false },
    },
  },
  { timestamps: true },
)

const Session = mongoose.model('Session', SessionSchema)

const NoteSnapshotSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    sid: { type: String, index: true },
    title: { type: String, default: '' },
    content: { type: String, default: '' },
  },
  { timestamps: true },
)

const NoteSnapshot = mongoose.model('NoteSnapshot', NoteSnapshotSchema)

const app = express()
app.use(
  cors({
    origin: CLIENT_ORIGIN,
    credentials: true,
  }),
)
app.use(express.json({ limit: '1mb' }))
app.use(cookieParser())

function setAuthCookie(res, token) {
  res.cookie('ff_auth', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: false,
    maxAge: 1000 * 60 * 60 * 24 * 7,
  })
}

function clearAuthCookie(res) {
  res.clearCookie('ff_auth', { httpOnly: true, sameSite: 'lax', secure: false })
}

function getAuthUserId(req) {
  const token = req.cookies.ff_auth
  if (!token) return null
  try {
    const payload = jwt.verify(token, JWT_SECRET)
    return payload?.uid || null
  } catch {
    return null
  }
}

function getOrCreateSid(req, res) {
  let sid = req.cookies.ff_sid
  if (!sid) {
    sid = crypto.randomUUID()
    res.cookie('ff_sid', sid, {
      httpOnly: true,
      sameSite: 'lax',
      secure: false,
      maxAge: 1000 * 60 * 60 * 24 * 30,
    })
  }
  return sid
}

function getSessionSid(req, res) {
  const uid = getAuthUserId(req)
  if (uid) return `user:${uid}`
  return getOrCreateSid(req, res)
}

function requireAuth(req, res, next) {
  const uid = getAuthUserId(req)
  if (!uid) return res.status(401).json({ error: 'not_authenticated' })
  req.userId = uid
  next()
}

async function getOrCreateSession(sid) {
  const existing = await Session.findOne({ sid }).lean()
  if (existing) return existing
  const created = await Session.create({ sid })
  return created.toObject()
}

app.get('/api/auth/me', async (req, res) => {
  const uid = getAuthUserId(req)
  if (!uid) return res.status(401).json({ error: 'not_authenticated' })
  const user = await User.findById(uid).lean()
  if (!user) return res.status(401).json({ error: 'not_authenticated' })
  res.json({ user: { id: String(user._id), name: user.name || '', email: user.email } })
})

app.post('/api/auth/register', async (req, res) => {
  const name = typeof req.body?.name === 'string' ? req.body.name.trim() : ''
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : ''
  const password = typeof req.body?.password === 'string' ? req.body.password : ''

  if (!email || !password) return res.status(400).json({ error: 'email_and_password_required' })
  if (password.length < 6) return res.status(400).json({ error: 'password_too_short' })

  const exists = await User.findOne({ email }).lean()
  if (exists) return res.status(409).json({ error: 'email_already_exists' })

  const passwordHash = await bcrypt.hash(password, 10)
  const user = await User.create({ name, email, passwordHash })

  const token = jwt.sign({ uid: String(user._id) }, JWT_SECRET, { expiresIn: '7d' })
  setAuthCookie(res, token)
  res.json({ user: { id: String(user._id), name: user.name || '', email: user.email } })
})

app.post('/api/auth/login', async (req, res) => {
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : ''
  const password = typeof req.body?.password === 'string' ? req.body.password : ''
  if (!email || !password) return res.status(400).json({ error: 'email_and_password_required' })

  const user = await User.findOne({ email }).lean()
  if (!user) return res.status(401).json({ error: 'invalid_credentials' })
  const ok = await bcrypt.compare(password, user.passwordHash || '')
  if (!ok) return res.status(401).json({ error: 'invalid_credentials' })

  const token = jwt.sign({ uid: String(user._id) }, JWT_SECRET, { expiresIn: '7d' })
  setAuthCookie(res, token)
  res.json({ user: { id: String(user._id), name: user.name || '', email: user.email } })
})

app.post('/api/auth/logout', async (req, res) => {
  clearAuthCookie(res)
  res.json({ ok: true })
})

app.get('/api/notes', async (req, res) => {
  const uid = getAuthUserId(req)
  if (!uid) return res.status(401).json({ error: 'not_authenticated' })

  const notes = await NoteSnapshot.find({ userId: uid }).sort({ createdAt: -1 }).limit(200).lean()
  res.json({ notes })
})

app.post('/api/notes', async (req, res) => {
  const uid = getAuthUserId(req)
  if (!uid) return res.status(401).json({ error: 'not_authenticated' })

  const sid = getOrCreateSid(req, res)
  const content = typeof req.body?.content === 'string' ? req.body.content : ''
  const titleRaw = typeof req.body?.title === 'string' ? req.body.title.trim() : ''
  const title = titleRaw || `Session note ${new Date().toLocaleString()}`

  if (!content.trim()) return res.status(400).json({ error: 'empty_note' })

  const note = await NoteSnapshot.create({
    userId: uid,
    sid,
    title,
    content,
  })

  res.json({ note })
})

app.get('/api/session', requireAuth, async (req, res) => {
  const sid = getSessionSid(req, res)
  const session = await getOrCreateSession(sid)
  res.json({ session })
})

app.patch('/api/session/notes', requireAuth, async (req, res) => {
  const sid = getSessionSid(req, res)
  const text = typeof req.body?.text === 'string' ? req.body.text : ''

  const doc = await Session.findOneAndUpdate(
    { sid },
    { $set: { notesText: text } },
    { upsert: true, new: true },
  ).lean()

  res.json({ session: doc })
})

app.patch('/api/session/stats', requireAuth, async (req, res) => {
  const sid = getSessionSid(req, res)
  const df = Number(req.body?.deltaFocusSeconds || 0)
  const dd = Number(req.body?.deltaDistractionSeconds || 0)

  const deltaFocusSeconds = Number.isFinite(df) ? Math.max(0, Math.floor(df)) : 0
  const deltaDistractionSeconds = Number.isFinite(dd) ? Math.max(0, Math.floor(dd)) : 0

  const doc = await Session.findOneAndUpdate(
    { sid },
    {
      $inc: {
        totalFocusSeconds: deltaFocusSeconds,
        totalDistractionSeconds: deltaDistractionSeconds,
      },
    },
    { upsert: true, new: true },
  ).lean()

  res.json({ session: doc })
})

app.patch('/api/session/timer', requireAuth, async (req, res) => {
  const sid = getSessionSid(req, res)

  const durationMinutes = Number(req.body?.durationMinutes)
  const remainingSeconds = Number(req.body?.remainingSeconds)
  const running = !!req.body?.running

  const next = {}
  if (Number.isFinite(durationMinutes)) next['timer.durationMinutes'] = Math.min(180, Math.max(1, Math.floor(durationMinutes)))
  if (Number.isFinite(remainingSeconds)) next['timer.remainingSeconds'] = Math.max(0, Math.floor(remainingSeconds))
  next['timer.running'] = running

  const doc = await Session.findOneAndUpdate({ sid }, { $set: next }, { upsert: true, new: true }).lean()
  res.json({ session: doc })
})

app.post('/api/session/reset-stats', requireAuth, async (req, res) => {
  const sid = getSessionSid(req, res)
  const doc = await Session.findOneAndUpdate(
    { sid },
    { $set: { totalFocusSeconds: 0, totalDistractionSeconds: 0 } },
    { upsert: true, new: true },
  ).lean()
  res.json({ session: doc })
})

app.listen(PORT, () => {
  console.log(`FocusFlow server listening on http://localhost:${PORT}`)
})

