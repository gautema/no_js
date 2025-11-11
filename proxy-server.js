import express from "express";
import { createProxyMiddleware } from "http-proxy-middleware";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import Handlebars from "handlebars";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

const templates = {
  quote: Handlebars.compile(fs.readFileSync("src/templates/quote.html", "utf8")),
  people: Handlebars.compile(fs.readFileSync("src/templates/people.html", "utf8")),
  editPerson: Handlebars.compile(fs.readFileSync("src/templates/edit-person.html", "utf8")),
  addPerson: Handlebars.compile(fs.readFileSync("src/templates/add-person.html", "utf8")),
  personRow: Handlebars.compile(fs.readFileSync("src/templates/person-row.html", "utf8")),
};

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
  res.send(templates.quote({ quote }));
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
  const template = Handlebars.compile(fs.readFileSync("src/templates/people.html", "utf8"));
  res.send(template({ people }));
});

// Get edit form for a person (popover content)
app.get("/api/people/:id/edit", (req, res) => {
  const person = people.find((p) => p.id === parseInt(req.params.id));
  if (!person) {
    return res.status(404).send("<p>Person ikke funnet</p>");
  }

  const template = Handlebars.compile(fs.readFileSync("src/templates/edit-person.html", "utf8"));
  res.send(template({ person }));
});

// Close popover endpoint
app.get("/api/close-popover/:type", (req, res) => {
  const type = req.params.type;
  const popoverId = type === "edit" ? "edit-popover" : "add-popover";
  res.send(`<div id="${popoverId}"></div>`);
});

// Get add form (popover content)
app.get("/api/people/new", (req, res) => {
  const template = Handlebars.compile(fs.readFileSync("src/templates/add-person.html", "utf8"));
  res.send(template({}));
});

// Add a new person
app.post("/api/people", (req, res) => {
  const { name, email, role } = req.body;
  const newPerson = { id: nextId++, name, email, role };
  people.push(newPerson);

  const template = Handlebars.compile(fs.readFileSync("src/templates/person-row.html", "utf8"));
  const html = template({ person: newPerson });

  res.send(`${html}
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

  const template = Handlebars.compile(fs.readFileSync("src/templates/person-row.html", "utf8"));
  const html = template({ person });

  // Close the popover and return updated row
  res.send(`${html}
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
