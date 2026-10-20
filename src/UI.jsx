import React from "react";
import { Check, Loader2 } from "lucide-react";
export function Status({ state, error, success }) {
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
export function SectionHeading({ number, title, subtitle }) {
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
