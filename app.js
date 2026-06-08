// ============ Firebase References ============
const captureRef = db.ref('captureItems');
const focusRef = db.ref('focusItems');
const projectsRef = db.ref('projects');
const habitsRef = db.ref('habits');
const brainDumpRef = db.ref('brainDump');

function habitChecksRef() {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    return db.ref('habitChecks/' + today);
}

// ============ State ============
let captureItems = [];
let focusItems = [];
let projects = [];
let habits = [];
let habitChecks = [];
let brainDump = '';

// ============ Sync Status ============
function showSyncing() {
    document.getElementById('syncStatus').textContent = '🟡 Syncing...';
}

function showSynced() {
    document.getElementById('syncStatus').textContent = '🟢 Synced';
}

function showOffline() {
    document.getElementById('syncStatus').textContent = '🔴 Offline';
}

// Connection state
db.ref('.info/connected').on('value', (snap) => {
    if (snap.val() === true) {
        showSynced();
    } else {
        showOffline();
    }
});

// ============ Date Display ============
function updateDate() {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    document.getElementById('currentDate').textContent = new Date().toLocaleDateString('en-US', options);
}

// ============ Render Functions ============
function renderCaptureList() {
    const list = document.getElementById('captureList');
    list.innerHTML = '';
    captureItems.forEach((item, index) => {
        const li = createTaskItem(item.text, item.done, (checked) => {
            captureItems[index].done = checked;
            showSyncing();
            captureRef.set(captureItems).then(showSynced);
        }, () => {
            captureItems.splice(index, 1);
            showSyncing();
            captureRef.set(captureItems).then(showSynced);
        });
        list.appendChild(li);
    });
}

function renderFocusList() {
    const list = document.getElementById('focusList');
    list.innerHTML = '';
    focusItems.forEach((item, index) => {
        const li = createTaskItem(item.text, item.done, (checked) => {
            focusItems[index].done = checked;
            showSyncing();
            focusRef.set(focusItems).then(showSynced);
        }, () => {
            focusItems.splice(index, 1);
            showSyncing();
            focusRef.set(focusItems).then(showSynced);
        });
        list.appendChild(li);
    });
    updateFocusProgress();
}

function renderHabitList() {
    const list = document.getElementById('habitList');
    list.innerHTML = '';
    habits.forEach((habit, index) => {
        const isChecked = habitChecks.includes(habit);
        const li = createTaskItem(habit, isChecked, (checked) => {
            if (checked) {
                habitChecks.push(habit);
            } else {
                habitChecks = habitChecks.filter(h => h !== habit);
            }
            showSyncing();
            habitChecksRef().set(habitChecks).then(showSynced);
            renderHabitList();
        }, () => {
            habits.splice(index, 1);
            habitChecks = habitChecks.filter(h => h !== habit);
            showSyncing();
            Promise.all([
                habitsRef.set(habits),
                habitChecksRef().set(habitChecks)
            ]).then(showSynced);
            renderHabitList();
        });
        list.appendChild(li);
    });
    updateHabitProgress();
}

function renderProjects() {
    const container = document.getElementById('projectList');
    container.innerHTML = '';
    projects.forEach((project, pIndex) => {
        const card = document.createElement('div');
        card.className = 'project-card';

        const header = document.createElement('div');
        header.className = 'project-header';
        header.innerHTML = `
            <h3>${escapeHtml(project.name)}</h3>
            <div class="project-actions">
                <button class="delete-btn" title="Delete project">&times;</button>
                <span class="toggle">▶</span>
            </div>
        `;

        const body = document.createElement('div');
        body.className = 'project-body';

        const inputDiv = document.createElement('div');
        inputDiv.className = 'capture-input';
        inputDiv.innerHTML = `
            <input type="text" placeholder="Add task to ${escapeHtml(project.name)}...">
            <button>+</button>
        `;

        const taskList = document.createElement('ul');
        taskList.className = 'task-list';

        (project.tasks || []).forEach((task, tIndex) => {
            const li = createTaskItem(task.text, task.done, (checked) => {
                projects[pIndex].tasks[tIndex].done = checked;
                showSyncing();
                projectsRef.set(projects).then(showSynced);
            }, () => {
                projects[pIndex].tasks.splice(tIndex, 1);
                showSyncing();
                projectsRef.set(projects).then(showSynced);
            });
            taskList.appendChild(li);
        });

        body.appendChild(inputDiv);
        body.appendChild(taskList);

        // Toggle project open/close
        header.addEventListener('click', (e) => {
            if (e.target.classList.contains('delete-btn')) return;
            body.classList.toggle('open');
            header.querySelector('.toggle').classList.toggle('open');
        });

        // Delete project
        header.querySelector('.delete-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            if (confirm(`Delete project "${project.name}" and all its tasks?`)) {
                projects.splice(pIndex, 1);
                showSyncing();
                projectsRef.set(projects).then(showSynced);
            }
        });

        // Add task to project
        const projInput = inputDiv.querySelector('input');
        const projBtn = inputDiv.querySelector('button');

        function addProjectTask() {
            const text = projInput.value.trim();
            if (!text) return;
            if (!projects[pIndex].tasks) projects[pIndex].tasks = [];
            projects[pIndex].tasks.push({ text, done: false });
            showSyncing();
            projectsRef.set(projects).then(() => {
                showSynced();
                // Re-open this project after re-render
                const cards = container.querySelectorAll('.project-card');
                if (cards[pIndex]) {
                    cards[pIndex].querySelector('.project-body').classList.add('open');
                    cards[pIndex].querySelector('.toggle').classList.add('open');
                }
            });
            projInput.value = '';
        }

        projBtn.addEventListener('click', addProjectTask);
        projInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') addProjectTask();
        });

        card.appendChild(header);
        card.appendChild(body);
        container.appendChild(card);
    });
}

