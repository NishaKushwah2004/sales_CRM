import { Link, useNavigate, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import api from "../api/client";
import { useAuth } from "../auth/useAuth";

const stages = {
  NEW: "New",
  QUALIFIED: "Qualified",
  PROPOSAL: "Proposal",
  NEGOTIATION: "Negotiation",
  WON: "Won",
  LOST: "Lost",
};
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

export default function DealDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
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
    return (
      <main className="min-h-screen bg-slate-950 p-12 text-slate-100">
        Loading deal...
      </main>
    );
  if (error && !deal)
    return (
      <main className="min-h-screen bg-slate-950 p-12 text-red-200">
        {error}
      </main>
    );
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
    <main className="min-h-screen bg-slate-950 px-6 py-12 text-slate-100">
      <div className="mx-auto max-w-3xl">
        <Link className="text-sky-400" to="/deals">
          Back to deals
        </Link>
        <h1 className="mt-4 text-3xl font-bold">{deal.title}</h1>
        <p className="mt-2 text-sm text-slate-400">
          Stage: {stages[deal.stage]} · Owner: {deal.owner.email} · Company:{" "}
          {deal.company.name}
        </p>
        {error && (
          <p className="mt-4 rounded bg-red-950 p-3 text-red-200">{error}</p>
        )}

        <section
          className="mt-8 rounded border border-slate-800 bg-slate-900 p-6"
          aria-labelledby="lifecycle-heading"
        >
          <h2 id="lifecycle-heading" className="text-xl font-semibold">
            Deal Lifecycle
          </h2>
          <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-6">
            {stageOrder.map((stage) => (
              <div
                className={`rounded border p-2 text-center text-sm ${deal.stage === stage ? "border-sky-400 bg-sky-950 text-sky-200" : "border-slate-700 text-slate-400"}`}
                key={stage}
              >
                {stages[stage]}
              </div>
            ))}
          </div>
          {closed ? (
            <div className="mt-5">
              <p className="text-slate-300">
                This deal is closed. Only a manager can reopen it.
              </p>
              {user.role === "MANAGER" && (
                <button
                  className="mt-4 rounded bg-sky-500 px-4 py-2 font-semibold text-slate-950 disabled:opacity-50"
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
                    className="rounded bg-sky-500 px-4 py-2 font-semibold text-slate-950 disabled:opacity-50"
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
                  <label className="block text-sm text-slate-300">
                    Reason for moving backward
                    <textarea
                      className="mt-1 min-h-20 w-full rounded border border-slate-700 bg-slate-950 p-2"
                      value={reason}
                      onChange={(event) => setReason(event.target.value)}
                      placeholder="Explain why the deal is moving back."
                      required
                    />
                  </label>
                  <button
                    className="mt-3 rounded border border-slate-600 px-4 py-2 text-slate-200 disabled:opacity-50"
                    disabled={lifecycleSaving}
                  >
                    {lifecycleSaving
                      ? "Updating..."
                      : `Move back to ${stages[previousStage]}`}
                  </button>
                </form>
              )}
            </div>
          )}
        </section>

        <section
          className="mt-8 rounded border border-slate-800 bg-slate-900 p-6"
          aria-labelledby="collaborators-heading"
        >
          <h2 id="collaborators-heading" className="text-xl font-semibold">
            Collaborators
          </h2>
          {collaborators.length === 0 ? (
            <p className="mt-4 text-slate-400">No collaborators assigned.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {collaborators.map((collaborator) => (
                <li
                  className="flex items-center justify-between gap-4 rounded border border-slate-700 p-3"
                  key={collaborator.id}
                >
                  <div>
                    <p className="font-medium">{collaborator.email}</p>
                    <p className="text-sm text-slate-400">Sales Rep</p>
                  </div>
                  {canManageCollaborators && (
                    <button
                      className="rounded border border-red-700 px-3 py-1 text-sm text-red-200 disabled:opacity-50"
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
                className="flex-1 rounded border border-slate-700 bg-slate-950 p-2"
                value={selectedCollaborator}
                onChange={(event) =>
                  setSelectedCollaborator(event.target.value)
                }
              >
                <option value="">Select Sales Rep</option>
                {availableCollaborators.map((candidate) => (
                  <option key={candidate.id} value={candidate.id}>
                    {candidate.email}
                  </option>
                ))}
              </select>
              <button
                className="rounded bg-sky-500 px-4 py-2 font-semibold text-slate-950 disabled:opacity-50"
                disabled={!selectedCollaborator || saving}
              >
                {saving ? "Adding..." : "Add Collaborator"}
              </button>
            </form>
          )}
        </section>

        <section
          className="mt-8 rounded border border-slate-800 bg-slate-900 p-6"
          aria-labelledby="tasks-heading"
        >
          <h2 id="tasks-heading" className="text-xl font-semibold">
            Tasks & Follow-ups
          </h2>
          {tasks.length === 0 ? (
            <p className="mt-4 text-slate-400">No tasks created for this deal.</p>
          ) : (
            <ul className="mt-5 space-y-4">
              {tasks.map((task) => {
                const overdue =
                  task.status === "PENDING" &&
                  task.dueDate &&
                  new Date(task.dueDate) < new Date(new Date().toISOString().slice(0, 10));
                const isEditing = editingTaskId === task.id;
                return (
                  <li className="rounded border border-slate-700 p-4" key={task.id}>
                    {isEditing ? (
                      <form className="space-y-3" onSubmit={(event) => updateTask(event, task)}>
                        <input
                          className="w-full rounded border border-slate-700 bg-slate-950 p-2"
                          value={editingTaskForm.title}
                          onChange={(event) => changeTaskForm(setEditingTaskForm, "title", event.target.value)}
                          maxLength={255}
                          required
                        />
                        <textarea
                          className="min-h-20 w-full rounded border border-slate-700 bg-slate-950 p-2"
                          value={editingTaskForm.description}
                          onChange={(event) => changeTaskForm(setEditingTaskForm, "description", event.target.value)}
                          maxLength={5000}
                          placeholder="Description"
                        />
                        <div className="grid gap-3 sm:grid-cols-2">
                          <label className="text-sm text-slate-300">
                            Due date
                            <input
                              type="date"
                              className="mt-1 w-full rounded border border-slate-700 bg-slate-950 p-2"
                              value={editingTaskForm.dueDate}
                              onChange={(event) => changeTaskForm(setEditingTaskForm, "dueDate", event.target.value)}
                            />
                          </label>
                          {canManageTasks && (
                            <label className="text-sm text-slate-300">
                              Assigned to
                              <select
                                className="mt-1 w-full rounded border border-slate-700 bg-slate-950 p-2"
                                value={editingTaskForm.assignedToId}
                                onChange={(event) => changeTaskForm(setEditingTaskForm, "assignedToId", event.target.value)}
                                required
                              >
                                {taskAssignees().map((candidate) => (
                                  <option key={candidate.id} value={candidate.id}>
                                    {candidate.email}
                                  </option>
                                ))}
                              </select>
                            </label>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <button className="rounded bg-sky-500 px-3 py-2 text-sm font-semibold text-slate-950 disabled:opacity-50" disabled={taskSaving}>
                            {taskSaving ? "Saving..." : "Save task"}
                          </button>
                          <button type="button" className="rounded border border-slate-600 px-3 py-2 text-sm" onClick={cancelTaskEdit} disabled={taskSaving}>
                            Cancel
                          </button>
                        </div>
                      </form>
                    ) : (
                      <>
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <p className="font-medium">{task.title}</p>
                            {task.description && (
                              <p className="mt-1 whitespace-pre-wrap text-sm text-slate-300">{task.description}</p>
                            )}
                            <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-400">
                              <span>Assigned: {task.assignedTo?.email || "Unknown"}</span>
                              <span>
                                Due: {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : "No due date"}
                              </span>
                            </div>
                          </div>
                          <span
                            className={`rounded px-2 py-1 text-xs font-semibold ${
                              task.status === "COMPLETED"
                                ? "bg-emerald-950 text-emerald-200"
                                : overdue
                                  ? "bg-red-950 text-red-200"
                                  : "bg-amber-950 text-amber-200"
                            }`}
                          >
                            {task.status === "COMPLETED" ? "Completed" : overdue ? "Overdue" : "Pending"}
                          </span>
                        </div>
                        <div className="mt-4 flex flex-wrap gap-2">
                          {task.status === "PENDING" ? (
                            <button
                              type="button"
                              className="rounded bg-emerald-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
                              onClick={() => setTaskStatus(task, "COMPLETED")}
                              disabled={taskSaving}
                            >
                              Complete
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="rounded border border-slate-600 px-3 py-2 text-sm disabled:opacity-50"
                              onClick={() => setTaskStatus(task, "PENDING")}
                              disabled={taskSaving}
                            >
                              Reopen
                            </button>
                          )}
                          {canEditTasks && (
                            <button type="button" className="rounded border border-slate-600 px-3 py-2 text-sm" onClick={() => beginTaskEdit(task)} disabled={taskSaving}>
                              Edit
                            </button>
                          )}
                          {canManageTasks && (
                            <button type="button" className="rounded border border-red-700 px-3 py-2 text-sm text-red-200" onClick={() => removeTask(task)} disabled={taskSaving}>
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
            <form className="mt-6 space-y-3 border-t border-slate-800 pt-5" onSubmit={addTask}>
              <h3 className="font-medium">Add Task</h3>
              <input
                className="w-full rounded border border-slate-700 bg-slate-950 p-2"
                value={taskForm.title}
                onChange={(event) => changeTaskForm(setTaskForm, "title", event.target.value)}
                maxLength={255}
                placeholder="Task title"
                required
              />
              <textarea
                className="min-h-20 w-full rounded border border-slate-700 bg-slate-950 p-2"
                value={taskForm.description}
                onChange={(event) => changeTaskForm(setTaskForm, "description", event.target.value)}
                maxLength={5000}
                placeholder="Description (optional)"
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-sm text-slate-300">
                  Due date
                  <input
                    type="date"
                    className="mt-1 w-full rounded border border-slate-700 bg-slate-950 p-2"
                    value={taskForm.dueDate}
                    onChange={(event) => changeTaskForm(setTaskForm, "dueDate", event.target.value)}
                  />
                </label>
                <label className="text-sm text-slate-300">
                  Assigned to
                  <select
                    className="mt-1 w-full rounded border border-slate-700 bg-slate-950 p-2"
                    value={taskForm.assignedToId}
                    onChange={(event) => changeTaskForm(setTaskForm, "assignedToId", event.target.value)}
                    required
                  >
                    <option value="">Select Sales Rep</option>
                    {taskAssignees().map((candidate) => (
                      <option key={candidate.id} value={candidate.id}>
                        {candidate.email}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <button className="rounded bg-sky-500 px-4 py-2 font-semibold text-slate-950 disabled:opacity-50" disabled={taskSaving || !taskForm.assignedToId}>
                {taskSaving ? "Adding..." : "Add Task"}
              </button>
            </form>
          )}
        </section>

        <section
          className="mt-8 rounded border border-slate-800 bg-slate-900 p-6"
          aria-labelledby="history-heading"
        >
          <h2 id="history-heading" className="text-xl font-semibold">
            History
          </h2>
          {history.length === 0 ? (
            <p className="mt-4 text-slate-400">No history recorded yet.</p>
          ) : (
            <ol className="mt-5 space-y-4 border-l border-slate-700 pl-5">
              {history.map((event) => (
                <li className="relative" key={event.id}>
                  <span className="absolute left-[-1.6rem] top-1 h-2 w-2 rounded-full bg-sky-400" />
                  <p className="font-medium">
                    {event.type === "DEAL_CREATED"
                      ? "Deal created"
                      : event.type === "STAGE_CHANGED"
                        ? "Stage changed"
                        : event.type === "OWNER_REASSIGNED"
                          ? "Owner reassigned"
                          : event.type === "NOTE_ADDED"
                            ? "Note added"
                            : event.type}
                  </p>
                  {event.type === "STAGE_CHANGED" && (
                    <p className="mt-1 text-sm text-slate-300">
                      {event.oldStage} → {event.newStage}
                      {event.backwardReason && (
                        <span className="block text-slate-400">
                          Reason: {event.backwardReason}
                        </span>
                      )}
                    </p>
                  )}
                  {event.type === "OWNER_REASSIGNED" && (
                    <p className="mt-1 text-sm text-slate-300">
                      {event.previousOwner?.email || "Unknown owner"} →{" "}
                      {event.newOwner?.email || "Unknown owner"}
                    </p>
                  )}
                  {event.type === "NOTE_ADDED" && (
                    <p className="mt-1 whitespace-pre-wrap text-sm text-slate-300">
                      {event.noteBody}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-slate-500">
                    by {event.actor?.email || "Unknown actor"} ·{" "}
                    {new Date(event.occurredAt).toLocaleString()}
                  </p>
                </li>
              ))}
            </ol>
          )}
          <form className="mt-6" onSubmit={addNote}>
            <label className="block text-sm text-slate-300">
              Add note
              <textarea
                className="mt-1 min-h-20 w-full rounded border border-slate-700 bg-slate-950 p-2"
                value={noteBody}
                onChange={(event) => setNoteBody(event.target.value)}
                maxLength={5000}
                placeholder="Add a note to this deal."
              />
            </label>
            <button
              className="mt-3 rounded border border-slate-600 px-4 py-2 text-slate-200 disabled:opacity-50"
              disabled={noteSaving || !noteBody.trim()}
            >
              {noteSaving ? "Adding..." : "Add Note"}
            </button>
          </form>
        </section>

        <form
          className="mt-8 rounded border border-slate-800 bg-slate-900 p-6"
          onSubmit={save}
        >
          <label className="mt-3 block text-sm">
            Title
            <input
              className="mt-1 w-full rounded border border-slate-700 bg-slate-950 p-2"
              value={form.title}
              onChange={(e) => change("title", e.target.value)}
              required
            />
          </label>
          <label className="mt-3 block text-sm">
            Value
            <input
              type="text"
              inputMode="decimal"
              pattern="^\d{1,12}(\.\d{1,2})?$"
              className="mt-1 w-full rounded border border-slate-700 bg-slate-950 p-2"
              value={form.value}
              onChange={(e) => change("value", e.target.value)}
              required
            />
          </label>
          <label className="mt-3 block text-sm">
            Expected close date
            <input
              type="date"
              className="mt-1 w-full rounded border border-slate-700 bg-slate-950 p-2"
              value={form.expectedCloseDate}
              onChange={(e) => change("expectedCloseDate", e.target.value)}
              required
            />
          </label>
          <label className="mt-3 block text-sm">
            Company
            <select
              className="mt-1 w-full rounded border border-slate-700 bg-slate-950 p-2"
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
            <label className="mt-3 block text-sm">
              Owner
              <select
                className="mt-1 w-full rounded border border-slate-700 bg-slate-950 p-2"
                value={form.ownerId}
                onChange={(e) => change("ownerId", e.target.value)}
                required
              >
                {owners.map((owner) => (
                  <option key={owner.id} value={owner.id}>
                    {owner.email}
                  </option>
                ))}
              </select>
            </label>
          )}
          <div className="mt-6 flex gap-3">
            <button
              className="rounded bg-sky-500 px-4 py-2 font-semibold text-slate-950 disabled:opacity-50"
              disabled={saving}
            >
              {saving ? "Saving..." : "Save changes"}
            </button>
            <button
              className="rounded border border-red-700 px-4 py-2 text-red-200"
              type="button"
              onClick={remove}
            >
              Delete
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
