import React, { useEffect, useRef, useState } from "react";
import {
  ArrowUpRight,
  ArrowRight,
  ArrowLeft,
  ChevronDown,
  RotateCcw,
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
import NoteFeature from "./NoteFeature.jsx";
import Music from "./Music.jsx";
import { Status, SectionHeading } from "./UI.jsx";
import { getEmailStatus, sendRequest } from "./api.js";
import {
  coffeeTypes,
  temperatures,
  iceLevels,
  coffeeDescription,
  dailyFortune,
  formatSydney,
  sydneyInstant,
  sydneyParts,
} from "./shared.js";
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
function CoffeeFeature({ reduced, emailReady }) {
  const [strength, setStrength] = useState("Regular");
  const [coffeeType, setCoffeeType] = useState("Cappuccino");
  const [temperature, setTemperature] = useState("Hot");
  const [ice, setIce] = useState("Regular ice");
  const [customizing, setCustomizing] = useState(false);
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
        coffeeType,
        temperature,
        ice: temperature === "Iced" ? ice : undefined,
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
        <DeskObject
          kind="cup"
          {...{ strength, phase, reduced, coffeeType, temperature, ice }}
        />
        <span className="object-tag">
          <span className={`tiny-dot ${pouring ? "brewing" : ""}`} />
          {phase === "espresso"
            ? "ESPRESSO, POURED SLOWLY"
            : phase === "milk"
              ? coffeeType === "Long black"
                ? "WATER, THEN A MOMENT TO PAUSE"
                : "A LITTLE MILK & FOAM"
              : coffeeDescription(coffeeType, temperature).toUpperCase()}
        </span>
        <button
          type="button"
          className="change-coffee"
          aria-expanded={customizing}
          aria-controls="coffee-options"
          disabled={busy || pouring}
          onClick={() => setCustomizing(!customizing)}
        >
          {customizing ? "Keep it simple" : "Fancy something different?"}
          <ChevronDown size={14} />
        </button>
      </div>
      <form className="coffee-form" onSubmit={submit}>
        {customizing && (
          <fieldset
            id="coffee-options"
            className="coffee-options"
            disabled={busy || pouring}
          >
            <legend>A little change of taste</legend>
            <label>
              Coffee
              <select
                aria-label="Coffee"
                value={coffeeType}
                onChange={(e) => {
                  setCoffeeType(e.target.value);
                  setPhase("idle");
                  setPrepared(false);
                  reset();
                }}
              >
                {coffeeTypes.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
            <label>
              Temperature
              <select
                aria-label="Temperature"
                value={temperature}
                onChange={(e) => {
                  setTemperature(e.target.value);
                  setPhase("idle");
                  setPrepared(false);
                  reset();
                }}
              >
                {temperatures.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </label>
            {temperature === "Iced" && (
              <label className="ice-options">
                Ice
                <select
                  aria-label="Ice"
                  value={ice}
                  onChange={(e) => {
                    setIce(e.target.value);
                    reset();
                  }}
                >
                  {iceLevels.map((i) => (
                    <option key={i}>{i}</option>
                  ))}
                </select>
              </label>
            )}
            <button
              type="button"
              className="restore-default"
              onClick={() => {
                setCoffeeType("Cappuccino");
                setTemperature("Hot");
                setIce("Regular ice");
                setStrength("Regular");
                setCustomizing(false);
                setPhase("idle");
                setPrepared(false);
                reset();
              }}
            >
              <RotateCcw size={12} /> Back to my usual hot cappuccino
            </button>
          </fieldset>
        )}
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
              ? coffeeType === "Long black"
                ? "A little water, a perfect finish…"
                : "Milk, foam, and a little magic…"
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
        <p
          className={`fine-print ${emailReady === false ? "connection-notice" : ""}`}
        >
          {emailReady === false
            ? "Email is not connected yet. Requests cannot be sent."
            : "Straight to Maddy, with your preferred time."}
        </p>
      </form>
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
        <div className="header-utilities">
          <Music />
          <div className="today">
            <Sun size={15} />
            <span>{formatSydney(now, { weekday: "short" })}</span>
            <span className="topbar-divider" />
            <span>SYDNEY</span>
          </div>
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
          <CoffeeFeature reduced={reduced} emailReady={emailReady} />
          <NoteFeature reduced={reduced} emailReady={emailReady} />
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
              ? "Sending is not connected yet. Drafts stay on this device and are not emailed."
              : undefined
          }
        >
          <i />
          {emailReady === null
            ? "Checking the little details"
            : emailReady
              ? "Email service configured"
              : "Email setup needed"}
        </span>
      </footer>
    </div>
  );
}
