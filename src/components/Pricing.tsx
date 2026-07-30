import { motion } from "motion/react";
import { Check } from "lucide-react";

const PLANS = [
  {
    name: "Solo",
    price: "$29",
    period: "/month",
    tagline: "For solo operators and new businesses",
    features: [
      "Up to 1 technician",
      "Unlimited customers",
      "Work order management",
      "Mobile app for technicians",
      "Photo & signature capture",
      "Email support",
    ],
    highlighted: false,
    cta: "Start free trial",
  },
  {
    name: "Team",
    price: "$79",
    period: "/month",
    tagline: "For growing HVAC teams up to 15 technicians",
    features: [
      "Up to 15 technicians",
      "Everything in Solo, plus:",
      "Smart scheduling & dispatch",
      "Real-time notifications",
      "Reports & analytics",
      "Priority support",
    ],
    highlighted: true,
    cta: "Start free trial",
  },
  {
    name: "Business",
    price: "$149",
    period: "/month",
    tagline: "For established companies up to 50 technicians",
    features: [
      "Up to 50 technicians",
      "Everything in Team, plus:",
      "Role-based permissions",
      "Manager dashboard",
      "Custom job types & priorities",
      "Dedicated support",
    ],
    highlighted: false,
    cta: "Start free trial",
  },
];

export function Pricing() {
  return (
    <section id="pricing" className="py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-sm font-semibold uppercase tracking-wider text-primary-600 dark:text-primary-400">
            Pricing
          </span>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl dark:text-white">
            Stop paying for thousands of features you don&rsquo;t use.
          </h2>
          <p className="mt-4 text-lg text-slate-600 dark:text-slate-300">
            Pay only for what you actually need. Biptach strips out the corporate software bloat to give your trucks on the road exactly what they use every day&mdash;and nothing they don&rsquo;t. No hidden upsells, no contract traps.
          </p>
        </div>

        <div className="mt-16 grid grid-cols-1 gap-6 lg:grid-cols-3">
          {PLANS.map((plan, i) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
              className={`relative rounded-2xl border p-8 ${
                plan.highlighted
                  ? "border-primary-600 bg-white shadow-xl shadow-primary-600/10 dark:bg-slate-900 lg:-mt-4 lg:mb-4"
                  : "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
              }`}
            >
              {plan.highlighted && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-accent-500 px-4 py-1 text-xs font-bold text-white shadow-sm">
                  Most popular
                </div>
              )}
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">{plan.name}</h3>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{plan.tagline}</p>
              <div className="mt-5 flex items-baseline">
                <span className="text-4xl font-bold text-slate-900 dark:text-white">{plan.price}</span>
                <span className="ml-1 text-base text-slate-500 dark:text-slate-400">{plan.period}</span>
              </div>

              <ul className="mt-6 space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2.5 text-sm text-slate-600 dark:text-slate-300">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent-500" strokeWidth={2.5} />
                    {feature}
                  </li>
                ))}
              </ul>

              <a
                href="#"
                className={`mt-8 block rounded-xl px-4 py-3 text-center text-sm font-semibold transition-all ${
                  plan.highlighted
                    ? "bg-primary-600 text-white shadow-md hover:bg-primary-700 hover:shadow-lg"
                    : "border border-slate-300 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                }`}
              >
                {plan.cta}
              </a>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
