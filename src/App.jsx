import React, { useEffect, useRef, useState } from "react";
import {
  ArrowUpRight,
  ArrowRight,
  ArrowLeft,
  Bean,
  Check,
  Clock3,
  Coffee,
  Feather,
  Heart,
  Loader2,
  Send,
  Sparkles,
  Sprout,
  Sun,
  X,
} from "lucide-react";
import DeskObject from "./Objects.jsx";
import { getEmailStatus, sendRequest } from "./api.js";
import {
  categories,
  dailyFortune,
  formatSydney,
  prompts,
  sydneyInstant,
  sydneyParts,
} from "./shared.js";
const getSaved = () => {
  try {
    const draft = JSON.parse(
      localStorage.getItem("matchaccino-note") || "null",
    );
    if (
      !draft ||
      typeof draft.text !== "string" ||
      draft.text.length > 3000 ||
      ![null, 0, 1, 2].includes(draft.prompt)
    )
      return null;
    if (typeof draft.id !== "string" || !/^[a-f0-9-]{36}$/i.test(draft.id))
      return null;
    return draft;
  } catch {
    return null;
  }
};
const newId = () => crypto.randomUUID();
function useReducedMotion() {
  const [value, set] = useState(
    () => matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  useEffect(() => {
    const m = matchMedia("(prefers-reduced-motion: reduce)");
    const fn = () => set(m.matches);
    m.addEventListener("change", fn);
    return () => m.removeEventListener("change", fn);
  }, []);
  return value;
}
function Status({ state, error, success }) {
  return (
    <div className={`feedback ${state}`} role="status" aria-live="polite">
      {state === "success" ? (
        <>
          <Check size={14} />
          {success}
        </>
      ) : state === "error" ? (
        error
      ) : state === "sending" ? (
        <>
          <Loader2 size={13} className="spin" />
          Sending with care…
        </>
      ) : null}
    </div>
  );
}
function SectionHeading({ number, title, subtitle }) {
  return (
    <div className="section-heading">
      <span className="section-number">
        {number}
        <span />
      </span>
      <h2
        id={
          number === "01"
            ? "coffee-title"
            : number === "02"
              ? "note-title"
              : "fortune-title"
        }
      >
        {title}
      </h2>
      <p>{subtitle}</p>
    </div>
  );
}
function CoffeeFeature({ reduced }) {
  const [strength, setStrength] = useState("Regular");
  const [phase, setPhase] = useState("idle");
  const [prepared, setPrepared] = useState(false);
  const [when, setWhen] = useState("now");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("09:00");
  const [state, setState] = useState("idle");
  const [error, setError] = useState("");
  const [honey, setHoney] = useState("");
  const id = useRef(newId());
  const locked = useRef(false);
  const timers = useRef([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  const reset = () => {
    id.current = newId();
    if (state !== "sending") setState("idle");
  };
  const prepare = () => {
    if (phase === "espresso" || phase === "milk") return;
    setPrepared(false);
    setPhase("espresso");
    timers.current.push(
      setTimeout(() => setPhase("milk"), reduced ? 150 : 1500),
      setTimeout(
        () => {
          setPhase("ready");
          setPrepared(true);
        },
        reduced ? 300 : 3200,
      ),
    );
  };
  const submit = async (e) => {
    e.preventDefault();
    if (locked.current) return;
    if (when === "scheduled") {
      const instant = sydneyInstant(date, time);
      if (!instant || instant <= new Date()) {
        setError("Choose a valid future date and time in Sydney.");
        setState("error");
        return;
      }
    }
    locked.current = true;
    setState("sending");
    try {
      await sendRequest({
        kind: "coffee",
        strength,
        when,
        date: when === "scheduled" ? date : undefined,
        time: when === "scheduled" ? time : undefined,
        id: id.current,
        website: honey,
      });
      setState("success");
    } catch (e) {
      setError(
        e.name === "TimeoutError"
          ? "That took a little too long. Please retry; we’ll prevent a duplicate."
          : e.message,
      );
      setState("error");
    } finally {
      locked.current = false;
    }
  };
  const busy = state === "sending";
  const pouring = phase === "espresso" || phase === "milk";
  return (
    <section className="feature coffee-feature" aria-labelledby="coffee-title">
      <SectionHeading
        number="01"
        title="Coffee, your way"
        subtitle="A familiar favourite. A little extra care."
      />
      <div className="coffee-stage">
        <DeskObject kind="cup" {...{ strength, phase, reduced }} />
        <span className="object-tag">
          <span className={`tiny-dot ${pouring ? "brewing" : ""}`} />
          {phase === "espresso"
            ? "ESPRESSO, POURED SLOWLY"
            : phase === "milk"
              ? "A LITTLE MILK & FOAM"
              : "HOT CAPPUCCINO"}
        </span>
        <span className="rotation-hint">a little drag, a different angle</span>
      </div>
      <form className="coffee-form" onSubmit={submit}>
        <fieldset disabled={busy || pouring}>
          <legend>How do you like it?</legend>
          <div className="segmented strength">
            {["Regular", "Strong"].map((s) => (
              <button
                type="button"
                aria-label={s}
                aria-pressed={strength === s}
                className={strength === s ? "selected" : ""}
                key={s}
                onClick={() => {
                  setStrength(s);
                  reset();
                  setPrepared(false);
                  setPhase("idle");
                }}
              >
                <span className="beans" aria-hidden="true">
                  <Bean size={13} strokeWidth={1.5} />
                  {s === "Strong" && <Bean size={13} strokeWidth={1.5} />}
                </span>
                {s}
              </button>
            ))}
          </div>
        </fieldset>
        <button
          className={`prepare ${prepared ? "is-prepared" : ""}`}
          type="button"
          disabled={pouring || busy}
          onClick={prepare}
        >
          {pouring ? (
            <Loader2 size={14} className="spin" />
          ) : prepared ? (
            <Check size={14} />
          ) : (
            <Coffee size={14} />
          )}{" "}
          {phase === "espresso"
            ? "A little espresso…"
            : phase === "milk"
              ? "Milk, foam, and a little magic…"
              : prepared
                ? "Made just the way you like it"
                : "Make a little coffee"}
          {!pouring && !prepared && <ArrowUpRight size={13} />}
        </button>
        <div className="time-heading">
          <Clock3 size={13} />
          <span>When would you like it?</span>
        </div>
        <div className="time-choices">
          {[
            ["now", "Now"],
            ["scheduled", "Choose a time"],
          ].map(([v, label]) => (
            <button
              type="button"
              key={v}
              aria-pressed={when === v}
              disabled={busy}
              className={when === v ? "active" : ""}
              onClick={() => {
                setWhen(v);
                if (!date) setDate(sydneyParts().date);
                reset();
              }}
            >
              <span className="radio-dot" />
              {label}
            </button>
          ))}
        </div>
        {when === "scheduled" && (
          <div className="schedule">
            <div className="date-time">
              <label>
                Date
                <input
                  type="date"
                  min={sydneyParts().date}
                  value={date}
                  onChange={(e) => {
                    setDate(e.target.value);
                    reset();
                  }}
                  disabled={busy}
                  required
                />
              </label>
              <label>
                Time
                <input
                  type="time"
                  value={time}
                  onChange={(e) => {
                    setTime(e.target.value);
                    reset();
                  }}
                  disabled={busy}
                  required
                />
              </label>
            </div>
            <p>
              {sydneyInstant(date, time)
                ? formatSydney(sydneyInstant(date, time), {
                    weekday: "short",
                    hour: "numeric",
                    minute: "2-digit",
                  })
                : "Select a date and time"}{" "}
              · Australia/Sydney
            </p>
          </div>
        )}
        <label className="honey" aria-hidden="true">
          Leave empty
          <input
            tabIndex={-1}
            autoComplete="off"
            value={honey}
            onChange={(e) => setHoney(e.target.value)}
          />
        </label>
        <button
          className="button primary"
          type="submit"
          disabled={busy || state === "success"}
        >
          {busy ? (
            <Loader2 size={16} className="spin" />
          ) : state === "success" ? (
            <Check size={16} />
          ) : (
            <Send size={15} />
          )}{" "}
          {state === "success" ? "Request sent" : "Send my coffee request"}
          {state !== "success" && <ArrowRight size={15} />}
        </button>
        <Status
          state={state}
          error={error}
          success="Your coffee request is with Maddy."
        />
        {state === "success" && (
          <button className="text-button" type="button" onClick={reset}>
            Make another request
          </button>
        )}
        <p className="fine-print">
          Straight to Maddy, with your preferred time.
        </p>
      </form>
    </section>
  );
}
function NoteFeature({ reduced }) {
  const saved = useRef(getSaved());
  const [prompt, setPrompt] = useState(saved.current?.prompt ?? null);
  const [text, setText] = useState(saved.current?.text || "");
  const [editing, setEditing] = useState(false);
  const [state, setState] = useState("idle");
  const [error, setError] = useState("");
  const [tear, setTear] = useState(0);
  const [flying, setFlying] = useState(false);
  const [draftSaved, setDraftSaved] = useState(false);
  const [honey, setHoney] = useState("");
  const id = useRef(saved.current?.id || newId());
  const locked = useRef(false);
  const input = useRef();
  const drag = useRef(null);
  const timer = useRef();
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
  useEffect(() => () => clearTimeout(timer.current), []);
  const choose = (i) => {
    setPrompt(i);
    setEditing(true);
    setState("idle");
    id.current = newId();
    setTimeout(() => input.current?.focus(), 80);
  };
  const submit = async () => {
    if (locked.current || state === "success") return;
    if (prompt === null || !text.trim()) {
      setError("Choose an opening and add a little detail before sending.");
      setState("error");
      setTear(0);
      input.current?.focus();
      return;
    }
    locked.current = true;
    setState("sending");
    setTear(0);
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
          id.current = newId();
          locked.current = false;
        },
        reduced ? 50 : 1050,
      );
    } catch (e) {
      setError(
        e.name === "TimeoutError"
          ? "That took a little too long. Your note is saved. Please retry."
          : e.message,
      );
      setState("error");
      setFlying(false);
      locked.current = false;
    }
  };
  const busy = state === "sending" || flying;
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
          className={`notepad ${editing ? "is-editing" : ""} ${flying ? "fly-away" : ""}`}
          style={{
            "--tear": `${tear}px`,
            "--tear-angle": `${-1 + tear * 0.012}deg`,
          }}
          onClick={() => setEditing(true)}
        >
          <div className="binding">
            {Array.from({ length: 13 }, (_, i) => (
              <i key={i} />
            ))}
          </div>
          <div className="paper-head">
            <span>A NOTE FOR MADDY</span>
            <Feather size={14} />
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
                    <ArrowUpRight size={16} />
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
                  <ArrowLeft size={11} /> Change opening
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
                    id.current = newId();
                    if (state !== "sending") setState("idle");
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
            <Heart size={13} />
          </div>
          <button
            type="button"
            className="tear-corner"
            aria-label="Drag paper corner to send, or press Enter to send note"
            disabled={busy}
            onClick={(e) => {
              if (e.detail === 0) submit();
            }}
            onPointerDown={(e) => {
              e.preventDefault();
              drag.current = { x: e.clientX, y: e.clientY };
              e.currentTarget.setPointerCapture(e.pointerId);
            }}
            onPointerMove={(e) => {
              if (drag.current)
                setTear(
                  Math.min(
                    150,
                    Math.max(
                      0,
                      e.clientX -
                        drag.current.x +
                        (e.clientY - drag.current.y) * 0.5,
                    ),
                  ),
                );
            }}
            onPointerUp={() => {
              if (drag.current) {
                drag.current = null;
                if (tear >= 100) submit();
                else setTear(0);
              }
            }}
            onPointerCancel={() => {
              drag.current = null;
              setTear(0);
            }}
          >
            <span />
            <ArrowUpRight size={14} />
          </button>
        </div>
        <div className={`tear-instruction ${tear >= 100 ? "threshold" : ""}`}>
          <span className="gesture-line" />
          <span>
            {tear >= 100
              ? "Release to send"
              : tear > 0
                ? "A little further…"
                : busy
                  ? "Sending with care…"
                  : "Tear to send"}
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
              {draftSaved && text ? (
                <>
                  <Check size={11} /> Saved on this device
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
            <Loader2 size={15} className="spin" />
          ) : (
            <Feather size={15} />
          )}{" "}
          Send note
          <ArrowUpRight size={15} />
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
        <p className="fine-print">Just between your desk and mine.</p>
      </div>
    </section>
  );
}
function FortuneFeature({ now, reduced }) {
  const [drawing, setDrawing] = useState(false);
  const [drawn, setDrawn] = useState(false);
  const [open, setOpen] = useState(false);
  const timer = useRef();
  const pointer = useRef(null);
  const slip = useRef(null);
  const drawButton = useRef(null);
  const locked = useRef(false);
  const fortune = dailyFortune(now);
  useEffect(() => {
    if (open) slip.current?.focus({ preventScroll: true });
  }, [open]);
  useEffect(() => () => clearTimeout(timer.current), []);
  useEffect(() => {
    setDrawn(false);
    setOpen(false);
    setDrawing(false);
    locked.current = false;
    clearTimeout(timer.current);
  }, [fortune.day]);
  const draw = () => {
    if (locked.current) return;
    if (drawn) {
      setOpen(true);
      return;
    }
    locked.current = true;
    setDrawing(true);
    timer.current = setTimeout(
      () => {
        setDrawing(false);
        setDrawn(true);
        timer.current = setTimeout(
          () => {
            setOpen(true);
            locked.current = false;
          },
          reduced ? 0 : 550,
        );
      },
      reduced ? 100 : 1500,
    );
  };
  return (
    <section
      className="feature fortune-feature"
      aria-labelledby="fortune-title"
    >
      <SectionHeading
        number="03"
        title="A little luck for today"
        subtitle="A small ritual. A fresh perspective."
      />
      <div className="fortune-stage">
        <button
          className={`fortune-object ${drawing ? "drawing" : ""}`}
          type="button"
          onClick={draw}
          aria-label="Draw today's fortune"
          disabled={drawing}
          onPointerDown={(e) => {
            pointer.current = {
              x: e.clientX,
              time: Date.now(),
              moves: 0,
              last: e.clientX,
            };
          }}
          onPointerMove={(e) => {
            const p = pointer.current;
            if (!p) return;
            if (Math.abs(e.clientX - p.last) > 25) {
              p.moves++;
              p.last = e.clientX;
            }
            if (p.moves >= 3 && Date.now() - p.time < 1800) {
              pointer.current = null;
              draw();
            }
          }}
          onPointerUp={() => {
            pointer.current = null;
          }}
          onPointerCancel={() => {
            pointer.current = null;
          }}
        >
          <DeskObject kind="holder" {...{ drawing, drawn, reduced }} />
        </button>
        <span className="object-tag">A MOMENT FOR POSSIBILITY</span>
      </div>
      {open ? (
        <div
          className="fortune-slip"
          key={fortune.day}
          ref={slip}
          tabIndex={-1}
          role="region"
          aria-label="Today's daily inspiration"
        >
          <div className="slip-top">
            <span>DAILY INSPIRATION</span>
            <button
              type="button"
              aria-label="Fold fortune slip"
              onClick={() => {
                setOpen(false);
                requestAnimationFrame(() =>
                  drawButton.current?.focus({ preventScroll: true }),
                );
              }}
            >
              <X size={13} />
            </button>
          </div>
          <p className="fortune-date">
            {formatSydney(now, { weekday: "long", year: "numeric" })} · Sydney
          </p>
          <div className="lucky-row">
            <div>
              <span className="detail-label">Lucky colour</span>
              <span>
                <i className="swatch" style={{ background: fortune.swatch }} />
                {fortune.colour}
              </span>
            </div>
            <div>
              <span className="detail-label">Lucky number</span>
              <strong>{fortune.number.toString().padStart(2, "0")}</strong>
            </div>
          </div>
          <p className="fortune-message">“{fortune.message}”</p>
          <div className="fortune-guidance">
            <p>
              <span>GOOD FOR TODAY</span>
              {fortune.good}
            </p>
            <p>
              <span>LESS IDEAL TODAY</span>
              {fortune.less}
            </p>
          </div>
          <span className="fortune-personal">
            A birthday-inspired thought for Kaichi. Not almanac guidance.
          </span>
        </div>
      ) : (
        <div className="fortune-bottom">
          <div className="little-star">✧</div>
          <p>
            A little nudge from the universe.
            <br />
            Who knows what today might hold?
          </p>
          <button
            type="button"
            className="button secondary"
            disabled={drawing}
            ref={drawButton}
            onClick={draw}
          >
            {drawing ? (
              <Loader2 size={15} className="spin" />
            ) : (
              <Sparkles size={15} />
            )}{" "}
            {drawing
              ? "Finding your little luck…"
              : drawn
                ? "Read today’s fortune"
                : "Draw today’s fortune"}
            <ArrowUpRight size={15} />
          </button>
          <span className="daily-label">
            DAILY INSPIRATION <span>·</span> REFRESHES EACH SYDNEY DAY
          </span>
        </div>
      )}
      <p className="fine-print fortune-caption">
        A little inspiration, just for fun.
      </p>
    </section>
  );
}
export default function App() {
  const [now, setNow] = useState(new Date());
  const [emailReady, setEmailReady] = useState(null);
  const reduced = useReducedMotion();
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30000);
    getEmailStatus()
      .then(setEmailReady)
      .catch(() => setEmailReady(false));
    return () => clearInterval(timer);
  }, []);
  const hour = Number(
    new Intl.DateTimeFormat("en-AU", {
      timeZone: "Australia/Sydney",
      hour: "2-digit",
      hourCycle: "h23",
    }).format(now),
  );
  return (
    <div className="site-shell">
      <header className="topbar">
        <a
          href="#main"
          className="mini-brand"
          aria-label="Matchaccino, skip to your desk"
        >
          <Sprout size={22} strokeWidth={1.3} />
          <span>A LITTLE HELP. A LITTLE MAGIC.</span>
        </a>
        <div className="today">
          <Sun size={15} />
          <span>{formatSydney(now, { weekday: "short" })}</span>
          <span className="topbar-divider" />
          <span>SYDNEY</span>
        </div>
      </header>
      <main id="main">
        <div className="intro">
          <div className="greeting">
            <span />{" "}
            {hour < 12
              ? "GOOD MORNING"
              : hour < 17
                ? "GOOD AFTERNOON"
                : "GOOD EVENING"}
            , KAICHI <span />
          </div>
          <h1>
            Matchaccino<span className="brand-star">✧</span>
          </h1>
          <p>A little initiative. A little intuition. Made for your day.</p>
          <div className="intro-flourish">
            <i />
            <Sprout size={19} strokeWidth={1.1} />
            <i />
          </div>
        </div>
        <div className="desk">
          <CoffeeFeature reduced={reduced} />
          <NoteFeature reduced={reduced} />
          <FortuneFeature now={now} reduced={reduced} />
        </div>
        <div className="desk-note">
          <span />A coffee, a note, and a little good fortune.{" "}
          <em>Consider your day a little lighter.</em>
          <span />
        </div>
      </main>
      <footer>
        <span>Made with a little matcha & a lot of care.</span>
        <span className="signature">
          From Maddy, for Kaichi <Heart size={12} />
        </span>
        <span
          className={`service-status ${emailReady === false ? "unconfigured" : ""}`}
          title={
            emailReady === false
              ? "Set RESEND_API_KEY and EMAIL_FROM on the server to enable coffee and note requests."
              : undefined
          }
        >
          <i />
          {emailReady === null
            ? "Checking the little details"
            : emailReady
              ? "Your desk is connected"
              : "Email setup needed"}
        </span>
      </footer>
    </div>
  );
}
