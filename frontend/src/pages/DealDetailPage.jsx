import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import api from "../api/client";
import { useAuth } from "../auth/useAuth";
import {
  displayName,
  formatCurrency,
  formatDate,
  formatDateTime,
  stageClass,
  stageLabels,
} from "../lib/format";

const stages = stageLabels;
const stageOrder = [
  "NEW",
  "QUALIFIED",
  "PROPOSAL",
  "NEGOTIATION",
  "WON",
  "LOST",
];
const forwardActions = {
  NEW: ["QUALIFIED"],
  QUALIFIED: ["PROPOSAL"],
  PROPOSAL: ["NEGOTIATION"],
  NEGOTIATION: ["WON", "LOST"],
};
const backwardActions = {
  QUALIFIED: "NEW",
  PROPOSAL: "QUALIFIED",
  NEGOTIATION: "PROPOSAL",
};
const taskEmpty = {
  title: "",
  description: "",
  dueDate: "",
  assignedToId: "",
};

const empty = {
  title: "",
  value: "",
  expectedCloseDate: "",
  companyId: "",
  ownerId: "",
};

function errorMessage(error, fallback) {
  return error.response?.data?.error?.message || fallback;
}

function historyTitle(type) {
  if (type === "DEAL_CREATED") return "Deal created";
  if (type === "STAGE_CHANGED") return "Stage changed";
  if (type === "OWNER_REASSIGNED") return "Owner reassigned";
  if (type === "NOTE_ADDED") return "Note added";
  return type;
}

