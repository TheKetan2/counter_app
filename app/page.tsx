import dynamic from "next/dynamic";

const TallyFlowClient = dynamic(() => import("@/components/TallyFlow"), {
  ssr: false,
  loading: () => <main className="app-shell" aria-busy="true">Loading TallyFlow…</main>
});

export default function Page() { return <TallyFlowClient />; }
