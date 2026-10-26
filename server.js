const express = require("express");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, "data");

app.use(express.json({ limit: "100kb" }));
app.use(express.static(path.join(__dirname, "public")));

function readJson(fileName, fallback) {
  const filePath = path.join(DATA_DIR, fileName);
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    if (error.code !== "ENOENT") console.error(`Could not read ${fileName}:`, error.message);
    return fallback;
  }
}

function writeJson(fileName, value) {
  fs.writeFileSync(path.join(DATA_DIR, fileName), JSON.stringify(value, null, 2));
}

function initializeData() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(path.join(DATA_DIR, "products.json"))) {
    writeJson("products.json", [
      { "id": 1, "name": "Laptop", "price": 45000, "category": "Electronics", "emoji": "💻", "description": "A reliable laptop for study, work, and everyday tasks.", "stock": 10 },
      { "id": 2, "name": "Wireless Headphones", "price": 1500, "category": "Accessories", "emoji": "🎧", "description": "Comfortable wireless headphones for music and calls.", "stock": 25 },
      { "id": 3, "name": "Smart Watch", "price": 2500, "category": "Electronics", "emoji": "⌚", "description": "A smart watch for everyday activity and notifications.", "stock": 18 },
      { "id": 4, "name": "Mechanical Keyboard", "price": 2200, "category": "Accessories", "emoji": "⌨️", "description": "A responsive keyboard for coding and productivity.", "stock": 15 },
      { "id": 5, "name": "Bluetooth Speaker", "price": 1800, "category": "Audio", "emoji": "🔊", "description": "A compact speaker for your desk or room.", "stock": 20 },
      { "id": 6, "name": "Phone Stand", "price": 450, "category": "Accessories", "emoji": "📱", "description": "A handy stand for video calls and watching content.", "stock": 30 }
    ]);
  }
  for (const name of ["users.json", "orders.json"]) {
    if (!fs.existsSync(path.join(DATA_DIR, name))) writeJson(name, []);
  }
}
initializeData();

// Demo sessions are kept in memory; users and orders are stored in JSON files.
const sessions = new Map();

function makePasswordHash(password, salt = crypto.randomBytes(16).toString("hex")) {
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return { salt, hash };
}

function verifyPassword(password, salt, expectedHash) {
  const actual = crypto.scryptSync(password, salt, 64);
  const expected = Buffer.from(expectedHash, "hex");
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}

function getUserFromRequest(req) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  const userId = sessions.get(token);
  if (!userId) return null;
  return readJson("users.json", []).find((user) => user.id === userId) || null;
}

function publicUser(user) {
  return { id: user.id, name: user.name, email: user.email };
}

function nextId(items) {
  return items.reduce((max, item) => Math.max(max, Number(item.id) || 0), 0) + 1;
}

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "ShopEase API is running" });
});

app.get("/api/products", (req, res) => {
  const products = readJson("products.json", []);
  const query = String(req.query.search || "").trim().toLowerCase();
  const category = String(req.query.category || "").trim().toLowerCase();
  const filtered = products.filter((product) => {
    const matchesQuery = !query || `${product.name} ${product.category} ${product.description}`.toLowerCase().includes(query);
    const matchesCategory = !category || product.category.toLowerCase() === category;
    return matchesQuery && matchesCategory;
  });
  res.json(filtered);
});

app.get("/api/products/:id", (req, res) => {
  const product = readJson("products.json", []).find((item) => item.id === Number(req.params.id));
  if (!product) return res.status(404).json({ message: "Product not found." });
  res.json(product);
});

