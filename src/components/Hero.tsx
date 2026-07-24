import { motion } from "motion/react";
import { ArrowRight, CircleCheck as CheckCircle2, Clock, MapPin, Wrench } from "lucide-react";

export function Hero() {
  return (
    <section id="top" className="relative overflow-hidden pt-28 pb-20 sm:pt-32 lg:pt-40 lg:pb-28">
      {/* background accents */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-24 left-1/2 h-[36rem] w-[36rem] -translate-x-1/2 rounded-full bg-primary-100/60 blur-3xl dark:bg-primary-900/30" />
        <div className="absolute top-40 right-0 h-72 w-72 rounded-full bg-accent-100/50 blur-3xl dark:bg-accent-900/20" />
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <motion.span
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="inline-flex items-center gap-2 rounded-full border border-primary-200 bg-primary-50 px-4 py-1.5 text-sm font-medium text-primary-700 dark:border-primary-800 dark:bg-primary-950 dark:text-primary-300"
          >
            <span className="flex h-2 w-2 rounded-full bg-accent-500" />
            Built for HVAC teams, not enterprise complexity
          </motion.span>

          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.05 }}
            className="mt-6 text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl dark:text-white"
          >
            Run your HVAC business
            <span className="block text-primary-600 dark:text-primary-400">from one simple app</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mx-auto mt-6 max-w-2xl text-lg text-slate-600 dark:text-slate-300"
          >
            Biptach replaces the whiteboard, the spreadsheet, and the phone calls.
            Schedule jobs, dispatch technicians, and track work orders — all from a
            fast, mobile-first dashboard your team will actually enjoy using.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row"
          >
            <a
              href="#pricing"
              className="group inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary-600 px-6 py-3.5 text-base font-semibold text-white shadow-lg shadow-primary-600/20 transition-all hover:bg-primary-700 hover:shadow-xl hover:shadow-primary-600/30 sm:w-auto"
            >
              Start 14-day free trial
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </a>
            <a
              href="#how-it-works"
              className="inline-flex w-full items-center justify-center rounded-xl border border-slate-300 bg-white px-6 py-3.5 text-base font-semibold text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 sm:w-auto"
            >
              See how it works
            </a>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.25 }}
            className="mt-4 text-sm text-slate-500 dark:text-slate-400"
          >
            No credit card required · Cancel anytime
          </motion.p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.3 }}
          className="mx-auto mt-16 max-w-5xl"
        >
          <DashboardMockup />
        </motion.div>
      </div>
    </section>
  );
}

function DashboardMockup() {
  const jobs = [
    { name: "AC Repair — Miller Residence", tech: "James K.", status: "In progress", color: "bg-amber-500" },
    { name: "Furnace Install — Oakwood Mall", tech: "Sofia R.", status: "Scheduled", color: "bg-primary-500" },
    { name: "Maintenance — Greenfield Apts", tech: "Marcus T.", status: "Completed", color: "bg-accent-500" },
  ];

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/10 dark:border-slate-800 dark:bg-slate-900 dark:shadow-black/40">
      {/* window chrome */}
      <div className="flex items-center gap-2 border-b border-slate-200 px-4 py-3 dark:border-slate-800">
        <div className="flex gap-1.5">
          <div className="h-3 w-3 rounded-full bg-red-400" />
          <div className="h-3 w-3 rounded-full bg-amber-400" />
          <div className="h-3 w-3 rounded-full bg-green-400" />
        </div>
        <div className="ml-3 flex-1">
          <div className="mx-auto w-fit rounded-md bg-slate-100 px-3 py-1 text-xs text-slate-500 dark:bg-slate-800 dark:text-slate-400">
            app.biptach.com/dashboard
          </div>
        </div>
      </div>

      <div className="grid grid-cols-12">
        {/* sidebar */}
        <div className="col-span-3 hidden border-r border-slate-200 p-4 dark:border-slate-800 sm:block">
          <div className="space-y-1.5">
            {["Dashboard", "Work Orders", "Customers", "Schedule", "Technicians", "Reports"].map(
              (item, i) => (
                <div
                  key={item}
                  className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm ${
                    i === 0
                      ? "bg-primary-50 font-semibold text-primary-700 dark:bg-primary-950 dark:text-primary-300"
                      : "text-slate-500 dark:text-slate-400"
                  }`}
                >
                  <div className={`h-4 w-4 rounded ${i === 0 ? "bg-primary-500" : "bg-slate-300 dark:bg-slate-700"}`} />
                  {item}
                </div>
              ),
            )}
          </div>
        </div>

        {/* main */}
        <div className="col-span-12 p-5 sm:col-span-9">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <div className="text-lg font-bold text-slate-900 dark:text-white">Today's Dispatch</div>
              <div className="text-sm text-slate-500 dark:text-slate-400">Tuesday, July 24 · 3 active jobs</div>
            </div>
            <div className="hidden rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-semibold text-white sm:block">
              + New work order
            </div>
          </div>

          {/* stat cards */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Active", value: "3", icon: Wrench, tone: "text-primary-600" },
              { label: "Completed", value: "7", icon: CheckCircle2, tone: "text-accent-600" },
              { label: "Pending", value: "2", icon: Clock, tone: "text-amber-500" },
            ].map((s) => (
              <div key={s.label} className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <s.icon className={`h-4 w-4 ${s.tone}`} />
                  <span className="text-xs text-slate-500 dark:text-slate-400">{s.label}</span>
                </div>
                <div className="mt-1.5 text-2xl font-bold text-slate-900 dark:text-white">{s.value}</div>
              </div>
            ))}
          </div>

          {/* job list */}
          <div className="mt-4 space-y-2.5">
            {jobs.map((job) => (
              <div
                key={job.name}
                className="flex items-center justify-between rounded-xl border border-slate-200 p-3 dark:border-slate-800"
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{job.name}</div>
                  <div className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                    <MapPin className="h-3 w-3" /> {job.tech}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${job.color}`} />
                  <span className="text-xs font-medium text-slate-600 dark:text-slate-300">{job.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