export default function DealDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [deal, setDeal] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [owners, setOwners] = useState([]);
  const [collaborators, setCollaborators] = useState([]);
  const [history, setHistory] = useState([]);
  const [candidateUsers, setCandidateUsers] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [taskForm, setTaskForm] = useState(taskEmpty);
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [editingTaskForm, setEditingTaskForm] = useState(taskEmpty);
  const [taskSaving, setTaskSaving] = useState(false);
  const [selectedCollaborator, setSelectedCollaborator] = useState("");
  const [noteBody, setNoteBody] = useState("");
  const [form, setForm] = useState(empty);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lifecycleSaving, setLifecycleSaving] = useState(false);
  const [noteSaving, setNoteSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const [dealResponse, companyResponse, ownerResponse] =
          await Promise.all([
            api.get(`/deals/${id}`),
            api.get("/companies"),
            user.role === "MANAGER"
              ? api.get("/deals/owners")
              : Promise.resolve(null),
          ]);
        const current = dealResponse.data.data.deal;
        const [collaboratorResponse, candidateResponse, historyResponse, taskResponse] =
          await Promise.all([
            api.get(`/deals/${id}/collaborators`),
            current.ownerId === user.id || user.role === "MANAGER"
              ? api.get(`/deals/${id}/collaborator-candidates`)
              : Promise.resolve({ data: { data: { candidates: [] } } }),
            api.get(`/deals/${id}/history`),
            api.get(`/deals/${id}/tasks`),
          ]);
        setDeal(current);
        setForm({
          title: current.title,
          value: String(current.value),
          expectedCloseDate: current.expectedCloseDate.slice(0, 10),
          companyId: current.companyId,
          ownerId: current.ownerId,
        });
        setCompanies(companyResponse.data.data.companies);
        setOwners(ownerResponse?.data.data.owners || []);
        setCollaborators(collaboratorResponse.data.data.collaborators);
        setHistory(historyResponse.data.data.events);
        setTasks(taskResponse.data.data.tasks);
        setCandidateUsers(
          current.ownerId === user.id || user.role === "MANAGER"
            ? candidateResponse.data.data.candidates
            : [],
        );
        setTaskForm({ ...taskEmpty, assignedToId: current.ownerId });
      } catch (requestError) {
        setError(errorMessage(requestError, "Unable to load deal."));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id, user.id, user.role]);

  useEffect(() => {
    if (loading) return;
    if (location.hash === "#tasks") {
      document.getElementById("tasks")?.scrollIntoView({ behavior: "smooth" });
    }
  }, [loading, location.hash]);

  function change(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function loadHistory() {
    const response = await api.get(`/deals/${id}/history`);
    setHistory(response.data.data.events);
  }

  async function save(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const payload = {
        title: form.title,
        value: form.value,
        expectedCloseDate: form.expectedCloseDate,
        companyId: form.companyId,
      };
      if (user.role === "MANAGER") payload.ownerId = form.ownerId;
      const response = await api.patch(`/deals/${id}`, payload);
      const updated = response.data.data.deal;
      setDeal(updated);
      setForm({
        title: updated.title,
        value: String(updated.value),
        expectedCloseDate: updated.expectedCloseDate.slice(0, 10),
        companyId: updated.companyId,
        ownerId: updated.ownerId,
      });
      await loadHistory();
    } catch (requestError) {
      setError(errorMessage(requestError, "Unable to update deal."));
    } finally {
      setSaving(false);
    }
  }

  async function changeStage(nextStage, backwardReason = "") {
    setLifecycleSaving(true);
    setError("");
    try {
      const response = await api.patch(`/deals/${id}/stage`, {
        stage: nextStage,
        ...(backwardReason ? { reason: backwardReason } : {}),
      });
      setDeal(response.data.data.deal);
      setReason("");
      await loadHistory();
    } catch (requestError) {
      setError(errorMessage(requestError, "Unable to change deal stage."));
    } finally {
      setLifecycleSaving(false);
    }
  }

  async function moveBack(event) {
    event.preventDefault();
    const trimmedReason = reason.trim();
    if (!trimmedReason) {
      setError("A reason is required when moving a deal backward.");
      return;
    }
    await changeStage(backwardActions[deal.stage], trimmedReason);
  }

  async function reopen() {
    setLifecycleSaving(true);
    setError("");
    try {
      const response = await api.post(`/deals/${id}/reopen`);
      setDeal(response.data.data.deal);
      await loadHistory();
    } catch (requestError) {
      setError(errorMessage(requestError, "Unable to reopen deal."));
    } finally {
      setLifecycleSaving(false);
    }
  }

  async function addCollaborator(event) {
    event.preventDefault();
    if (!selectedCollaborator) return;
    setSaving(true);
    setError("");
    try {
      const response = await api.post(`/deals/${id}/collaborators`, {
        userId: selectedCollaborator,
      });
      setCollaborators((current) => [
        ...current,
        response.data.data.collaborator,
      ]);
      setSelectedCollaborator("");
    } catch (requestError) {
      setError(errorMessage(requestError, "Unable to add collaborator."));
    } finally {
      setSaving(false);
    }
  }

  async function removeCollaborator(userId) {
    setSaving(true);
    setError("");
    try {
      await api.delete(`/deals/${id}/collaborators/${userId}`);
      setCollaborators((current) =>
        current.filter((collaborator) => collaborator.id !== userId),
      );
    } catch (requestError) {
      setError(errorMessage(requestError, "Unable to remove collaborator."));
    } finally {
      setSaving(false);
    }
  }

  function changeTaskForm(setter, field, value) {
    setter((current) => ({ ...current, [field]: value }));
  }

  function taskAssignees() {
    const users = [deal.owner, ...collaborators];
    return users.filter(
      (candidate, index, list) =>
        candidate?.role === "SALES_REP" &&
        list.findIndex((item) => item.id === candidate.id) === index,
    );
  }

  async function addTask(event) {
    event.preventDefault();
    const title = taskForm.title.trim();
    if (!title) {
      setError("Task title is required.");
      return;
    }
    setTaskSaving(true);
    setError("");
    try {
      const response = await api.post(`/deals/${id}/tasks`, {
        title,
        description: taskForm.description,
        dueDate: taskForm.dueDate || null,
        assignedToId: taskForm.assignedToId,
      });
      setTasks((current) => [response.data.data.task, ...current]);
      setTaskForm({ ...taskEmpty, assignedToId: deal.ownerId });
    } catch (requestError) {
      setError(errorMessage(requestError, "Unable to create task."));
    } finally {
      setTaskSaving(false);
    }
  }

  function beginTaskEdit(task) {
    setEditingTaskId(task.id);
    setEditingTaskForm({
      title: task.title,
      description: task.description || "",
      dueDate: task.dueDate ? task.dueDate.slice(0, 10) : "",
      assignedToId: task.assignedToId,
    });
  }

  function cancelTaskEdit() {
    setEditingTaskId(null);
    setEditingTaskForm(taskEmpty);
  }

  async function updateTask(event, task) {
    event.preventDefault();
    const title = editingTaskForm.title.trim();
    if (!title) {
      setError("Task title is required.");
      return;
    }
    setTaskSaving(true);
    setError("");
    try {
      const payload = {
        title,
        description: editingTaskForm.description,
        dueDate: editingTaskForm.dueDate || null,
      };
      if (canManageTasks) payload.assignedToId = editingTaskForm.assignedToId;
      const response = await api.patch(`/deals/${id}/tasks/${task.id}`, payload);
      setTasks((current) =>
        current.map((item) => (item.id === task.id ? response.data.data.task : item)),
      );
      cancelTaskEdit();
    } catch (requestError) {
      setError(errorMessage(requestError, "Unable to update task."));
    } finally {
      setTaskSaving(false);
    }
  }

  async function setTaskStatus(task, status) {
    setTaskSaving(true);
    setError("");
    try {
      const response = await api.patch(`/deals/${id}/tasks/${task.id}`, { status });
      setTasks((current) =>
        current.map((item) => (item.id === task.id ? response.data.data.task : item)),
      );
    } catch (requestError) {
      setError(errorMessage(requestError, "Unable to update task status."));
    } finally {
      setTaskSaving(false);
    }
  }

  async function removeTask(task) {
    if (!window.confirm(`Delete task "${task.title}"?`)) return;
    setTaskSaving(true);
    setError("");
    try {
      await api.delete(`/deals/${id}/tasks/${task.id}`);
      setTasks((current) => current.filter((item) => item.id !== task.id));
    } catch (requestError) {
      setError(errorMessage(requestError, "Unable to delete task."));
    } finally {
      setTaskSaving(false);
    }
  }

  async function addNote(event) {
    event.preventDefault();
    const trimmedNote = noteBody.trim();
    if (!trimmedNote) {
      setError("A note is required.");
      return;
    }
    setNoteSaving(true);
    setError("");
    try {
      await api.post(`/deals/${id}/notes`, { body: trimmedNote });
      setNoteBody("");
      await loadHistory();
    } catch (requestError) {
      setError(errorMessage(requestError, "Unable to add note."));
    } finally {
      setNoteSaving(false);
    }
  }

  async function remove() {
    if (!window.confirm("Delete this deal?")) return;
    try {
      await api.delete(`/deals/${id}`);
      navigate("/deals");
    } catch (requestError) {
      setError(errorMessage(requestError, "Unable to delete deal."));
    }
  }

  if (loading)
    return <p className="text-slate-500">Loading deal...</p>;
  if (error && !deal)
    return <p className="alert-error">{error}</p>;
  if (!deal) return null;

  const closed = deal.stage === "WON" || deal.stage === "LOST";
  const nextStages = forwardActions[deal.stage] || [];
  const previousStage = backwardActions[deal.stage];
  const canManageCollaborators =
    user.role === "MANAGER" || deal.ownerId === user.id;
  const isDealCollaborator = collaborators.some(
    (collaborator) => collaborator.id === user.id,
  );
  const canManageTasks = user.role === "MANAGER" || deal.ownerId === user.id;
  const canEditTasks = canManageTasks || isDealCollaborator;
  const availableCollaborators = candidateUsers.filter(
    (candidate) =>
      candidate.id !== deal.ownerId &&
      !collaborators.some((collaborator) => collaborator.id === candidate.id),
  );

  return (
    <div className="mx-auto max-w-6xl">
      <Link className="text-sm font-medium text-indigo-600 hover:text-indigo-500" to="/deals">
        Back to deals
      </Link>

      <section className="card mt-4 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold text-slate-900">{deal.title}</h2>
            <p className="mt-2 text-sm text-slate-500">
              {deal.company.name} · Owner {displayName(deal.owner.email)}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className={stageClass(deal.stage)}>{stages[deal.stage]}</span>
            <span className="text-lg font-semibold text-slate-900">
              {formatCurrency(deal.value)}
            </span>
          </div>
        </div>
        <dl className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Company</dt>
            <dd className="mt-1 text-sm text-slate-800">{deal.company.name}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Deal value</dt>
            <dd className="mt-1 text-sm text-slate-800">{formatCurrency(deal.value)}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Expected close</dt>
            <dd className="mt-1 text-sm text-slate-800">{formatDate(deal.expectedCloseDate)}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Owner</dt>
            <dd className="mt-1 text-sm text-slate-800">{displayName(deal.owner.email)}</dd>
          </div>
        </dl>
      </section>

      {error && <p className="alert-error mt-4">{error}</p>}

      <section
        className="card mt-6 p-6"
        aria-labelledby="lifecycle-heading"
      >
        <h2 id="lifecycle-heading" className="text-lg font-semibold text-slate-900">
          Deal progression
        </h2>
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {stageOrder.map((stage, index) => {
            const currentIndex = stageOrder.indexOf(deal.stage);
            const isCurrent = deal.stage === stage;
            const isPast =
              deal.stage === "LOST"
                ? false
                : index < currentIndex;
            return (
              <div
                className={`rounded-lg border px-2 py-3 text-center text-sm ${
                  isCurrent
                    ? deal.stage === "LOST"
                      ? "border-red-200 bg-red-50 font-semibold text-red-800"
                      : deal.stage === "WON"
                        ? "border-emerald-200 bg-emerald-50 font-semibold text-emerald-800"
                        : "border-indigo-300 bg-indigo-50 font-semibold text-indigo-800"
                    : isPast
                      ? "border-slate-200 bg-slate-50 text-slate-700"
                      : "border-slate-200 text-slate-400"
                }`}
                key={stage}
              >
                {stages[stage]}
              </div>
            );
          })}
        </div>
        {closed ? (
          <div className="mt-5">
            <p className="text-slate-600">
              This deal is closed. Only a manager can reopen it.
            </p>
            {user.role === "MANAGER" && (
              <button
                className="btn btn-primary mt-4"
                disabled={lifecycleSaving}
                onClick={reopen}
              >
                {lifecycleSaving ? "Reopening..." : "Reopen Deal"}
              </button>
            )}
          </div>
        ) : (
          <div className="mt-5 space-y-5">
            <div className="flex flex-wrap gap-3">
              {nextStages.map((nextStage) => (
                <button
                  className={
                    nextStage === "LOST"
                      ? "btn btn-danger"
                      : nextStage === "WON"
                        ? "btn btn-success"
                        : "btn btn-primary"
                  }
                  disabled={lifecycleSaving}
                  key={nextStage}
                  onClick={() => changeStage(nextStage)}
                >
                  {lifecycleSaving
                    ? "Updating..."
                    : nextStage === "WON"
                      ? "Mark Won"
                      : nextStage === "LOST"
                        ? "Mark Lost"
                        : `Advance to ${stages[nextStage]}`}
                </button>
              ))}
            </div>
            {previousStage && (
              <form onSubmit={moveBack}>
                <label className="block text-sm font-medium text-slate-700">
                  Reason for moving backward
                  <textarea
                    className="textarea min-h-20"
                    value={reason}
                    onChange={(event) => setReason(event.target.value)}
                    placeholder="Explain why the deal is moving back."
                    required
                  />
                </label>
                <button className="btn btn-secondary mt-3" disabled={lifecycleSaving}>
                  {lifecycleSaving
                    ? "Updating..."
                    : `Move back to ${stages[previousStage]}`}
                </button>
              </form>
            )}
          </div>
        )}
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section
          className="card p-6"
          aria-labelledby="collaborators-heading"
        >
          <h2 id="collaborators-heading" className="text-lg font-semibold text-slate-900">
            Collaborators
          </h2>
          {collaborators.length === 0 ? (
            <p className="mt-4 text-slate-500">No collaborators assigned.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {collaborators.map((collaborator) => (
                <li
                  className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 p-3"
                  key={collaborator.id}
                >
                  <div>
                    <p className="font-medium text-slate-900">
                      {displayName(collaborator.email)}
                    </p>
                    <p className="text-sm text-slate-500">Sales Rep</p>
                  </div>
                  {canManageCollaborators && (
                    <button
                      className="btn btn-danger"
                      disabled={saving}
                      onClick={() => removeCollaborator(collaborator.id)}
                    >
                      Remove
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
          {canManageCollaborators && (
            <form
              className="mt-5 flex flex-col gap-3 sm:flex-row"
              onSubmit={addCollaborator}
            >
              <select
                className="select mt-0 flex-1"
                value={selectedCollaborator}
                onChange={(event) =>
                  setSelectedCollaborator(event.target.value)
                }
                aria-label="Select Sales Rep"
              >
                <option value="">Select Sales Rep</option>
                {availableCollaborators.map((candidate) => (
                  <option key={candidate.id} value={candidate.id}>
                    {displayName(candidate.email)}
                  </option>
                ))}
              </select>
              <button
                className="btn btn-primary"
                disabled={!selectedCollaborator || saving}
              >
                {saving ? "Adding..." : "Add Collaborator"}
              </button>
            </form>
          )}
        </section>

        <section id="tasks" className="card p-6" aria-labelledby="tasks-heading">
          <h2 id="tasks-heading" className="text-lg font-semibold text-slate-900">
            Tasks & Follow-ups
          </h2>
          {tasks.length === 0 ? (
            <p className="mt-4 text-slate-500">No tasks created for this deal.</p>
          ) : (
            <ul className="mt-5 space-y-4">
              {tasks.map((task) => {
                const overdue =
                  task.status === "PENDING" &&
                  task.dueDate &&
                  new Date(task.dueDate) < new Date(new Date().toISOString().slice(0, 10));
                const isEditing = editingTaskId === task.id;
                return (
                  <li className="rounded-lg border border-slate-200 p-4" key={task.id}>
                    {isEditing ? (
                      <form className="space-y-3" onSubmit={(event) => updateTask(event, task)}>
                        <input
                          className="input mt-0"
                          value={editingTaskForm.title}
                          onChange={(event) => changeTaskForm(setEditingTaskForm, "title", event.target.value)}
                          maxLength={255}
                          required
                        />
                        <textarea
                          className="textarea min-h-20"
                          value={editingTaskForm.description}
                          onChange={(event) => changeTaskForm(setEditingTaskForm, "description", event.target.value)}
                          maxLength={5000}
                          placeholder="Description"
                        />
                        <div className="grid gap-3 sm:grid-cols-2">
                          <label className="text-sm font-medium text-slate-700">
                            Due date
                            <input
                              type="date"
                              className="input"
                              value={editingTaskForm.dueDate}
                              onChange={(event) => changeTaskForm(setEditingTaskForm, "dueDate", event.target.value)}
                            />
                          </label>
                          {canManageTasks && (
                            <label className="text-sm font-medium text-slate-700">
                              Assigned to
                              <select
                                className="select"
                                value={editingTaskForm.assignedToId}
                                onChange={(event) => changeTaskForm(setEditingTaskForm, "assignedToId", event.target.value)}
                                required
                              >
                                {taskAssignees().map((candidate) => (
                                  <option key={candidate.id} value={candidate.id}>
                                    {displayName(candidate.email)}
                                  </option>
                                ))}
                              </select>
                            </label>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <button className="btn btn-primary" disabled={taskSaving}>
                            {taskSaving ? "Saving..." : "Save task"}
                          </button>
                          <button type="button" className="btn btn-secondary" onClick={cancelTaskEdit} disabled={taskSaving}>
                            Cancel
                          </button>
                        </div>
                      </form>
                    ) : (
                      <>
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <p className="font-medium text-slate-900">{task.title}</p>
                            {task.description && (
                              <p className="mt-1 whitespace-pre-wrap text-sm text-slate-600">{task.description}</p>
                            )}
                            <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-500">
                              <span>Assigned: {displayName(task.assignedTo?.email)}</span>
                              <span>
                                Due: {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : "No due date"}
                              </span>
                            </div>
                          </div>
                          <span
                            className={
                              task.status === "COMPLETED"
                                ? "badge badge-green"
                                : overdue
                                  ? "badge badge-red"
                                  : "badge badge-amber"
                            }
                          >
                            {task.status === "COMPLETED" ? "Completed" : overdue ? "Overdue" : "Pending"}
                          </span>
                        </div>
                        <div className="mt-4 flex flex-wrap gap-2">
                          {task.status === "PENDING" ? (
                            <button
                              type="button"
                              className="btn btn-success"
                              onClick={() => setTaskStatus(task, "COMPLETED")}
                              disabled={taskSaving}
                            >
                              Complete
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="btn btn-secondary"
                              onClick={() => setTaskStatus(task, "PENDING")}
                              disabled={taskSaving}
                            >
                              Reopen
                            </button>
                          )}
                          {canEditTasks && (
                            <button type="button" className="btn btn-secondary" onClick={() => beginTaskEdit(task)} disabled={taskSaving}>
                              Edit
                            </button>
                          )}
                          {canManageTasks && (
                            <button type="button" className="btn btn-danger" onClick={() => removeTask(task)} disabled={taskSaving}>
                              Delete
                            </button>
                          )}
                        </div>
                      </>
                    )}
                  </li>
                );
              })}
            </ul>
          )}

          {canManageTasks && (
            <form className="mt-6 space-y-3 border-t border-slate-200 pt-5" onSubmit={addTask}>
              <h3 className="font-medium text-slate-900">Add Task</h3>
              <input
                className="input mt-0"
                value={taskForm.title}
                onChange={(event) => changeTaskForm(setTaskForm, "title", event.target.value)}
                maxLength={255}
                placeholder="Task title"
                required
              />
              <textarea
                className="textarea min-h-20"
                value={taskForm.description}
                onChange={(event) => changeTaskForm(setTaskForm, "description", event.target.value)}
                maxLength={5000}
                placeholder="Description (optional)"
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-sm font-medium text-slate-700">
                  Due date
                  <input
                    type="date"
                    className="input"
                    value={taskForm.dueDate}
                    onChange={(event) => changeTaskForm(setTaskForm, "dueDate", event.target.value)}
                  />
                </label>
                <label className="text-sm font-medium text-slate-700">
                  Assigned to
                  <select
                    className="select"
                    value={taskForm.assignedToId}
                    onChange={(event) => changeTaskForm(setTaskForm, "assignedToId", event.target.value)}
                    required
                  >
                    <option value="">Select Sales Rep</option>
                    {taskAssignees().map((candidate) => (
                      <option key={candidate.id} value={candidate.id}>
                        {displayName(candidate.email)}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <button className="btn btn-primary" disabled={taskSaving || !taskForm.assignedToId}>
                {taskSaving ? "Adding..." : "Add Task"}
              </button>
            </form>
          )}
        </section>
      </div>

      <section
        className="card mt-6 p-6"
        aria-labelledby="history-heading"
      >
        <h2 id="history-heading" className="text-lg font-semibold text-slate-900">
          Timeline
        </h2>
        {history.length === 0 ? (
          <p className="mt-4 text-slate-500">No history recorded yet.</p>
        ) : (
          <ol className="mt-5 space-y-4 border-l border-slate-200 pl-5">
            {history.map((event) => (
              <li className="relative" key={event.id}>
                <span className="absolute left-[-1.6rem] top-1.5 h-2.5 w-2.5 rounded-full bg-indigo-500" />
                <p className="font-medium text-slate-900">{historyTitle(event.type)}</p>
                {event.type === "STAGE_CHANGED" && (
                  <p className="mt-1 text-sm text-slate-600">
                    {stages[event.oldStage] || event.oldStage} → {stages[event.newStage] || event.newStage}
                    {event.backwardReason && (
                      <span className="block text-slate-500">
                        Reason: {event.backwardReason}
                      </span>
                    )}
                  </p>
                )}
                {event.type === "OWNER_REASSIGNED" && (
                  <p className="mt-1 text-sm text-slate-600">
                    {displayName(event.previousOwner?.email)} →{" "}
                    {displayName(event.newOwner?.email)}
                  </p>
                )}
                {event.type === "NOTE_ADDED" && (
                  <p className="mt-1 whitespace-pre-wrap text-sm text-slate-600">
                    {event.noteBody}
                  </p>
                )}
                <p className="mt-1 text-xs text-slate-500">
                  by {displayName(event.actor?.email)} · {formatDateTime(event.occurredAt)}
                </p>
              </li>
            ))}
          </ol>
        )}
        <form className="mt-6" onSubmit={addNote}>
          <label className="block text-sm font-medium text-slate-700">
            Add note
            <textarea
              className="textarea min-h-20"
              value={noteBody}
              onChange={(event) => setNoteBody(event.target.value)}
              maxLength={5000}
              placeholder="Add a note to this deal."
            />
          </label>
          <button
            className="btn btn-secondary mt-3"
            disabled={noteSaving || !noteBody.trim()}
          >
            {noteSaving ? "Adding..." : "Add Note"}
          </button>
        </form>
      </section>

      <form className="card mt-6 p-6" onSubmit={save}>
        <h2 className="text-lg font-semibold text-slate-900">Deal details</h2>
        <label className="mt-3 block text-sm font-medium text-slate-700">
          Title
          <input
            className="input"
            value={form.title}
            onChange={(e) => change("title", e.target.value)}
            required
          />
        </label>
        <label className="mt-3 block text-sm font-medium text-slate-700">
          Value
          <input
            type="text"
            inputMode="decimal"
            pattern="^\d{1,12}(\.\d{1,2})?$"
            className="input"
            value={form.value}
            onChange={(e) => change("value", e.target.value)}
            required
          />
        </label>
        <label className="mt-3 block text-sm font-medium text-slate-700">
          Expected close date
          <input
            type="date"
            className="input"
            value={form.expectedCloseDate}
            onChange={(e) => change("expectedCloseDate", e.target.value)}
            required
          />
        </label>
        <label className="mt-3 block text-sm font-medium text-slate-700">
          Company
          <select
            className="select"
            value={form.companyId}
            onChange={(e) => change("companyId", e.target.value)}
            required
          >
            {companies.map((company) => (
              <option key={company.id} value={company.id}>
                {company.name}
              </option>
            ))}
          </select>
        </label>
        {user.role === "MANAGER" && (
          <label className="mt-3 block text-sm font-medium text-slate-700">
            Owner
            <select
              className="select"
              value={form.ownerId}
              onChange={(e) => change("ownerId", e.target.value)}
              required
            >
              {owners.map((owner) => (
                <option key={owner.id} value={owner.id}>
                  {displayName(owner.email)}
                </option>
              ))}
            </select>
          </label>
        )}
        <div className="mt-6 flex flex-wrap gap-3">
          <button className="btn btn-primary" disabled={saving}>
            {saving ? "Saving..." : "Save changes"}
          </button>
          <button className="btn btn-danger" type="button" onClick={remove}>
            Delete
          </button>
        </div>
      </form>
    </div>
  );
}
