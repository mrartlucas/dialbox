import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Power, Hash, KeyRound, CalendarClock, Plus, Trash2, Save, Sparkles, Wand2, Pencil, X } from "lucide-react";
import { api } from "../lib/phoneApi";
import OraclesTab from "./OraclesTab";

const CATEGORY_COLOR = {
  all_ages: "text-[#39ff14] border-[#39ff14]/40",
  adult: "text-[#ffb000] border-[#ffb000]/40",
  kids: "text-cyan-300 border-cyan-300/40",
  seasonal: "text-fuchsia-400 border-fuchsia-400/40",
};

function Toggle({ on, onClick, testid }) {
  return (
    <button
      data-testid={testid}
      onClick={onClick}
      className={`relative h-7 w-12 shrink-0 rounded-sm border-2 transition-colors ${
        on ? "border-[#39ff14] bg-[#39ff14]/20" : "border-neutral-700 bg-neutral-900"
      }`}
    >
      <span
        className={`absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-[2px] transition-all ${
          on ? "left-[26px] bg-[#39ff14]" : "left-1 bg-neutral-600"
        }`}
      />
    </button>
  );
}

const TABS = [
  { id: "programs", label: "Programs & Menu", icon: Hash },
  { id: "oracles", label: "Oracles", icon: Wand2 },
  { id: "secrets", label: "Secret Numbers", icon: KeyRound },
  { id: "schedules", label: "Schedules", icon: CalendarClock },
];

