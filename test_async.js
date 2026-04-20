// app.js

const express = require('express');
const EventEmitter = require('events');

const app = express();
app.use(express.json());

// ===============================
// 🔥 Event System (Pub/Sub)
// ===============================
const eventEmitter = new EventEmitter();

eventEmitter.on('user_created', (user) => {
  console.log('📩 Event: Sending welcome email to', user.email);
});

// ===============================
// 🔥 Fake DB + Services
// ===============================
const fakeDB = [];

async function createUser(data) {
  await delay(500); // simulate DB delay
  const user = { id: Date.now(), ...data };
  fakeDB.push(user);

  // Emit event
  eventEmitter.emit('user_created', user);

  return user;
}

async function getOrders(userId) {
  await delay(500);
  return ['order1', 'order2'];
}

async function sendEmail(email) {
  await delay(1000);
  console.log('📧 Email sent to', email);
}

async function generateInvoice(userId) {
  await delay(1200);
  console.log('🧾 Invoice generated for', userId);
}

async function updateInventory() {
  await delay(800);
  console.log('📦 Inventory updated');
}

// ===============================
// 🔥 Utility Functions
// ===============================
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Retry pattern
async function retry(fn, retries = 3) {
  try {
    return await fn();
  } catch (err) {
    if (retries === 0) throw err;
    console.log('🔁 Retrying...');
    return retry(fn, retries - 1);
  }
}

// Timeout pattern
function withTimeout(promise, ms) {
  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('⏰ Timeout')), ms)
  );

  return Promise.race([promise, timeout]);
}

// ===============================
// 🔥 Fake Queue (Simulating BullMQ)
// ===============================
const queue = [];

function addToQueue(jobName, data) {
  queue.push({ jobName, data });
}

// Worker
setInterval(async () => {
  if (queue.length === 0) return;

  const job = queue.shift();
  console.log(`⚙️ Processing job: ${job.jobName}`);

  try {
    if (job.jobName === 'sendEmail') {
      await retry(() => sendEmail(job.data.email));
    }

    if (job.jobName === 'generateInvoice') {
      await generateInvoice(job.data.userId);
    }
  } catch (err) {
    console.error('❌ Job failed:', err.message);
  }
}, 2000);

// ===============================
// 🔥 Routes
// ===============================

// 1️⃣ Sync Request-Response + Await
app.post('/register', async (req, res) => {
  const user = await createUser(req.body);
  res.json(user);
});

// 2️⃣ Fire-and-Forget
app.post('/signup', async (req, res) => {
  const user = await createUser(req.body);

  sendEmail(user.email); // not awaited ❗

  res.json({ message: 'Signup successful (email sending in background)' });
});

// 3️⃣ Parallel Execution (Promise.all)
app.get('/dashboard/:id', async (req, res) => {
  const userId = req.params.id;

  const [userOrders, inventory] = await Promise.all([
    getOrders(userId),
    updateInventory()
  ]);

  res.json({ userOrders, inventory });
});

// 4️⃣ Queue-based (Production Pattern)
app.post('/order', async (req, res) => {
  const user = await createUser(req.body);

  // Push heavy tasks to queue
  addToQueue('sendEmail', { email: user.email });
  addToQueue('generateInvoice', { userId: user.id });

  res.json({ message: 'Order placed successfully 🚀' });
});

// 5️⃣ Timeout + Retry Example
app.get('/external-api', async (req, res) => {
  try {
    const data = await retry(() =>
      withTimeout(fakeExternalCall(), 1000)
    );

    res.json({ data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Fake external API
async function fakeExternalCall() {
  await delay(1500); // slower than timeout
  return 'External data';
}

// ===============================
// 🚀 Start Server
// ===============================
app.listen(3000, () => {
  console.log('🚀 Server running on port 3000');
});