/*
  Daily Task Tracker
  ------------------
  This file keeps the task list in memory, draws it on the page,
  and saves a copy in localStorage so a refresh does not wipe it.

  A task looks like this:
  { id: "abc", title: "Walk the dog", completed: false }
*/

const STORAGE_KEY = "dailyTaskTracker.tasks";

const form = document.querySelector("#task-form");
const titleInput = document.querySelector("#task-title");
const errorEl = document.querySelector("#form-error");
const listEl = document.querySelector("#task-list");
const emptyEl = document.querySelector("#empty-message");
const totalCountEl = document.querySelector("#total-count");
const completedCountEl = document.querySelector("#completed-count");
const filterButtons = document.querySelectorAll("[data-filter]");

// "all", "pending", or "completed". Starts on All Tasks.
let currentFilter = "all";
let tasks = loadTasks();

// Read the saved list. If the data is missing or broken, start fresh.
function loadTasks() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) {
      return [];
    }

    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed)) {
      return [];
    }

    // Keep only records that still have the fields the app expects.
    return parsed.filter(
      (task) =>
        task &&
        typeof task.id === "string" &&
        typeof task.title === "string" &&
        typeof task.completed === "boolean"
    );
  } catch (error) {
    console.warn("Could not read saved tasks.", error);
    return [];
  }
}

function saveTasks() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  } catch (error) {
    console.warn("Could not save tasks.", error);
    showError("This browser could not save your tasks. They may disappear after a refresh.");
  }
}

function createId() {
  if (window.crypto && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function showError(message) {
  errorEl.textContent = message;
  errorEl.hidden = false;
  titleInput.setAttribute("aria-invalid", "true");
}

function clearError() {
  errorEl.textContent = "";
  errorEl.hidden = true;
  titleInput.removeAttribute("aria-invalid");
}

function addTask(rawTitle) {
  const title = rawTitle.trim();

  // Spaces alone are not a real task. Tell the user and do not save anything.
  if (title === "") {
    showError("Please enter a task title before adding it.");
    titleInput.focus();
    return;
  }

  tasks.push({
    id: createId(),
    title: title,
    completed: false,
  });

  clearError();
  titleInput.value = "";
  saveTasks();
  render();
  titleInput.focus();
}

// After the list is redrawn, put keyboard focus back on the same task
// when it is still visible. Otherwise land on the active filter.
function focusAfterChange(id) {
  const checkbox = listEl.querySelector(
    '.task[data-id="' + CSS.escape(id) + '"] input'
  );
  if (checkbox) {
    checkbox.focus();
    return;
  }
  const activeFilter = document.querySelector(".filter-btn.is-active");
  if (activeFilter) {
    activeFilter.focus();
  }
}

function toggleTask(id) {
  const task = tasks.find((item) => item.id === id);
  if (!task) {
    return;
  }
  task.completed = !task.completed;
  saveTasks();
  render();
  focusAfterChange(id);
}

function deleteTask(id) {
  tasks = tasks.filter((item) => item.id !== id);
  saveTasks();
  render();
  focusAfterChange(id);
}

function visibleTasks() {
  if (currentFilter === "pending") {
    return tasks.filter((task) => !task.completed);
  }
  if (currentFilter === "completed") {
    return tasks.filter((task) => task.completed);
  }
  return tasks;
}

function emptyMessage() {
  if (tasks.length === 0) {
    return "No tasks yet. Add a title above and it will show up here.";
  }
  if (currentFilter === "pending") {
    return "No pending tasks. Everything on your list is done.";
  }
  if (currentFilter === "completed") {
    return "No completed tasks yet. Check one off when you finish it.";
  }
  return "";
}

// Build each row with createElement and textContent so a title
// like "<script>" is shown as text, not run as code.
function createTaskElement(task) {
  const item = document.createElement("li");
  item.className = "task" + (task.completed ? " is-done" : "");
  item.dataset.id = task.id;

  const label = document.createElement("label");
  label.className = "task-check";

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.checked = task.completed;
  checkbox.setAttribute(
    "aria-label",
    (task.completed ? "Mark as pending: " : "Mark as completed: ") + task.title
  );

  const title = document.createElement("span");
  title.className = "task-title";
  title.textContent = task.title;

  const removeButton = document.createElement("button");
  removeButton.type = "button";
  removeButton.className = "delete-btn";
  removeButton.dataset.action = "delete";
  removeButton.textContent = "Delete";
  removeButton.setAttribute("aria-label", "Delete " + task.title);

  label.append(checkbox, title);
  item.append(label, removeButton);
  return item;
}

function render() {
  const completedCount = tasks.filter((task) => task.completed).length;
  totalCountEl.textContent = String(tasks.length);
  completedCountEl.textContent = String(completedCount);

  const showing = visibleTasks();
  listEl.replaceChildren();
  showing.forEach((task) => {
    listEl.append(createTaskElement(task));
  });

  const message = showing.length === 0 ? emptyMessage() : "";
  emptyEl.textContent = message;
  emptyEl.hidden = message === "";
}

function setFilter(nextFilter) {
  currentFilter = nextFilter;
  filterButtons.forEach((button) => {
    const isSelected = button.dataset.filter === nextFilter;
    button.classList.toggle("is-active", isSelected);
    button.setAttribute("aria-pressed", isSelected ? "true" : "false");
  });
  render();
}

form.addEventListener("submit", (event) => {
  // Stop the browser from reloading the page, which would feel like the task vanished.
  event.preventDefault();
  addTask(titleInput.value);
});

titleInput.addEventListener("input", () => {
  if (titleInput.value.trim() !== "") {
    clearError();
  }
});

filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    setFilter(button.dataset.filter);
  });
});

// One listener on the list handles every checkbox and Delete button,
// including rows that are created later.
listEl.addEventListener("change", (event) => {
  const checkbox = event.target;
  if (checkbox instanceof HTMLInputElement && checkbox.type === "checkbox") {
    const item = checkbox.closest(".task");
    if (item) {
      toggleTask(item.dataset.id);
    }
  }
});

listEl.addEventListener("click", (event) => {
  const button = event.target.closest("[data-action='delete']");
  if (!button) {
    return;
  }
  const item = button.closest(".task");
  if (item) {
    deleteTask(item.dataset.id);
  }
});

render();