export default function ConfigPanel() {
  const [tab, setTab] = useState("programs");
  const [programs, setPrograms] = useState([]);
  const [secrets, setSecrets] = useState([]);
  const [schedules, setSchedules] = useState([]);

  const loadAll = async () => {
    const [p, s, sc] = await Promise.all([
      api.getPrograms(),
      api.getSecretCodes(),
      api.getSchedules(),
    ]);
    setPrograms(p);
    setSecrets(s);
    setSchedules(sc);
  };

  useEffect(() => {
    loadAll();
  }, []);

  const toggleProgram = async (prog) => {
    const updated = await api.updateProgram(prog.slug, { enabled: !prog.enabled });
    setPrograms((prev) => prev.map((x) => (x.slug === prog.slug ? updated : x)));
  };

  const changeKey = async (prog, menu_key) => {
    setPrograms((prev) => prev.map((x) => (x.slug === prog.slug ? { ...x, menu_key } : x)));
    await api.updateProgram(prog.slug, { menu_key });
  };

  return (
    <div className="flex h-full flex-col rounded-md border-2 border-neutral-800 bg-neutral-950">
      <div className="border-b-2 border-neutral-800 px-5 py-4">
        <h2 className="font-mono text-xl font-bold tracking-tight">CONFIG PANEL</h2>
        <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-neutral-500">
          box control · standalone mode
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b-2 border-neutral-800 bg-black px-2 pt-2">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              data-testid={`tab-${t.id}`}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 rounded-t-sm border-2 border-b-0 px-3 py-2 font-mono text-[11px] uppercase tracking-widest ${
                active
                  ? "border-neutral-700 bg-neutral-950 text-[#39ff14]"
                  : "border-transparent text-neutral-500 hover:text-neutral-300"
              }`}
            >
              <Icon className="h-3.5 w-3.5" /> {t.label}
            </button>
          );
        })}
      </div>

      <div className="hide-scrollbar flex-1 overflow-y-auto p-5">
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
          >
            {tab === "programs" && (
              <ProgramsTab programs={programs} onToggle={toggleProgram} onChangeKey={changeKey} />
            )}
            {tab === "oracles" && <OraclesTab />}
            {tab === "secrets" && (
              <SecretsTab secrets={secrets} reload={loadAll} setSecrets={setSecrets} />
            )}
            {tab === "schedules" && (
              <SchedulesTab
                schedules={schedules}
                programs={programs}
                reload={loadAll}
                setSchedules={setSchedules}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

function ProgramsTab({ programs, onToggle, onChangeKey }) {
  const enabled = programs.filter((p) => p.enabled).sort((a, b) => a.menu_key.localeCompare(b.menu_key));
  return (
    <div className="space-y-6">
      <div className="rounded-sm border-2 border-[#39ff14]/30 bg-[#39ff14]/5 p-4">
        <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.3em] text-[#39ff14]">
          Live IVR Menu Preview
        </p>
        <div className="space-y-1 font-mono text-sm">
          {enabled.length === 0 && <p className="text-neutral-600">// no programs enabled</p>}
          {enabled.map((p) => (
            <p key={p.slug} className="crt-glow">
              {p.menu_key}&nbsp;&nbsp;{p.name}
            </p>
          ))}
          <p className="text-neutral-500">*&nbsp;&nbsp;Voicemail</p>
        </div>
      </div>

      <div className="space-y-3">
        {programs.map((p) => (
          <div
            key={p.slug}
            data-testid={`program-row-${p.slug}`}
            className="flex items-center gap-4 rounded-sm border-2 border-neutral-800 bg-black p-3"
          >
            <input
              data-testid={`program-key-${p.slug}`}
              value={p.menu_key}
              maxLength={1}
              onChange={(e) => onChangeKey(p, e.target.value)}
              className="h-10 w-10 shrink-0 rounded-sm border-2 border-neutral-700 bg-neutral-950 text-center font-mono text-lg amber-glow focus:border-[#ffb000] focus:outline-none"
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="truncate font-mono text-sm font-bold">{p.name}</p>
                <span
                  className={`shrink-0 rounded-[2px] border px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-widest ${
                    CATEGORY_COLOR[p.category] || "text-neutral-400 border-neutral-700"
                  }`}
                >
                  {p.category.replace("_", " ")}
                </span>
                {p.coming_soon && (
                  <span className="shrink-0 font-mono text-[8px] uppercase tracking-widest text-neutral-600">
                    soon
                  </span>
                )}
              </div>
              <p className="truncate text-xs text-neutral-500">{p.description}</p>
            </div>
            <Toggle on={p.enabled} onClick={() => onToggle(p)} testid={`program-toggle-${p.slug}`} />
          </div>
        ))}
      </div>
    </div>
  );
}

const VOICES = ["onyx", "fable", "shimmer", "sage", "echo", "alloy", "nova", "coral", "ash"];
const emptySecret = { code: "", title: "", response_text: "", voice: "onyx", clue: "", branches: null, enabled: true };

const branchesToRows = (b) =>
  b ? Object.entries(b).map(([key, v]) => ({ key, text: v.text || "", voice: v.voice || "onyx" })) : [];
const rowsToBranches = (rows) => {
  const clean = rows.filter((r) => r.key && r.text);
  if (!clean.length) return null;
  const out = {};
  clean.forEach((r) => (out[r.key] = { text: r.text, voice: r.voice }));
  return out;
};

const sInput = "w-full rounded-sm border-2 border-neutral-800 bg-neutral-950 px-3 py-2 font-mono text-sm focus:border-[#ffb000] focus:outline-none";

function BranchesEditor({ rows, setRows, idPrefix }) {
  return (
    <div className="rounded-sm border border-neutral-800 bg-neutral-950/60 p-3">
      <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.25em] text-cyan-300">
        Branch sub-menu (caller dials a digit) — optional
      </p>
      <div className="space-y-2">
        {rows.map((r, i) => (
          <div key={i} className="flex items-start gap-2" data-testid={`${idPrefix}-branch-${i}`}>
            <input
              data-testid={`${idPrefix}-branch-key-${i}`}
              value={r.key}
              maxLength={1}
              onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, key: e.target.value.replace(/[^0-9]/g, "") } : x)))}
              placeholder="#"
              className="h-9 w-9 shrink-0 rounded-sm border-2 border-neutral-800 bg-black text-center font-mono text-sm amber-glow focus:border-[#ffb000] focus:outline-none"
            />
            <input
              data-testid={`${idPrefix}-branch-text-${i}`}
              value={r.text}
              onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)))}
              placeholder="spoken response for this option…"
              className="flex-1 rounded-sm border-2 border-neutral-800 bg-black px-2 py-1.5 font-mono text-xs focus:border-[#ffb000] focus:outline-none"
            />
            <select
              value={r.voice}
              onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, voice: e.target.value } : x)))}
              className="rounded-sm border-2 border-neutral-800 bg-black px-1 py-1.5 font-mono text-xs focus:border-[#ffb000] focus:outline-none"
            >
              {VOICES.map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
            <button onClick={() => setRows(rows.filter((_, j) => j !== i))} className="tactile shrink-0 rounded-sm border-2 border-red-700 bg-red-600/10 p-1.5 text-red-400"><X className="h-3.5 w-3.5" /></button>
          </div>
        ))}
      </div>
      <button
        data-testid={`${idPrefix}-branch-add`}
        onClick={() => setRows([...rows, { key: "", text: "", voice: "nova" }])}
        className="mt-2 flex items-center gap-1 font-mono text-[10px] uppercase tracking-widest text-neutral-500 hover:text-cyan-300"
      >
        <Plus className="h-3 w-3" /> add option
      </button>
    </div>
  );
}

function SecretsTab({ secrets, setSecrets }) {
  const [form, setForm] = useState(emptySecret);
  const [addRows, setAddRows] = useState([]);
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState(emptySecret);
  const [editRows, setEditRows] = useState([]);

  const add = async () => {
    if (!form.code || !form.title || !form.response_text) return;
    setSaving(true);
    try {
      const created = await api.createSecretCode({ ...form, branches: rowsToBranches(addRows), clue: form.clue || null });
      setSecrets((prev) => [...prev, created]);
      setForm(emptySecret);
      setAddRows([]);
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (s) => {
    const updated = await api.updateSecretCode(s.id, { enabled: !s.enabled });
    setSecrets((prev) => prev.map((x) => (x.id === s.id ? updated : x)));
  };
  const remove = async (s) => {
    await api.deleteSecretCode(s.id);
    setSecrets((prev) => prev.filter((x) => x.id !== s.id));
  };
  const startEdit = (s) => { setEditId(s.id); setEditForm({ ...s }); setEditRows(branchesToRows(s.branches)); };
  const saveEdit = async () => {
    const updated = await api.updateSecretCode(editId, {
      title: editForm.title, response_text: editForm.response_text, voice: editForm.voice,
      clue: editForm.clue || null, branches: rowsToBranches(editRows),
    });
    setSecrets((prev) => prev.map((x) => (x.id === editId ? updated : x)));
    setEditId(null);
  };

  return (
    <div className="space-y-6">
      <div className="rounded-sm border-2 border-neutral-800 bg-black p-4">
        <p className="mb-3 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.3em] text-[#ffb000]">
          <Sparkles className="h-3.5 w-3.5" /> New Easter-Egg Number
        </p>
        <div className="grid grid-cols-2 gap-3">
          <input data-testid="secret-code-input" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="dial code e.g. 555" className={sInput + " amber-glow"} />
          <input data-testid="secret-title-input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="title" className={sInput} />
        </div>
        <textarea data-testid="secret-text-input" value={form.response_text} onChange={(e) => setForm({ ...form, response_text: e.target.value })} placeholder="spoken response…" rows={2} className={sInput + " mt-3"} />
        <input data-testid="secret-clue-input" value={form.clue} onChange={(e) => setForm({ ...form, clue: e.target.value })} placeholder="story clue (optional) — hints at another number…" className={sInput + " mt-3"} />
        <div className="mt-3"><BranchesEditor rows={addRows} setRows={setAddRows} idPrefix="add" /></div>
        <div className="mt-3 flex items-center gap-3">
          <select data-testid="secret-voice-select" value={form.voice} onChange={(e) => setForm({ ...form, voice: e.target.value })} className={sInput + " max-w-[8rem]"}>
            {VOICES.map((v) => <option key={v} value={v}>{v}</option>)}
          </select>
          <button data-testid="add-secret-btn" onClick={add} disabled={saving} className="tactile flex items-center gap-2 rounded-sm border-2 border-[#39ff14] bg-[#39ff14]/15 px-4 py-2 font-mono text-xs font-bold uppercase tracking-widest crt-glow disabled:opacity-40">
            <Plus className="h-4 w-4" /> Add
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {secrets.map((s) => (
          <div key={s.id} data-testid={`secret-row-${s.code}`} className="rounded-sm border-2 border-neutral-800 bg-black">
            <div className="flex items-center gap-4 p-3">
              <span className="w-16 shrink-0 font-mono text-lg amber-glow">{s.code}</span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate font-mono text-sm font-bold">{s.title}</p>
                  {s.branches && <span className="shrink-0 rounded-[2px] border border-cyan-400/40 px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-widest text-cyan-300">menu</span>}
                  {s.clue && <span className="shrink-0 rounded-[2px] border border-[#ffb000]/40 px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-widest text-[#ffb000]">clue</span>}
                </div>
                <p className="truncate text-xs text-neutral-500">{s.response_text}</p>
              </div>
              <span className="shrink-0 font-mono text-[10px] uppercase tracking-widest text-neutral-600">{s.voice}</span>
              <Toggle on={s.enabled} onClick={() => toggle(s)} testid={`secret-toggle-${s.code}`} />
              <button data-testid={`secret-edit-${s.code}`} onClick={() => (editId === s.id ? setEditId(null) : startEdit(s))} className="tactile shrink-0 rounded-sm border-2 border-neutral-700 bg-neutral-900 p-2 text-neutral-300 hover:text-[#ffb000]"><Pencil className="h-4 w-4" /></button>
              <button data-testid={`secret-delete-${s.code}`} onClick={() => remove(s)} className="tactile shrink-0 rounded-sm border-2 border-red-700 bg-red-600/10 p-2 text-red-400 hover:bg-red-600/20"><Trash2 className="h-4 w-4" /></button>
            </div>
            {editId === s.id && (
              <div className="space-y-3 border-t-2 border-neutral-800 p-4">
                <input data-testid={`secret-edit-title-${s.code}`} value={editForm.title} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} placeholder="title" className={sInput} />
                <textarea data-testid={`secret-edit-text-${s.code}`} value={editForm.response_text} onChange={(e) => setEditForm({ ...editForm, response_text: e.target.value })} rows={3} className={sInput} />
                <input data-testid={`secret-edit-clue-${s.code}`} value={editForm.clue || ""} onChange={(e) => setEditForm({ ...editForm, clue: e.target.value })} placeholder="story clue (optional)…" className={sInput} />
                <BranchesEditor rows={editRows} setRows={setEditRows} idPrefix={`edit-${s.code}`} />
                <div className="flex items-center gap-3">
                  <select value={editForm.voice} onChange={(e) => setEditForm({ ...editForm, voice: e.target.value })} className={sInput + " max-w-[8rem]"}>
                    {VOICES.map((v) => <option key={v} value={v}>{v}</option>)}
                  </select>
                  <button data-testid={`secret-save-${s.code}`} onClick={saveEdit} className="tactile flex items-center gap-2 rounded-sm border-2 border-[#39ff14] bg-[#39ff14]/15 px-4 py-2 font-mono text-xs font-bold uppercase tracking-widest crt-glow">
                    <Save className="h-4 w-4" /> Save
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function SchedulesTab({ schedules, programs, setSchedules }) {
  const enabledPrograms = programs.length ? programs : [];
  const [form, setForm] = useState({
    program_slug: "fortune",
    label: "Evening fortune call",
    window_start: "18:00",
    window_end: "21:00",
    frequency: "daily",
    enabled: true,
  });

  const add = async () => {
    if (!form.label) return;
    const created = await api.createSchedule(form);
    setSchedules((prev) => [...prev, created]);
  };
  const toggle = async (s) => {
    const updated = await api.updateSchedule(s.id, { enabled: !s.enabled });
    setSchedules((prev) => prev.map((x) => (x.id === s.id ? updated : x)));
  };
  const remove = async (s) => {
    await api.deleteSchedule(s.id);
    setSchedules((prev) => prev.filter((x) => x.id !== s.id));
  };

  const progName = (slug) => programs.find((p) => p.slug === slug)?.name || slug;

  return (
    <div className="space-y-6">
      <div className="rounded-sm border-2 border-neutral-800 bg-black p-4">
        <p className="mb-3 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.3em] text-cyan-300">
          <CalendarClock className="h-3.5 w-3.5" /> Program "Can Call Me" Window
        </p>
        <input
          data-testid="schedule-label-input"
          value={form.label}
          onChange={(e) => setForm({ ...form, label: e.target.value })}
          placeholder="label"
          className="mb-3 w-full rounded-sm border-2 border-neutral-800 bg-neutral-950 px-3 py-2 font-mono text-sm focus:border-cyan-300 focus:outline-none"
        />
        <div className="grid grid-cols-2 gap-3">
          <select
            data-testid="schedule-program-select"
            value={form.program_slug}
            onChange={(e) => setForm({ ...form, program_slug: e.target.value })}
            className="rounded-sm border-2 border-neutral-800 bg-neutral-950 px-3 py-2 font-mono text-sm focus:border-cyan-300 focus:outline-none"
          >
            {enabledPrograms.map((p) => (
              <option key={p.slug} value={p.slug}>
                {p.name}
              </option>
            ))}
          </select>
          <select
            data-testid="schedule-frequency-select"
            value={form.frequency}
            onChange={(e) => setForm({ ...form, frequency: e.target.value })}
            className="rounded-sm border-2 border-neutral-800 bg-neutral-950 px-3 py-2 font-mono text-sm focus:border-cyan-300 focus:outline-none"
          >
            {["daily", "weekly", "seasonal"].map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
          <input
            data-testid="schedule-start-input"
            type="time"
            value={form.window_start}
            onChange={(e) => setForm({ ...form, window_start: e.target.value })}
            className="rounded-sm border-2 border-neutral-800 bg-neutral-950 px-3 py-2 font-mono text-sm focus:border-cyan-300 focus:outline-none"
          />
          <input
            data-testid="schedule-end-input"
            type="time"
            value={form.window_end}
            onChange={(e) => setForm({ ...form, window_end: e.target.value })}
            className="rounded-sm border-2 border-neutral-800 bg-neutral-950 px-3 py-2 font-mono text-sm focus:border-cyan-300 focus:outline-none"
          />
        </div>
        <button
          data-testid="add-schedule-btn"
          onClick={add}
          className="tactile mt-3 flex items-center gap-2 rounded-sm border-2 border-[#39ff14] bg-[#39ff14]/15 px-4 py-2 font-mono text-xs font-bold uppercase tracking-widest crt-glow"
        >
          <Save className="h-4 w-4" /> Save Window
        </button>
      </div>

      <div className="space-y-3">
        {schedules.length === 0 && (
          <p className="font-mono text-xs text-neutral-600">// no scheduled calls yet</p>
        )}
        {schedules.map((s) => (
          <div
            key={s.id}
            data-testid={`schedule-row-${s.id}`}
            className="flex items-center gap-4 rounded-sm border-2 border-neutral-800 bg-black p-3"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate font-mono text-sm font-bold">{s.label}</p>
              <p className="font-mono text-xs text-neutral-500">
                {progName(s.program_slug)} · {s.frequency} · {s.window_start}–{s.window_end}
              </p>
            </div>
            <Toggle on={s.enabled} onClick={() => toggle(s)} testid={`schedule-toggle-${s.id}`} />
            <button
              data-testid={`schedule-delete-${s.id}`}
              onClick={() => remove(s)}
              className="tactile shrink-0 rounded-sm border-2 border-red-700 bg-red-600/10 p-2 text-red-400 hover:bg-red-600/20"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
