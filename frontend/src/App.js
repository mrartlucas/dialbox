import { useEffect } from "react";
import "@/App.css";
import { PhoneIncoming, Radio } from "lucide-react";
import PhoneSimulator from "@/components/PhoneSimulator";
import ConfigPanel from "@/components/ConfigPanel";
import { api } from "@/lib/phoneApi";

function App() {
  useEffect(() => {
    api.getMenu().catch(() => {});
  }, []);

  return (
    <div className="App grain min-h-screen text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b-2 border-neutral-800 bg-neutral-950/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-sm border-2 border-[#39ff14] bg-[#39ff14]/10">
              <PhoneIncoming className="h-5 w-5 crt-glow" />
            </div>
            <div>
              <h1 className="font-mono text-xl font-bold tracking-tighter">
                DIALBOX <span className="text-neutral-600">//</span>{" "}
                <span className="amber-glow">network</span>
              </h1>
              <p className="font-mono text-[10px] uppercase tracking-[0.35em] text-neutral-500">
                the dialbox network · dev simulator
              </p>
            </div>
          </div>
          <div className="hidden items-center gap-2 sm:flex">
            <Radio className="h-4 w-4 crt-glow animate-pulse" />
            <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-neutral-400">
              standalone mode · network live
            </span>
          </div>
        </div>
      </header>

      {/* Split layout */}
      <main className="relative z-10 mx-auto max-w-[1500px] px-6 py-10">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,460px)_minmax(0,1fr)]">
          <section>
            <p className="mb-4 font-mono text-[11px] uppercase tracking-[0.35em] text-neutral-500">
              ↓ pick up the handset
            </p>
            <PhoneSimulator />
          </section>
          <section className="min-h-[600px]">
            <p className="mb-4 font-mono text-[11px] uppercase tracking-[0.35em] text-neutral-500">
              ↓ configure the box
            </p>
            <ConfigPanel />
          </section>
        </div>
      </main>
    </div>
  );
}

export default App;
