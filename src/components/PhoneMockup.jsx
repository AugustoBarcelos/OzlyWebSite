/**
 * Reusable phone frame. `children` goes inside the screen area.
 * Styled like an actual device — near-black bezel, dark notch — instead of
 * a branded gradient border (which read as "template"). The `variant` prop
 * is kept for API compatibility but no longer changes the frame.
 */
export default function PhoneMockup({ children, variant = "teal", className = "" }) {
  void variant; // legacy prop — frame is device-neutral now
  return (
    <div className={`relative mx-auto w-[230px] sm:w-[270px] md:w-[290px] ${className}`}>
      <div className="rounded-[3rem] bg-[#17181c] p-[9px] shadow-2xl shadow-navy-900/30 ring-1 ring-black/20">
        <div className="rounded-[2.45rem] bg-white dark:bg-slate-900 overflow-hidden">
          {/* Notch */}
          <div className="flex justify-center pt-2.5 pb-1">
            <div className="w-20 h-[18px] rounded-full bg-[#17181c]" />
          </div>
          {/* Screen content */}
          <div className="px-4 pb-5 pt-2">
            {children}
          </div>
          {/* Home indicator */}
          <div className="flex justify-center pb-2.5">
            <div className="w-24 h-[4px] rounded-full bg-slate-300 dark:bg-slate-600" />
          </div>
        </div>
      </div>
    </div>
  );
}
