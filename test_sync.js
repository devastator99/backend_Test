const express = require("express");
const jwt = require("jsonwebtoken");

const app = express();
app.use(express.json());

const PORT = 3000;
const SECRET = "supersecret";

// --------------------
// Fake DB
// --------------------
let users = [{ id: 1, name: "Najmus" }];
let orders = [];
let payments = [];
let processedKeys = new Map();

// --------------------
// Middleware: Auth
// --------------------
function authMiddleware(req, res, next) {
  const token = req.headers.authorization;

  if (!token) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const decoded = jwt.verify(token, SECRET);
    req.user = decoded;
    next();
  } catch {
    res.status(403).json({ error: "Invalid token" });
  }
}

// --------------------
// 1. Request-Response
// --------------------
app.get("/users/:id", (req, res) => {
  const id = parseInt(req.params.id);
  const user = users.find(u => u.id === id);

  if (!user) return res.status(404).json({ error: "User not found" });

  res.status(200).json(user);
});

// --------------------
// 2. CRUD
// --------------------

// CREATE
app.post("/users", (req, res) => {
  const { name } = req.body;

  if (!name) {
    return res.status(400).json({ error: "Name required" });
  }

  const newUser = {
    id: users.length + 1,
    name
  };

  users.push(newUser);

  res.status(201).json(newUser);
});

// READ ALL
app.get("/users", (req, res) => {
  res.json(users);
});

// UPDATE
app.put("/users/:id", (req, res) => {
  const id = parseInt(req.params.id);
  const { name } = req.body;

  const user = users.find(u => u.id === id);

  if (!user) return res.status(404).json({ error: "Not found" });

  user.name = name;

  res.json(user);
});

// DELETE
app.delete("/users/:id", (req, res) => {
  const id = parseInt(req.params.id);
  users = users.filter(u => u.id !== id);

  res.status(204).send();
});

// --------------------
// 3. Filtering + Pagination
// --------------------
app.get("/products", (req, res) => {
  let { page = 1, limit = 5, search } = req.query;

  page = parseInt(page);
  limit = parseInt(limit);

  let data = [
    { id: 1, name: "iPhone" },
    { id: 2, name: "Samsung" },
    { id: 3, name: "MacBook" },
    { id: 4, name: "Dell" },
    { id: 5, name: "HP" },
    { id: 6, name: "Lenovo" }
  ];

  if (search) {
    data = data.filter(p =>
      p.name.toLowerCase().includes(search.toLowerCase())
    );
  }

  const start = (page - 1) * limit;
  const paginated = data.slice(start, start + limit);

  res.json({
    total: data.length,
    page,
    limit,
    data: paginated
  });
});

// --------------------
// 4. Idempotent API (PUT)
// --------------------
app.put("/payments/:id", (req, res) => {
  const id = req.params.id;
  const { amount } = req.body;

  let payment = payments.find(p => p.id === id);

  if (!payment) {
    payment = { id, amount, status: "processed" };
    payments.push(payment);
  }

  res.json(payment);
});

// --------------------
// 5. Idempotency Key (POST)
// --------------------
app.post("/payments", (req, res) => {
  const key = req.headers["idempotency-key"];

  if (!key) {
    return res.status(400).json({ error: "Missing idempotency key" });
  }

  if (processedKeys.has(key)) {
    return res.json(processedKeys.get(key));
  }

  const payment = {
    id: Date.now(),
    amount: req.body.amount
  };

  processedKeys.set(key, payment);

  res.status(201).json(payment);
});

// --------------------
// 6. Validation
// --------------------
app.post("/register", (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      error: "Email and password required"
    });
  }

  if (password.length < 6) {
    return res.status(400).json({
      error: "Password too short"
    });
  }

  res.status(201).json({ message: "User registered" });
});

// --------------------
// 7. Status Codes + Orders
// --------------------
app.post("/orders", (req, res) => {
  const order = { id: Date.now() };
  orders.push(order);

  res.status(201).json(order);
});

app.get("/orders/:id", (req, res) => {
  const order = orders.find(o => o.id == req.params.id);

  if (!order) {
    return res.status(404).json({ error: "Not found" });
  }

  res.status(200).json(order);
});

// --------------------
// 8. Aggregator Pattern
// --------------------
app.get("/dashboard", (req, res) => {
  try {
    const user = users[0];
    const userOrders = orders;
    const notifications = ["Welcome", "New update"];

    res.json({
      user,
      orders: userOrders,
      notifications
    });
  } catch {
    res.status(500).json({ error: "Failed to load dashboard" });
  }
});

// --------------------
// 9. Authentication (JWT)
// --------------------
app.post("/login", (req, res) => {
  const { username } = req.body;

  const token = jwt.sign({ username }, SECRET);

  res.json({ token });
});

app.get("/protected", authMiddleware, (req, res) => {
  res.json({
    message: "Secure data",
    user: req.user
  });
});

// --------------------
// 10. Error Handling
// --------------------
app.get("/error-demo", (req, res, next) => {
  try {
    throw new Error("Something broke");
  } catch (err) {
    next(err);
  }
});

app.use((err, req, res, next) => {
  res.status(500).json({
    message: err.message
  });
});

// --------------------
// Start Server
// --------------------
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});