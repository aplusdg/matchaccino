import React, { useEffect, useRef, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";

// An original, locally synthesized instrumental: no stream, download, or CDN.
// Audio starts only after a deliberate click, as required by mobile browsers.
const chords = [
  [48, 52, 55, 59],
  [45, 48, 52, 55],
  [41, 45, 48, 52],
  [43, 47, 50, 55],
];
const melody = [76, 79, 74, 72, 71, 74, 76, 79, 76, 72, 69, 72, 74, 71, 67, 71];
export default function Music() {
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState("");
  const audio = useRef(null);
  const starting = useRef(false);
  const timer = useRef(null);
  const step = useRef(0);
  const next = useRef(0);
  const cleanup = () => {
    clearInterval(timer.current);
    timer.current = null;
    audio.current?.context.close();
    audio.current = null;
  };
  useEffect(() => () => cleanup(), []);
  const start = async () => {
    if (starting.current) return;
    starting.current = true;
    try {
      const Context = window.AudioContext || window.webkitAudioContext;
      if (!Context) throw Error("Audio isn’t available in this browser.");
      const context = new Context();
      audio.current = { context };
      await context.resume();
      const master = context.createGain();
      master.gain.value = 0.18;
      const filter = context.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = 1900;
      const compressor = context.createDynamicsCompressor();
      master.connect(filter);
      filter.connect(compressor);
      compressor.connect(context.destination);
      const tone = (midi, at, length, volume) => {
        const osc = context.createOscillator();
        const gain = context.createGain();
        osc.type = "sine";
        osc.frequency.value = 440 * 2 ** ((midi - 69) / 12);
        gain.gain.setValueAtTime(0.0001, at);
        gain.gain.exponentialRampToValueAtTime(volume, at + 0.025);
        gain.gain.exponentialRampToValueAtTime(0.0001, at + length);
        osc.connect(gain);
        gain.connect(master);
        osc.start(at);
        osc.stop(at + length + 0.04);
        osc.onended = () => {
          osc.disconnect();
          gain.disconnect();
        };
      };
      step.current = 0;
      next.current = context.currentTime + 0.06;
      const schedule = () => {
        while (next.current < context.currentTime + 0.45) {
          const i = step.current;
          const chord = chords[Math.floor(i / 8) % chords.length];
          tone(chord[i % 4] + 12, next.current, 1.6, 0.17);
          if (i % 2 === 0)
            tone(
              melody[Math.floor(i / 2) % melody.length],
              next.current,
              1.5,
              0.12,
            );
          if (i % 8 === 0) tone(chord[0] - 12, next.current, 3.8, 0.13);
          next.current += 0.42;
          step.current++;
        }
      };
      schedule();
      timer.current = setInterval(schedule, 120);
      setPlaying(true);
      setError("");
    } catch (e) {
      cleanup();
      setPlaying(false);
      setError(e.message || "Music could not start. Please try again.");
    } finally {
      starting.current = false;
    }
  };
  const toggle = async () => {
    if (playing) {
      cleanup();
      setPlaying(false);
    } else await start();
  };
  useEffect(() => {
    const visibility = () => {
      if (document.hidden && audio.current) {
        cleanup();
        setPlaying(false);
      }
    };
    document.addEventListener("visibilitychange", visibility);
    return () => document.removeEventListener("visibilitychange", visibility);
  }, []);
  return (
    <div className="music-control">
      <button
        type="button"
        className={playing ? "music-toggle is-playing" : "music-toggle"}
        aria-label={
          playing ? "Pause background music" : "Play gentle background music"
        }
        aria-pressed={playing}
        onClick={toggle}
      >
        {playing ? <Volume2 size={16} /> : <VolumeX size={16} />}
        <span>{playing ? "Music on" : "A little music"}</span>
        {playing && (
          <i className="music-bars" aria-hidden="true">
            <b />
            <b />
            <b />
          </i>
        )}
      </button>
      {error && (
        <span className="music-error" role="status">
          {error}
        </span>
      )}
    </div>
  );
}
