export default function LegendItem({ color, label }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className={`h-2.5 w-2.5 rounded-full ${color}`} />
      {label}
    </div>
  );
}
