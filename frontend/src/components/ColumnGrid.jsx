export default function ColumnGrid() {
  return (
    <div className="fixed inset-0 z-0 pointer-events-none px-4 md:px-10" aria-hidden="true">
      <div className="grid grid-cols-12 h-full">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className={`border-l border-line ${i === 11 ? "border-r" : ""}`} />
        ))}
      </div>
    </div>
  );
}
