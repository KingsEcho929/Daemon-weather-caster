// Simple Todo app with Local Storage
// Features:
// - Add / Edit / Delete tasks
// - Toggle complete
// - Filter (all / active / completed)
// - Search
// - Persistent storage via localStorage
// - Lightweight, accessible interactions

(() => {
  const STORAGE_KEY = 'todo_local_v1';

  // DOM
  const newTodoInput = document.getElementById('newTodo');
  const addBtn = document.getElementById('addBtn');
  const todoListEl = document.getElementById('todoList');
  const countsEl = document.getElementById('counts');
  const filterBtns = document.querySelectorAll('.filter');
  const searchInput = document.getElementById('search');
  const clearCompletedBtn = document.getElementById('clearCompleted');
  const clearAllBtn = document.getElementById('clearAll');
  const tpl = document.getElementById('taskTpl');

  // State
  let tasks = [];
  let filter = 'all';
  let search = '';

  // Utilities
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2,8);
  const nowIso = () => new Date().toISOString();
  const save = () => localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  const load = () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      tasks = raw ? JSON.parse(raw) : [];
    } catch(e) { tasks = []; }
  };

  // Rendering
  function render() {
    // filter & search
    const q = search.trim().toLowerCase();
    let list = tasks.slice();
    if (filter === 'active') list = list.filter(t => !t.completed);
    if (filter === 'completed') list = list.filter(t => t.completed);
    if (q) list = list.filter(t => t.title.toLowerCase().includes(q));

    // clear UI
    todoListEl.innerHTML = '';

    // render items
    for (const task of list) {
      const node = tpl.content.firstElementChild.cloneNode(true);
      node.dataset.id = task.id;
      node.classList.toggle('completed', task.completed);

      const chkInput = node.querySelector('.toggle');
      const titleEl = node.querySelector('.title');
      const createdEl = node.querySelector('.created');
      const editBtn = node.querySelector('.edit');
      const delBtn = node.querySelector('.delete');

      chkInput.checked = !!task.completed;
      titleEl.textContent = task.title;
      createdEl.textContent = `created: ${new Date(task.created).toLocaleString()}`;

      // toggle complete
      chkInput.addEventListener('change', (e) => {
        task.completed = e.target.checked;
        save();
        render();
      });

      // edit inline
      editBtn.addEventListener('click', () => {
        enableEdit(titleEl, task);
      });

      // support double click to edit
      titleEl.addEventListener('dblclick', () => enableEdit(titleEl, task));

      // delete
      delBtn.addEventListener('click', () => {
        tasks = tasks.filter(t => t.id !== task.id);
        save();
        render();
      });

      todoListEl.appendChild(node);
    }

    // counts
    const total = tasks.length;
    const remaining = tasks.filter(t => !t.completed).length;
    countsEl.textContent = `${remaining} active • ${total} total`;
  }

  // Inline edit helper
  function enableEdit(titleEl, task) {
    titleEl.contentEditable = 'true';
    titleEl.focus();
    // move caret to end
    document.execCommand('selectAll', false, null);
    document.getSelection().collapseToEnd();

    function finishEdit(saveChanges) {
      titleEl.contentEditable = 'false';
      titleEl.removeEventListener('blur', onBlur);
      titleEl.removeEventListener('keydown', onKeydown);
      if (saveChanges) {
        const newTitle = titleEl.textContent.trim();
        if (newTitle) {
          task.title = newTitle;
          task.updated = nowIso();
          save();
        } else {
          // empty => delete
          tasks = tasks.filter(t => t.id !== task.id);
          save();
        }
      } else {
        // revert UI to stored title
        titleEl.textContent = task.title;
      }
      render();
    }

    function onBlur() { finishEdit(true); }
    function onKeydown(e) {
      if (e.key === 'Enter') { e.preventDefault(); finishEdit(true); }
      if (e.key === 'Escape') { e.preventDefault(); finishEdit(false); }
    }

    titleEl.addEventListener('blur', onBlur);
    titleEl.addEventListener('keydown', onKeydown);
  }

  // actions
  function addTask(title) {
    const t = title.trim();
    if (!t) return;
    tasks.unshift({
      id: uid(),
      title: t,
      created: nowIso(),
      updated: null,
      completed: false
    });
    save();
    render();
  }

  function clearCompleted() {
    tasks = tasks.filter(t => !t.completed);
    save();
    render();
  }

  function clearAll() {
    if (!confirm('Clear all tasks? This cannot be undone.')) return;
    tasks = [];
    save();
    render();
  }

  // event bindings
  addBtn.addEventListener('click', () => {
    addTask(newTodoInput.value);
    newTodoInput.value = '';
    newTodoInput.focus();
  });
  newTodoInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      addTask(newTodoInput.value);
      newTodoInput.value = '';
    }
  });

  filterBtns.forEach(btn => btn.addEventListener('click', (e) => {
    filterBtns.forEach(b => b.classList.remove('active'));
    e.currentTarget.classList.add('active');
    filter = e.currentTarget.dataset.filter || 'all';
    render();
  }));

  searchInput.addEventListener('input', (e) => {
    search = e.target.value || '';
    render();
  });

  clearCompletedBtn.addEventListener('click', () => {
    clearCompleted();
  });

  clearAllBtn.addEventListener('click', () => {
    clearAll();
  });

  // Initialization
  load();
  render();

  // Expose for debugging (optional)
  window.__todo_app = {
    get tasks() { return tasks.slice(); },
    save,
    load,
    render
  };
})();