// ============ Utility Functions ============
function createTaskItem(text, done, onToggle, onDelete) {
    const li = document.createElement('li');
    if (done) li.classList.add('completed');

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = done;
    checkbox.addEventListener('change', () => onToggle(checkbox.checked));

    const span = document.createElement('span');
    span.textContent = text;

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete-btn';
    deleteBtn.textContent = '×';
    deleteBtn.addEventListener('click', onDelete);

    li.appendChild(checkbox);
    li.appendChild(span);
    li.appendChild(deleteBtn);
    return li;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function updateFocusProgress() {
    const total = focusItems.length;
    const done = focusItems.filter(i => i.done).length;
    const pct = total === 0 ? 0 : Math.round((done / total) * 100);
    document.getElementById('focusProgress').style.width = pct + '%';
    document.getElementById('focusProgressText').textContent =
        total === 0 ? '' : `${done}/${total} complete — ${pct}%`;
}

function updateHabitProgress() {
    const total = habits.length;
    const done = habitChecks.length;
    const pct = total === 0 ? 0 : Math.round((done / total) * 100);
    document.getElementById('habitProgress').style.width = pct + '%';
    document.getElementById('habitProgressText').textContent =
        total === 0 ? '' : `${done}/${total} done today — ${pct}%`;
}

// ============ Event Listeners ============
function setupInput(inputId, btnId, callback) {
    const input = document.getElementById(inputId);
    const btn = document.getElementById(btnId);

    btn.addEventListener('click', () => {
        callback(input.value.trim());
        input.value = '';
    });

    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            callback(input.value.trim());
            input.value = '';
        }
    });
}

// Quick Capture
setupInput('quickInput', 'quickAddBtn', (text) => {
    if (!text) return;
    captureItems.unshift({ text, done: false });
    showSyncing();
    captureRef.set(captureItems).then(showSynced);
});

// Today's Focus
setupInput('focusInput', 'focusAddBtn', (text) => {
    if (!text) return;
    if (focusItems.length >= 5) {
        alert("Keep it to 5 items max! Finish something first 💪");
        return;
    }
    focusItems.push({ text, done: false });
    showSyncing();
    focusRef.set(focusItems).then(showSynced);
});

// Projects
setupInput('projectInput', 'projectAddBtn', (text) => {
    if (!text) return;
    projects.push({ name: text, tasks: [] });
    showSyncing();
    projectsRef.set(projects).then(showSynced);
});

// Habits
setupInput('habitInput', 'habitAddBtn', (text) => {
    if (!text) return;
    habits.push(text);
    showSyncing();
    habitsRef.set(habits).then(showSynced);
});

// Brain Dump - auto save with debounce
const brainDumpEl = document.getElementById('brainDump');
let saveTimeout;
brainDumpEl.addEventListener('input', () => {
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => {
        showSyncing();
        brainDumpRef.set(brainDumpEl.value).then(showSynced);
    }, 800);
});

// ============ Real-time Listeners ============
// These fire whenever data changes — on ANY device
captureRef.on('value', (snap) => {
    captureItems = snap.val() || [];
    renderCaptureList();
});

focusRef.on('value', (snap) => {
    focusItems = snap.val() || [];
    renderFocusList();
});

projectsRef.on('value', (snap) => {
    projects = snap.val() || [];
    renderProjects();
});

habitsRef.on('value', (snap) => {
    habits = snap.val() || [];
    renderHabitList();
});

habitChecksRef().on('value', (snap) => {
    habitChecks = snap.val() || [];
    renderHabitList();
});

brainDumpRef.on('value', (snap) => {
    brainDump = snap.val() || '';
    // Only update if user isn't currently typing
    if (document.activeElement !== brainDumpEl) {
        brainDumpEl.value = brainDump;
    }
});

// ============ Initialize ============
updateDate();
