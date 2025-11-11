import express from "express";
import { createProxyMiddleware } from "http-proxy-middleware";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Parse JSON and URL-encoded bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Enable CORS for all routes
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "*");

  // Handle preflight OPTIONS request
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }

  next();
});

// Serve static files from _site directory
app.use(express.static(path.join(__dirname, "_site")));

// Quote endpoint for HTMX demo
const quotes = [
  { text: "HTML er kraftigere enn du tror.", author: "Web-utvikler" },
  { text: "Mindre JavaScript, bedre ytelse.", author: "Performance Guru" },
  { text: "HTMX gjør backend-utviklere lykkelige.", author: "Full-stack Dev" },
  { text: "Hypermedia er fremtiden.", author: "Roy Fielding (kanskje)" },
  { text: "SPAs er ikke alltid svaret.", author: "Pragmatisk utvikler" },
];

app.get("/api/quote", (req, res) => {
  const quote = quotes[Math.floor(Math.random() * quotes.length)];
  res.send(`
    <div>
      <p style="font-size: 1.3rem; font-style: italic; margin-bottom: 0.5rem;">
        "${quote.text}"
      </p>
      <p style="color: #6b7280; text-align: right;">
        — ${quote.author}
      </p>
    </div>
  `);
});

// People CRUD endpoints for HTMX demo
let people = [
  { id: 1, name: "Ole Nordmann", email: "ole@example.com", role: "Utvikler" },
  { id: 2, name: "Kari Hansen", email: "kari@example.com", role: "Designer" },
  { id: 3, name: "Per Jensen", email: "per@example.com", role: "Produkteier" },
];
let nextId = 4;

// Get all people (returns HTML table rows)
app.get("/api/people", (req, res) => {
  const rows = people
    .map(
      (person) => `
    <tr id="person-${person.id}">
      <td>${person.name}</td>
      <td>${person.email}</td>
      <td>${person.role}</td>
      <td class="actions">
        <button
          class="btn-edit"
          hx-get="/api/people/${person.id}/edit"
          hx-target="#edit-popover"
          hx-swap="innerHTML">
          Rediger
        </button>
        <button
          class="btn-delete"
          hx-delete="/api/people/${person.id}"
          hx-target="#person-${person.id}"
          hx-swap="outerHTML swap:0.3s">
          Slett
        </button>
      </td>
    </tr>
  `
    )
    .join("");
  res.send(rows);
});

// Get edit form for a person (popover content)
app.get("/api/people/:id/edit", (req, res) => {
  const person = people.find((p) => p.id === parseInt(req.params.id));
  if (!person) {
    return res.status(404).send("<p>Person ikke funnet</p>");
  }

  res.send(`
    <div class="popover-content">
      <h3>Rediger ${person.name}</h3>
      <form hx-put="/api/people/${person.id}" hx-target="#person-${person.id}" hx-swap="outerHTML">
        <div class="form-group">
          <label>Navn:</label>
          <input type="text" name="name" value="${person.name}" required>
        </div>
        <div class="form-group">
          <label>E-post:</label>
          <input type="email" name="email" value="${person.email}" required>
        </div>
        <div class="form-group">
          <label>Rolle:</label>
          <input type="text" name="role" value="${person.role}" required>
        </div>
        <div class="form-actions">
          <button type="submit" class="btn-save">Lagre</button>
          <button
            type="button"
            class="btn-cancel"
            hx-get="/api/close-popover/edit"
            hx-target="#edit-popover"
            hx-swap="outerHTML">
            Avbryt
          </button>
        </div>
      </form>
    </div>
  `);
});

// Close popover endpoint
app.get("/api/close-popover/:type", (req, res) => {
  const type = req.params.type;
  const popoverId = type === "edit" ? "edit-popover" : "add-popover";
  res.send(`<div id="${popoverId}"></div>`);
});

