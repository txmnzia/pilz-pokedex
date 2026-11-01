import type { ReactNode } from "react";

export interface Hardware {
  up(): void; down(): void; left(): void; right(): void; ok(): void;
  a(): void; b(): void; page(): void; menu(): void;
}

interface Props {
  hw: Hardware;
  labels: { a: string; b: string; page: string; counter: string; counterSub: string };
  pageEnabled: boolean;
  ledFlash: number;
  status: string;
  children: ReactNode;
}

declare const __APP_VERSION__: string;

export function Device({ hw, labels, pageEnabled, ledFlash, status, children }: Props) {
  return (
    <div id="device">
      <header className="top">
        <div className="lens" aria-hidden="true" />
        <div className="leds" aria-hidden="true">
          <i className="led r" /><i className="led y" />
          <i key={ledFlash} className={`led g ${ledFlash ? "flash" : ""}`} />
        </div>
        <div className="spacer" />
        <div className="tag">v{__APP_VERSION__}<br />{status}</div>
        <button className="iconbtn" onClick={hw.menu} aria-label="Settings">&#8801;</button>
      </header>

      <section className="bezel">
        <div className="bezel-dots" aria-hidden="true"><i /><i /></div>
        <div className="lcd">{children}</div>
        <div className="bezel-foot" aria-hidden="true"><span className="dot" /><span className="grill" /></div>
      </section>

      <footer className="controls">
        <div className="cl">
          <div className="btnrow">
            <button className="hw" onClick={hw.a}>
              <span className="round"><svg viewBox="0 0 24 24" fill="none" stroke="#10324f" strokeWidth="2.4" strokeLinejoin="round"><path d="M4 8h3l2-3h6l2 3h3v11H4z" /><circle cx="12" cy="13" r="3.5" /></svg></span>
              <small>{labels.a}</small>
            </button>
            <div className="counter">{labels.counter}<small>{labels.counterSub}</small></div>
            <button className="hw" onClick={hw.b}>
              <span className="round"><svg viewBox="0 0 24 24" fill="none" stroke="#10324f" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M10 6l-6 6 6 6M4 12h16" /></svg></span>
              <small>{labels.b}</small>
            </button>
          </div>
          <div className="pillrow">
            <button className="pill red" onClick={hw.page} disabled={!pageEnabled}>{labels.page}</button>
          </div>
        </div>
        <div className="dpad" role="group" aria-label="D-pad">
          <button className="u" onClick={hw.up} aria-label="Up">&#9650;</button>
          <button className="l" onClick={hw.left} aria-label="Previous">&#9664;</button>
          <button className="c" onClick={hw.ok} aria-label="OK">OK</button>
          <button className="r" onClick={hw.right} aria-label="Next">&#9654;</button>
          <button className="d" onClick={hw.down} aria-label="Down">&#9660;</button>
        </div>
      </footer>
    </div>
  );
}
