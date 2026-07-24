import { motion } from "motion/react";
import { UserPlus, CalendarCheck, Smartphone, CheckCircle2 } from "lucide-react";

const STEPS = [
  {
    icon: UserPlus,
    title: "Add your customers",
    description: "Create customer profiles with addresses, contact info, and service history in under 30 seconds.",
  },
  {
    icon: CalendarCheck,
    title: "Schedule & dispatch",
    description: "Create a work order, assign it to a technician, and set the time. The job lands on their phone instantly.",
  },
  {
    icon: Smartphone,
    title: "Tech completes the job",
    description: "Your technician clocks in, adds notes, takes photos, and captures a signature — all from their phone.",
  },
  {
    icon: CheckCircle2,
    title: "Track & review",
    description: "Watch jobs move from scheduled to completed in real time. Review reports and keep your operation tight.",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="bg-slate-50 py-20 sm:py-28 dark:bg-slate-950/50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-sm font-semibold uppercase tracking-wider text-primary-600 dark:text-primary-400">
            How it works
          </span>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl dark:text-white">
            From job created to job done
          </h2>
          <p className="mt-4 text-lg text-slate-600 dark:text-slate-300">
            Four simple steps. No training required. Your team will be up and running in minutes.
          </p>
        </div>

        <div className="relative mt-16">
          {/* connecting line */}
          <div className="absolute left-0 right-0 top-8 hidden h-px bg-gradient-to-r from-transparent via-primary-300 to-transparent lg:block dark:via-primary-700" />

          <div className="grid grid-cols-1 gap-12 lg:grid-cols-4 lg:gap-8">
            {STEPS.map((step, i) => (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                className="relative text-center"
              >
                <div className="relative z-10 mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-md ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700">
                  <step.icon className="h-7 w-7 text-primary-600 dark:text-primary-400" strokeWidth={2} />
                </div>
                <div className="mt-4 text-sm font-bold text-primary-600 dark:text-primary-400">
                  Step {i + 1}
                </div>
                <h3 className="mt-1 text-lg font-semibold text-slate-900 dark:text-white">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">{step.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