// Get add form (popover content)
app.get("/api/people/new", (req, res) => {
  res.send(`
    <div class="popover-content">
      <h3>Legg til person</h3>
      <form hx-post="/api/people" hx-target="#people-list" hx-swap="beforeend">
        <div class="form-group">
          <label>Navn:</label>
          <input type="text" name="name" required>
        </div>
        <div class="form-group">
          <label>E-post:</label>
          <input type="email" name="email" required>
        </div>
        <div class="form-group">
          <label>Rolle:</label>
          <input type="text" name="role" required>
        </div>
        <div class="form-actions">
          <button type="submit" class="btn-save">Legg til</button>
          <button
            type="button"
            class="btn-cancel"
            hx-get="/api/close-popover/add"
            hx-target="#add-popover"
            hx-swap="outerHTML">
            Avbryt
          </button>
        </div>
      </form>
    </div>
  `);
});

// Add a new person
app.post("/api/people", (req, res) => {
  const { name, email, role } = req.body;
  const newPerson = { id: nextId++, name, email, role };
  people.push(newPerson);

  res.send(`<tr id="person-${newPerson.id}"><td>${newPerson.name}</td><td>${newPerson.email}</td><td>${newPerson.role}</td><td class="actions"><button class="btn-edit" hx-get="/api/people/${newPerson.id}/edit" hx-target="#edit-popover" hx-swap="innerHTML">Rediger</button><button class="btn-delete" hx-delete="/api/people/${newPerson.id}" hx-target="#person-${newPerson.id}" hx-swap="outerHTML swap:0.3s">Slett</button></td></tr>
<div hx-swap-oob="beforeend:#toast-container"><div class="toast success"><strong>${newPerson.name}</strong> ble lagt til!</div></div>
<div id="add-popover" hx-swap-oob="outerHTML"></div>`);
});

// Update a person
app.put("/api/people/:id", (req, res) => {
  const id = parseInt(req.params.id);
  const person = people.find((p) => p.id === id);

  if (!person) {
    return res
      .status(404)
      .send('<tr><td colspan="4">Person ikke funnet</td></tr>');
  }

  person.name = req.body.name || person.name;
  person.email = req.body.email || person.email;
  person.role = req.body.role || person.role;

  // Close the popover and return updated row
  res.send(`<tr id="person-${person.id}"><td>${person.name}</td><td>${person.email}</td><td>${person.role}</td><td class="actions"><button class="btn-edit" hx-get="/api/people/${person.id}/edit" hx-target="#edit-popover" hx-swap="innerHTML">Rediger</button><button class="btn-delete" hx-delete="/api/people/${person.id}" hx-target="#person-${person.id}" hx-swap="outerHTML swap:0.3s">Slett</button></td></tr>
<div hx-swap-oob="beforeend:#toast-container"><div class="toast success"><strong>${person.name}</strong> ble oppdatert!</div></div>
<div id="edit-popover" hx-swap-oob="outerHTML"></div>`);
});

// Delete a person
app.delete("/api/people/:id", (req, res) => {
  const id = parseInt(req.params.id);
  const person = people.find((p) => p.id === id);
  const personName = person ? person.name : "Person";
  people = people.filter((p) => p.id !== id);

  res.send(`<template></template>
<div hx-swap-oob="beforeend:#toast-container"><div class="toast success"><strong>${personName}</strong> ble slettet!</div></div>`);
});

// Track active connections to prevent rate limiting
let activeConnections = 0;
const MAX_CONNECTIONS = 2;

// Proxy endpoint for bad apple demo with connection limiting
app.use(
  "/api/bad-apple",
  (req, res, next) => {
    if (activeConnections >= MAX_CONNECTIONS) {
      console.log(
        `Rate limit: ${activeConnections} active connections, rejecting request`
      );
      return res.status(429).send("Too many connections");
    }

    activeConnections++;
    console.log(`Active connections: ${activeConnections}`);

    // Clean up on close
    res.on("close", () => {
      activeConnections--;
      console.log(
        `Connection closed. Active connections: ${activeConnections}`
      );
    });

    next();
  },
  createProxyMiddleware({
    target: "https://data-star.dev",
    changeOrigin: true,
    pathRewrite: {
      "^/api/bad-apple": "/examples/bad_apple/updates",
    },
    onProxyRes: (proxyRes, req, res) => {
      // Ensure proper SSE headers
      proxyRes.headers["cache-control"] = "no-cache";
      proxyRes.headers["connection"] = "keep-alive";
    },
  })
);

app.listen(PORT, () => {
  console.log(`Proxy server running on http://localhost:${PORT}`);
});
