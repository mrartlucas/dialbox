import React, { useEffect, useState } from "react";
import { Plus, Trash2, Save, Copy, Pencil, Wand2, X } from "lucide-react";
import { api } from "../lib/phoneApi";

const VOICES = ["alloy", "ash", "coral", "echo", "fable", "nova", "onyx", "sage", "shimmer"];
const TYPES = ["resident", "traveling"];
const SEASONS = ["all_year", "spring", "summer", "fall", "winter", "halloween", "holiday", "valentines"];

const SEASON_COLOR = {
  all_year: "text-[#39ff14] border-[#39ff14]/40",
  halloween: "text-orange-400 border-orange-400/40",
  holiday: "text-red-400 border-red-400/40",
  valentines: "text-pink-400 border-pink-400/40",
};

const slugify = (s) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 24) ||
  `oracle-${Date.now()}`;

const blank = {
  name: "",
  blurb: "",
  voice: "onyx",
  system_prompt: "",
  sign_off: "",
  type: "resident",
  season: "all_year",
  order: 10,
  enabled: true,
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

const inputCls =
  "w-full rounded-sm border-2 border-neutral-800 bg-neutral-950 px-3 py-2 font-mono text-sm focus:border-[#39ff14] focus:outline-none";

function OracleFields({ form, set }) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <input data-testid="oracle-name-input" value={form.name} onChange={(e) => set({ name: e.target.value })} placeholder="oracle name" className={inputCls} />
        <input data-testid="oracle-blurb-input" value={form.blurb} onChange={(e) => set({ blurb: e.target.value })} placeholder="short blurb" className={inputCls} />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <label className="font-mono text-[10px] uppercase tracking-widest text-neutral-500">
          Voice
          <select data-testid="oracle-voice-select" value={form.voice} onChange={(e) => set({ voice: e.target.value })} className={inputCls + " mt-1"}>
            {VOICES.map((v) => <option key={v} value={v}>{v}</option>)}
          </select>
        </label>
        <label className="font-mono text-[10px] uppercase tracking-widest text-neutral-500">
          Type
          <select data-testid="oracle-type-select" value={form.type} onChange={(e) => set({ type: e.target.value })} className={inputCls + " mt-1"}>
            {TYPES.map((v) => <option key={v} value={v}>{v}</option>)}
          </select>
        </label>
        <label className="font-mono text-[10px] uppercase tracking-widest text-neutral-500">
          Season
          <select data-testid="oracle-season-select" value={form.season} onChange={(e) => set({ season: e.target.value })} className={inputCls + " mt-1"}>
            {SEASONS.map((v) => <option key={v} value={v}>{v.replace("_", " ")}</option>)}
          </select>
        </label>
      </div>
      <textarea data-testid="oracle-prompt-input" value={form.system_prompt} onChange={(e) => set({ system_prompt: e.target.value })} rows={4} placeholder="personality / performance direction (system prompt)…" className={inputCls} />
      <textarea data-testid="oracle-signoff-input" value={form.sign_off} onChange={(e) => set({ sign_off: e.target.value })} rows={2} placeholder="in-character sign-off ('call again…')" className={inputCls} />
      <label className="block w-24 font-mono text-[10px] uppercase tracking-widest text-neutral-500">
        Keypad order
        <input type="number" data-testid="oracle-order-input" value={form.order} onChange={(e) => set({ order: parseInt(e.target.value || "0", 10) })} className={inputCls + " mt-1"} />
      </label>
    </div>
  );
}

