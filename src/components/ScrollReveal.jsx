import { motion } from "framer-motion";

/**
 * Wraps children with a scroll-triggered fade + slide-up animation.
 * `delay` in seconds, `y` is the starting offset in px.
 */
export default function ScrollReveal({ children, delay = 0, y = 60, className = "", once = true }) {
  return (
    <motion.div
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once, margin: "-80px" }}
      transition={{ duration: 0.7, delay, ease: [0.25, 0.1, 0.25, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
