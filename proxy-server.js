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
  quote: Handlebars.compile(fs.readFileSync(path.join(__dirname, "src/templates/quote.html"), "utf8")),
  people: Handlebars.compile(fs.readFileSync(path.join(__dirname, "src/templates/people.html"), "utf8")),
  editPerson: Handlebars.compile(fs.readFileSync(path.join(__dirname, "src/templates/edit-person.html"), "utf8")),
  addPerson: Handlebars.compile(fs.readFileSync(path.join(__dirname, "src/templates/add-person.html"), "utf8")),
  personRow: Handlebars.compile(fs.readFileSync(path.join(__dirname, "src/templates/person-row.html"), "utf8")),
  toast: Handlebars.compile(fs.readFileSync(path.join(__dirname, "src/templates/toast.html"), "utf8")),
  personNotFoundP: Handlebars.compile(fs.readFileSync(path.join(__dirname, "src/templates/person-not-found-p.html"), "utf8")),
  personNotFoundTr: Handlebars.compile(fs.readFileSync(path.join(__dirname, "src/templates/person-not-found-tr.html"), "utf8")),
  emptyPopover: Handlebars.compile(fs.readFileSync(path.join(__dirname, "src/templates/empty-popover.html"), "utf8")),
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
    return res.status(404).send(templates.personNotFoundP());
  }

  const template = Handlebars.compile(fs.readFileSync("src/templates/edit-person.html", "utf8"));
  res.send(template({ person }));
});

// Close popover endpoint
app.get("/api/close-popover/:type", (req, res) => {
  const type = req.params.type;
  const popoverId = type === "edit" ? "edit-popover" : "add-popover";
  res.send(templates.emptyPopover({ popoverId }));
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

  const personRowHtml = templates.personRow({ person: newPerson });
  const toastHtml = templates.toast({ name: newPerson.name, message: "ble lagt til!" });
  const popoverHtml = templates.emptyPopover({ popoverId: "add-popover" });

  res.send(personRowHtml + toastHtml + popoverHtml);
});

// Update a person
app.put("/api/people/:id", (req, res) => {
  const id = parseInt(req.params.id);
  const person = people.find((p) => p.id === id);

  if (!person) {
    return res
      .status(404)
      .send(templates.personNotFoundTr());
  }

  person.name = req.body.name || person.name;
  person.email = req.body.email || person.email;
  person.role = req.body.role || person.role;

  const personRowHtml = templates.personRow({ person });
  const toastHtml = templates.toast({ name: person.name, message: "ble oppdatert!" });
  const popoverHtml = templates.emptyPopover({ popoverId: "edit-popover" });

  // Close the popover and return updated row
  res.send(personRowHtml + toastHtml + popoverHtml);
});

// Delete a person
app.delete("/api/people/:id", (req, res) => {
  const id = parseInt(req.params.id);
  const person = people.find((p) => p.id === id);
  const personName = person ? person.name : "Person";
  people = people.filter((p) => p.id !== id);

  res.send(templates.toast({ name: personName, message: "ble slettet!" }));
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
