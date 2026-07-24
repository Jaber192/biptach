import { motion } from "motion/react";
import { CalendarDays, Users, ClipboardList, Smartphone, Camera, PenLine, Bell, ChartBar as BarChart3 } from "lucide-react";

const FEATURES = [
  {
    icon: CalendarDays,
    title: "Smart Scheduling",
    description: "Drag-and-drop calendar to assign jobs in seconds. See technician availability at a glance and never double-book again.",
  },
  {
    icon: Users,
    title: "Technician Dispatch",
    description: "Send jobs straight to your technicians' phones. They see everything they need — location, job type, customer history.",
  },
  {
    icon: ClipboardList,
    title: "Work Order Management",
    description: "Create, track, and complete work orders from one place. Job types, priorities, and statuses keep your team aligned.",
  },
  {
    icon: Smartphone,
    title: "Mobile-First for Techs",
    description: "Technicians work from their phone. Start jobs, add notes, and clock in and out — all without leaving the job site.",
  },
  {
    icon: Camera,
    title: "Photo Capture",
    description: "Document every job with photos. Before and after shots attach right to the work order for your records.",
  },
  {
    icon: PenLine,
    title: "Customer Signatures",
    description: "Capture approval signatures on-site. No more paper forms or scanning — it's all stored digitally.",
  },
  {
    icon: Bell,
    title: "Real-Time Notifications",
    description: "Know the moment a technician clocks in, completes a job, or a new work order is created. Stay in the loop.",
  },
  {
    icon: BarChart3,
    title: "Reports & Analytics",
    description: "Track jobs completed, technician performance, and response times. Make decisions with real numbers, not guesses.",
  },
];

export function Features() {
  return (
    <section id="features" className="py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-sm font-semibold uppercase tracking-wider text-primary-600 dark:text-primary-400">
            Everything you need
          </span>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl dark:text-white">
            All your HVAC tools in one place
          </h2>
          <p className="mt-4 text-lg text-slate-600 dark:text-slate-300">
            No more juggling spreadsheets, text messages, and paper work orders.
            Biptach brings your whole operation together.
          </p>
        </div>

        <div className="mt-16 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.4, delay: (i % 4) * 0.08 }}
              className="group rounded-2xl border border-slate-200 bg-white p-6 transition-all hover:border-primary-300 hover:shadow-lg dark:border-slate-800 dark:bg-slate-900 dark:hover:border-primary-700"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-50 text-primary-600 transition-colors group-hover:bg-primary-600 group-hover:text-white dark:bg-primary-950 dark:text-primary-400">
                <feature.icon className="h-6 w-6" strokeWidth={2} />
              </div>
              <h3 className="mt-5 text-lg font-semibold text-slate-900 dark:text-white">{feature.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
