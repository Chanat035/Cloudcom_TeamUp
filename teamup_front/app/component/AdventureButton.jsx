export default function AdventureButton({ label }) {
  return (
    <button
      type="button"
      aria-disabled="true"
      className="rounded-full border-2 border-neutral-400/80 px-5 py-2.5 text-base text-neutral-900
                 hover:border-neutral-700 hover:shadow
                 focus:outline-none focus:ring-4 focus:ring-neutral-300 active:scale-[0.99]
                 transition"
    >
      {label}
    </button>
  );
}
