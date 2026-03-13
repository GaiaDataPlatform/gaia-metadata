export default function Spinner({ size = 20 }) {
  return (
    <div className="flex items-center justify-center p-8">
      <div
        className="rounded-full border-2 border-ocean-400 border-t-transparent animate-spin"
        style={{ width: size, height: size }}
      />
    </div>
  );
}
