/**
 * Reusable phone frame with gradient border.
 * `children` goes inside the screen area.
 * `variant` controls the gradient: "teal" | "lime"
 */
const gradients = {
  teal: "from-brand-500 via-brand-400 to-brand-200",
  lime: "from-lime-400 via-brand-400 to-brand-500",
};

export default function PhoneMockup({ children, variant = "teal", className = "" }) {
  return (
    <div className={`relative mx-auto w-[270px] sm:w-[290px] ${className}`}>
      <div
        className={`rounded-[3rem] bg-gradient-to-br ${gradients[variant]} p-[3px] shadow-2xl shadow-brand-500/20`}
      >
        <div className="rounded-[2.85rem] bg-white overflow-hidden">
          {/* Notch */}
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-24 h-[5px] rounded-full bg-slate-200" />
          </div>
          {/* Screen content */}
          <div className="px-4 pb-5 pt-2">
            {children}
          </div>
          {/* Home indicator */}
          <div className="flex justify-center pb-3">
            <div className="w-28 h-[4px] rounded-full bg-slate-200" />
          </div>
        </div>
      </div>
    </div>
  );
}
