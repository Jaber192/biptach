import { motion } from "motion/react";
import { useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { scrollToSection } from "../utils/scroll";

export function CtaBanner() {
  const navigate = useNavigate();
  return (
    <section className="py-20 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.5 }}
          className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary-600 to-primary-800 px-6 py-16 text-center shadow-2xl shadow-primary-600/30 sm:px-16"
        >
          {/* decorative accents */}
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -left-10 top-0 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
            <div className="absolute -right-10 bottom-0 h-48 w-48 rounded-full bg-accent-400/20 blur-2xl" />
          </div>

          <div className="relative">
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Ready to ditch the whiteboard?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-lg text-primary-100">
              Join HVAC teams who've made the switch to a simpler way of working.
              Your first 14 days are on us.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => navigate("/signup")}
                className="group inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white px-6 py-3.5 text-base font-semibold text-primary-700 shadow-lg transition-all hover:bg-primary-50 sm:w-auto"
              >
                Start your free trial
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </button>
              <button
                type="button"
                onClick={() => scrollToSection("features")}
                className="inline-flex w-full items-center justify-center rounded-xl border border-white/30 px-6 py-3.5 text-base font-semibold text-white transition-colors hover:bg-white/10 sm:w-auto"
              >
                Explore features
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