app.post("/api/auth/register", (req, res) => {
  const name = String(req.body.name || "").trim();
  const email = String(req.body.email || "").trim().toLowerCase();
  const password = String(req.body.password || "");

  if (name.length < 2) return res.status(400).json({ message: "Name must contain at least 2 characters." });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ message: "Enter a valid email address." });
  if (password.length < 8) return res.status(400).json({ message: "Password must be at least 8 characters." });

  const users = readJson("users.json", []);
  if (users.some((user) => user.email === email)) return res.status(409).json({ message: "An account with this email already exists. Please log in." });

  const { salt, hash } = makePasswordHash(password);
  const user = { id: crypto.randomUUID(), name, email, salt, passwordHash: hash, createdAt: new Date().toISOString() };
  users.push(user);
  writeJson("users.json", users);

  const token = crypto.randomBytes(32).toString("hex");
  sessions.set(token, user.id);
  res.status(201).json({ message: "Account created successfully.", token, user: publicUser(user) });
});

app.post("/api/auth/login", (req, res) => {
  const email = String(req.body.email || "").trim().toLowerCase();
  const password = String(req.body.password || "");
  const user = readJson("users.json", []).find((item) => item.email === email);

  if (!user || !verifyPassword(password, user.salt, user.passwordHash)) {
    return res.status(401).json({ message: "Invalid email or password." });
  }

  const token = crypto.randomBytes(32).toString("hex");
  sessions.set(token, user.id);
  res.json({ message: "Logged in successfully.", token, user: publicUser(user) });
});

app.get("/api/auth/me", (req, res) => {
  const user = getUserFromRequest(req);
  if (!user) return res.status(401).json({ message: "Please log in." });
  res.json({ user: publicUser(user) });
});

app.post("/api/auth/logout", (req, res) => {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  sessions.delete(token);
  res.json({ message: "Logged out." });
});

app.get("/api/orders", (req, res) => {
  const user = getUserFromRequest(req);
  if (!user) return res.status(401).json({ message: "Please log in to view your orders." });
  const orders = readJson("orders.json", []).filter((order) => order.userId === user.id);
  res.json(orders);
});

app.post("/api/orders", (req, res) => {
  const user = getUserFromRequest(req);
  if (!user) return res.status(401).json({ message: "Please log in before checkout." });

  const items = req.body.items;
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ message: "Your cart is empty." });
  }

  const products = readJson("products.json", []);
  const orderItems = [];
  for (const requested of items) {
    const product = products.find((item) => item.id === Number(requested.id));
    const quantity = Number(requested.quantity);
    if (!product || !Number.isInteger(quantity) || quantity < 1 || quantity > 99) {
      return res.status(400).json({ message: "One or more cart items are invalid." });
    }
    if (quantity > product.stock) {
      return res.status(400).json({ message: `${product.name} does not have enough stock.` });
    }
    orderItems.push({
      productId: product.id,
      name: product.name,
      unitPrice: product.price,
      quantity,
      lineTotal: product.price * quantity
    });
  }

  // Recalculate prices on the server; never trust totals sent by the browser.
  const total = orderItems.reduce((sum, item) => sum + item.lineTotal, 0);
  for (const orderItem of orderItems) {
    const product = products.find((item) => item.id === orderItem.productId);
    product.stock -= orderItem.quantity;
  }
  writeJson("products.json", products);

  const orders = readJson("orders.json", []);
  const order = {
    id: `ORD-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(2).toString("hex").toUpperCase()}`,
    userId: user.id,
    customerName: user.name,
    items: orderItems,
    total,
    status: "Confirmed (demo)",
    createdAt: new Date().toISOString()
  };
  orders.push(order);
  writeJson("orders.json", orders);

  res.status(201).json({ message: "Order placed successfully (demo checkout).", order });
});

app.use((req, res, next) => {
  if (req.path.startsWith("/api/")) return next();
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.use((req, res) => {
  res.status(404).json({ message: "Route not found." });
});

app.use((error, req, res, next) => {
  console.error(error);
  res.status(500).json({ message: "An unexpected server error occurred." });
});

app.listen(PORT, () => {
  console.log(`ShopEase is running at http://localhost:${PORT}`);
});
