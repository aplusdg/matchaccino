import React, { useEffect, useId, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowUpLeft,
  ArrowUpRight,
  Check,
  Feather,
  Heart,
  Loader2,
} from "lucide-react";
import { categories, prompts, formatSydney } from "./shared.js";
import { sendRequest } from "./api.js";
import { Status, SectionHeading } from "./UI.jsx";
import { pageFold, polygonCSS, pullProgress } from "./paper.js";
function getSaved() {
  try {
    const d = JSON.parse(localStorage.getItem("matchaccino-note") || "null");
    return d &&
      typeof d.text === "string" &&
      d.text.length <= 3000 &&
      [null, 0, 1, 2].includes(d.prompt) &&
      typeof d.id === "string" &&
      /^[a-f0-9-]{36}$/i.test(d.id)
      ? d
      : null;
  } catch {
    return null;
  }
}
export default function NoteFeature({ reduced, emailReady }) {
  const saved = useRef(getSaved());
  const [prompt, setPrompt] = useState(saved.current?.prompt ?? null);
  const [text, setText] = useState(saved.current?.text || "");
  const [editing, setEditing] = useState(false);
  const [state, setState] = useState("idle");
  const [error, setError] = useState("");
  const [tear, setTear] = useState(0);
  const [fold, setFold] = useState(null);
  const foldRef = useRef(null);
  const [flying, setFlying] = useState(false);
  const [draftSaved, setDraftSaved] = useState(false);
  const [honey, setHoney] = useState("");
  const id = useRef(saved.current?.id || crypto.randomUUID());
  const locked = useRef(false);
  const input = useRef();
  const paper = useRef();
  const drag = useRef(null);
  const progress = useRef(0);
  const timer = useRef();
  const frame = useRef();
  const gradient = useId().replace(/:/g, "");
  const updateFold = (f) => {
    foldRef.current = f;
    setFold(f);
    const value = f ? pullProgress(f.w, f.h, f.dx, f.dy) : 0;
    progress.current = value;
    setTear(value);
  };
  const restore = () => {
    cancelAnimationFrame(frame.current);
    const from = foldRef.current;
    if (reduced || !from) {
      updateFold(null);
      return;
    }
    const start = performance.now();
    const tick = (now) => {
      const t = Math.min(1, (now - start) / 320);
      const remaining = (1 - t) ** 3;
      updateFold({ ...from, dx: from.dx * remaining, dy: from.dy * remaining });
      if (t < 1) frame.current = requestAnimationFrame(tick);
      else updateFold(null);
    };
    frame.current = requestAnimationFrame(tick);
  };
  useEffect(() => {
    try {
      localStorage.setItem(
        "matchaccino-note",
        JSON.stringify({ prompt, text, id: id.current }),
      );
      setDraftSaved(true);
    } catch {
      setDraftSaved(false);
    }
  }, [prompt, text, state]);
  useEffect(
    () => () => {
      clearTimeout(timer.current);
      cancelAnimationFrame(frame.current);
    },
    [],
  );
  const choose = (i) => {
    setPrompt(i);
    setEditing(true);
    setState("idle");
    id.current = crypto.randomUUID();
    setTimeout(() => input.current?.focus(), 80);
  };
  const submit = async () => {
    if (locked.current || state === "success") return;
    if (prompt === null || !text.trim()) {
      setError("Choose an opening and add a little detail before sending.");
      setState("error");
      restore();
      input.current?.focus();
      return;
    }
    locked.current = true;
    setState("sending");
    try {
      await sendRequest({
        kind: "note",
        category: categories[prompt],
        text: text.trim(),
        id: id.current,
        website: honey,
      });
      setFlying(true);
      setState("success");
      timer.current = setTimeout(
        () => {
          setText("");
          setPrompt(null);
          setEditing(false);
          setFlying(false);
          updateFold(null);
          id.current = crypto.randomUUID();
          locked.current = false;
        },
        reduced ? 50 : 1050,
      );
    } catch (e) {
      setError(
        e.name === "TimeoutError"
          ? "That took a little too long. Your note is still here. Please retry."
          : e.message,
      );
      setState("error");
      setFlying(false);
      locked.current = false;
      restore();
    }
  };
  const busy = state === "sending" || flying;
  const shape = fold ? pageFold(fold.w, fold.h, fold.dx, fold.dy) : null;
  return (
    <section
      className={`feature note-feature ${editing ? "editing" : ""}`}
      aria-labelledby="note-title"
    >
      <SectionHeading
        number="02"
        title="Leave it with Maddy"
        subtitle="Big ideas or small things. I’m here."
      />
      <div className="notepad-stage">
        <span className="paper-shadow" />
        <div
          ref={paper}
          className={`notepad ${editing ? "is-editing" : ""} ${fold ? "is-curling" : ""} ${busy ? "is-busy" : ""}`}
          style={{
            "--pull-x": `${-(fold?.dx || 0)}px`,
            "--pull-y": `${-(fold?.dy || 0)}px`,
          }}
        >
          <div className="fresh-sheet" aria-hidden="true">
            <span>A NOTE FOR MADDY</span>
            <i />
            <i />
            <i />
            <i />
            <i />
          </div>
          <div className="binding" aria-hidden="true">
            {Array.from({ length: 13 }, (_, i) => (
              <i key={i} />
            ))}
          </div>
          <div
            className={`paper-front ${flying ? "turn-away" : ""}`}
            style={
              shape
                ? { clipPath: polygonCSS(shape.front, fold.w, fold.h) }
                : undefined
            }
            onClick={() => setEditing(true)}
          >
            <div className="paper-head">
              <span>A NOTE FOR MADDY</span>
              <Feather size={15} />
            </div>
            <div className="paper-date">
              {formatSydney(new Date(), { day: "2-digit", month: "short" })}
            </div>
            <div className="writing-area">
              {prompt === null ? (
                <div className="prompts">
                  {prompts.map((p, i) => (
                    <button type="button" key={p} onClick={() => choose(i)}>
                      {p}
                      <ArrowUpRight size={17} />
                    </button>
                  ))}
                </div>
              ) : (
                <>
                  <button
                    type="button"
                    className="back-prompt"
                    disabled={busy}
                    onClick={(e) => {
                      e.stopPropagation();
                      setPrompt(null);
                    }}
                  >
                    <ArrowLeft size={12} /> Change opening
                  </button>
                  <p className="selected-prompt">{prompts[prompt]}</p>
                  <textarea
                    ref={input}
                    aria-label="Your request to Maddy"
                    placeholder="A little detail goes a long way…"
                    maxLength={3000}
                    value={text}
                    disabled={busy}
                    onFocus={() => setEditing(true)}
                    onChange={(e) => {
                      setText(e.target.value);
                      id.current = crypto.randomUUID();
                      setState("idle");
                    }}
                  />
                  <span className="character-count">{text.length} / 3000</span>
                </>
              )}
            </div>
            <div className="paper-bottom">
              <span>
                {prompt === null
                  ? "Something on your mind?"
                  : "Leave the details with me."}
              </span>
              <Heart size={14} />
            </div>
          </div>
          {shape && shape.back.length > 0 && (
            <svg
              className={`page-fold ${flying ? "turn-away" : ""}`}
              viewBox={`0 0 ${fold.w} ${fold.h}`}
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              <defs>
                <linearGradient
                  id={gradient}
                  x1="100%"
                  y1="100%"
                  x2="0%"
                  y2="0%"
                >
                  <stop offset="0" stopColor="#b6ad94" />
                  <stop offset=".13" stopColor="#ebe6d5" />
                  <stop offset=".42" stopColor="#fffdf3" />
                  <stop offset=".85" stopColor="#f6f0df" />
                  <stop offset="1" stopColor="#d9d0b7" />
                </linearGradient>
                <filter
                  id={`${gradient}-shadow`}
                  x="-30%"
                  y="-30%"
                  width="160%"
                  height="160%"
                >
                  <feDropShadow
                    dx="-4"
                    dy="-5"
                    stdDeviation="6"
                    floodColor="#65563c"
                    floodOpacity=".2"
                  />
                </filter>
              </defs>
              <polygon
                points={shape.back.map((p) => p.join(",")).join(" ")}
                fill={`url(#${gradient})`}
                stroke="#d7cfb9"
                strokeWidth=".6"
                filter={`url(#${gradient}-shadow)`}
              />
            </svg>
          )}
          <button
            type="button"
            className="tear-corner"
            aria-label="Drag paper corner up and left to send, or press Enter to send note"
            disabled={busy}
            onClick={(e) => {
              if (e.detail === 0) submit();
            }}
            onPointerDown={(e) => {
              e.preventDefault();
              cancelAnimationFrame(frame.current);
              updateFold(null);
              drag.current = {
                x: e.clientX,
                y: e.clientY,
                w: paper.current.offsetWidth,
                h: paper.current.offsetHeight,
              };
              e.currentTarget.setPointerCapture(e.pointerId);
            }}
            onPointerMove={(e) => {
              const d = drag.current;
              if (!d) return;
              updateFold({
                w: d.w,
                h: d.h,
                dx: Math.max(0, d.x - e.clientX),
                dy: Math.max(0, d.y - e.clientY),
              });
            }}
            onPointerUp={() => {
              if (!drag.current) return;
              drag.current = null;
              if (progress.current >= 100) submit();
              else restore();
            }}
            onPointerCancel={() => {
              drag.current = null;
              restore();
            }}
            onLostPointerCapture={() => {
              if (drag.current) {
                drag.current = null;
                restore();
              }
            }}
          >
            <ArrowUpLeft size={17} />
          </button>
        </div>
        <div className={`tear-instruction ${tear >= 100 ? "threshold" : ""}`}>
          <span className="gesture-line" />
          <span>
            {tear >= 100 ? (
              "Release to send"
            ) : tear > 0 ? (
              "Keep turning the page…"
            ) : busy ? (
              "Sending with care…"
            ) : (
              <>
                <ArrowUpLeft size={15} /> Lift the corner to send
              </>
            )}
          </span>
          <span className="gesture-line" />
        </div>
        {tear > 0 && (
          <div
            className="tear-progress"
            role="progressbar"
            aria-label="Paper tear distance"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.min(100, Math.round(tear))}
          >
            <i style={{ width: `${Math.min(100, tear)}%` }} />
          </div>
        )}
      </div>
      <div className="note-bottom">
        {prompt !== null && (
          <div className="draft-tools">
            <span>
              {state === "success" ? (
                <>
                  <Check size={12} /> Request sent
                </>
              ) : state === "sending" ? (
                "Sending · draft kept safe"
              ) : draftSaved && text ? (
                <>
                  <Check size={12} /> Draft saved · not sent
                </>
              ) : (
                "Your space to think."
              )}
            </span>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setEditing(!editing);
                if (!editing) input.current?.focus();
              }}
            >
              {editing ? "Back to desk" : "Keep writing"}
            </button>
          </div>
        )}
        <p>
          A thought, a task, a tiny favour.
          <br />
          Put it on paper. I’ll take it from here.
        </p>
        <button
          type="button"
          className="button secondary"
          onClick={submit}
          disabled={busy}
        >
          {busy ? (
            <Loader2 size={16} className="spin" />
          ) : (
            <Feather size={16} />
          )}{" "}
          Send note
          <ArrowUpRight size={16} />
        </button>
        <label className="honey" aria-hidden="true">
          Leave empty
          <input
            tabIndex={-1}
            value={honey}
            onChange={(e) => setHoney(e.target.value)}
          />
        </label>
        <Status
          state={state}
          error={error}
          success="Your note is with Maddy."
        />
        <p
          className={`fine-print ${emailReady === false ? "connection-notice" : ""}`}
        >
          {emailReady === false
            ? "Email is not connected yet. Your draft stays on this device."
            : "Just between your desk and mine."}
        </p>
      </div>
    </section>
  );
}
