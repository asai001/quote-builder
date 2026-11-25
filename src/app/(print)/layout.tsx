export default function PrintLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <div className="min-h-screen bg-slate-300 print:bg-white">{children}</div>;
}