export default function OraclesTab() {
  const [oracles, setOracles] = useState([]);
  const [adding, setAdding] = useState(false);
  const [addForm, setAddForm] = useState(blank);
  const [editSlug, setEditSlug] = useState(null);
  const [editForm, setEditForm] = useState(blank);
  const [error, setError] = useState("");

  const load = async () => setOracles(await api.getOracles());
  useEffect(() => { load(); }, []);

  const create = async () => {
    setError("");
    if (!addForm.name || !addForm.system_prompt) {
      setError("Name and personality prompt are required.");
      return;
    }
    try {
      const created = await api.createOracle({ ...addForm, slug: slugify(addForm.name) });
      setOracles((p) => [...p, created].sort((a, b) => a.order - b.order));
      setAddForm(blank);
      setAdding(false);
    } catch (e) {
      setError(e?.response?.data?.detail || "Could not create oracle.");
    }
  };

  const startEdit = (o) => { setEditSlug(o.slug); setEditForm({ ...o }); };
  const saveEdit = async () => {
    const { name, blurb, voice, system_prompt, sign_off, type, season, order } = editForm;
    const updated = await api.updateOracle(editSlug, { name, blurb, voice, system_prompt, sign_off, type, season, order });
    setOracles((p) => p.map((x) => (x.slug === editSlug ? updated : x)).sort((a, b) => a.order - b.order));
    setEditSlug(null);
  };
  const clone = (o) => {
    setAdding(true);
    setAddForm({ ...blank, ...o, name: `${o.name} (copy)`, order: (o.order || 10) + 1 });
    window.scrollTo({ top: 0 });
  };
  const toggle = async (o) => {
    const updated = await api.updateOracle(o.slug, { enabled: !o.enabled });
    setOracles((p) => p.map((x) => (x.slug === o.slug ? updated : x)));
  };
  const remove = async (o) => {
    await api.deleteOracle(o.slug);
    setOracles((p) => p.filter((x) => x.slug !== o.slug));
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-neutral-500">
          {oracles.length} oracles · residents always on-air, travelers rotate by season
        </p>
        <button
          data-testid="oracle-add-toggle"
          onClick={() => { setAdding((a) => !a); setAddForm(blank); setError(""); }}
          className="tactile flex items-center gap-2 rounded-sm border-2 border-[#39ff14] bg-[#39ff14]/15 px-3 py-2 font-mono text-xs font-bold uppercase tracking-widest crt-glow"
        >
          {adding ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />} {adding ? "Close" : "New Oracle"}
        </button>
      </div>

      {adding && (
        <div className="rounded-sm border-2 border-[#39ff14]/30 bg-[#39ff14]/5 p-4">
          <p className="mb-3 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.3em] text-[#39ff14]">
            <Wand2 className="h-3.5 w-3.5" /> Author a new oracle
          </p>
          <OracleFields form={addForm} set={(patch) => setAddForm((f) => ({ ...f, ...patch }))} />
          {error && <p className="mt-2 font-mono text-xs text-red-400" data-testid="oracle-error">{error}</p>}
          <button data-testid="oracle-create-btn" onClick={create} className="tactile mt-3 flex items-center gap-2 rounded-sm border-2 border-[#39ff14] bg-[#39ff14]/15 px-4 py-2 font-mono text-xs font-bold uppercase tracking-widest crt-glow">
            <Save className="h-4 w-4" /> Create Oracle
          </button>
        </div>
      )}

      <div className="space-y-3">
        {oracles.map((o) => (
          <div key={o.slug} data-testid={`oracle-row-${o.slug}`} className="rounded-sm border-2 border-neutral-800 bg-black">
            <div className="flex items-center gap-3 p-3">
              <span className="w-8 shrink-0 text-center font-mono text-lg amber-glow">{o.order}</span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate font-mono text-sm font-bold">{o.name}</p>
                  <span className="rounded-[2px] border border-neutral-700 px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-widest text-neutral-400">{o.voice}</span>
                  <span className="rounded-[2px] border border-cyan-400/40 px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-widest text-cyan-300">{o.type}</span>
                  <span className={`rounded-[2px] border px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-widest ${SEASON_COLOR[o.season] || "text-neutral-400 border-neutral-700"}`}>{(o.season || "").replace("_", " ")}</span>
                </div>
                <p className="truncate text-xs text-neutral-500">{o.blurb}</p>
              </div>
              <Toggle on={o.enabled} onClick={() => toggle(o)} testid={`oracle-toggle-${o.slug}`} />
              <button data-testid={`oracle-edit-${o.slug}`} onClick={() => (editSlug === o.slug ? setEditSlug(null) : startEdit(o))} className="tactile shrink-0 rounded-sm border-2 border-neutral-700 bg-neutral-900 p-2 text-neutral-300 hover:text-[#39ff14]"><Pencil className="h-4 w-4" /></button>
              <button data-testid={`oracle-clone-${o.slug}`} onClick={() => clone(o)} className="tactile shrink-0 rounded-sm border-2 border-neutral-700 bg-neutral-900 p-2 text-neutral-300 hover:text-[#ffb000]"><Copy className="h-4 w-4" /></button>
              <button data-testid={`oracle-delete-${o.slug}`} onClick={() => remove(o)} className="tactile shrink-0 rounded-sm border-2 border-red-700 bg-red-600/10 p-2 text-red-400 hover:bg-red-600/20"><Trash2 className="h-4 w-4" /></button>
            </div>
            {editSlug === o.slug && (
              <div className="border-t-2 border-neutral-800 p-4">
                <OracleFields form={editForm} set={(patch) => setEditForm((f) => ({ ...f, ...patch }))} />
                <button data-testid={`oracle-save-${o.slug}`} onClick={saveEdit} className="tactile mt-3 flex items-center gap-2 rounded-sm border-2 border-[#39ff14] bg-[#39ff14]/15 px-4 py-2 font-mono text-xs font-bold uppercase tracking-widest crt-glow">
                  <Save className="h-4 w-4" /> Save Changes
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
