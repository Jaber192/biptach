import { useEffect, useMemo, useRef, useState } from "react";
import { ClipboardList, Clock, Camera, PenLine, StickyNote, CircleCheck as CheckCircle2, MapPin, User, CalendarClock, X, Loader as Loader2 } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { useWorkOrders } from "../hooks/useWorkOrders";
import { useCustomers } from "../hooks/useCustomers";
import { useTechnicians } from "../hooks/useTechnicians";
import { uploadJobPhoto, uploadSignature, getSignedUrls } from "../lib/storage";
import { SignaturePad } from "../components/technicians/SignaturePad";
import type { WorkOrder } from "../types";
import {
  PRIORITY_BADGE_CLASSES,
  PRIORITY_LABELS,
  STATUS_BADGE_CLASSES,
  STATUS_LABELS,
} from "../utils/workOrderDisplay";

type Tab = "active" | "completed";

export function TechnicianMobilePage() {
  const { session } = useAuth();
  const { workOrders, loading, clockIn, clockOut, setTechNotes, addPhoto, setSignature, completeWorkOrder } = useWorkOrders();
  const { getCustomer } = useCustomers();
  const { technicians } = useTechnicians();
  const [tab, setTab] = useState<Tab>("active");
  const [active, setActive] = useState<WorkOrder | null>(null);

  const myTechnician = useMemo(
    () => technicians.find((t) => t.user_id === session?.user?.id) ?? null,
    [technicians, session?.user?.id],
  );

  const myJobs = useMemo(
    () => workOrders.filter((w) => myTechnician && w.assignedTo === myTechnician.id),
    [workOrders, myTechnician],
  );

  const activeJobs = useMemo(
    () => myJobs.filter((w) => w.status === "scheduled" || w.status === "in_progress" || w.status === "pending"),
    [myJobs],
  );

  const completedJobs = useMemo(
    () => myJobs.filter((w) => w.status === "completed" || w.status === "cancelled"),
    [myJobs],
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!myTechnician) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-8 text-center dark:border-slate-800 dark:bg-slate-900">
        <ClipboardList className="mx-auto h-10 w-10 text-slate-400" />
        <h2 className="mt-4 text-lg font-semibold text-slate-900 dark:text-white">No technician profile linked</h2>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Your account isn't linked to a technician record yet. Ask an admin to assign your account to a technician so you can see your jobs in the field.
        </p>
      </div>
    );
  }

  const list = tab === "active" ? activeJobs : completedJobs;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">My Jobs</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {myTechnician.name} · {activeJobs.length} active {activeJobs.length === 1 ? "job" : "jobs"}
        </p>
      </div>

      <div className="flex gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
        <button
          onClick={() => setTab("active")}
          className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
            tab === "active" ? "bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-white" : "text-slate-500 dark:text-slate-400"
          }`}
        >
          Active ({activeJobs.length})
        </button>
        <button
          onClick={() => setTab("completed")}
          className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
            tab === "completed" ? "bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-white" : "text-slate-500 dark:text-slate-400"
          }`}
        >
          Completed ({completedJobs.length})
        </button>
      </div>

      {list.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center dark:border-slate-700 dark:bg-slate-900">
          <ClipboardList className="mx-auto h-10 w-10 text-slate-400" />
          <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
            {tab === "active" ? "No active jobs assigned to you." : "No completed jobs yet."}
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {list.map((job) => {
            const customer = job.customerId ? getCustomer(job.customerId) : null;
            return (
              <li
                key={job.id}
                className="cursor-pointer rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:border-primary-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-primary-700"
                onClick={() => setActive(job)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-slate-900 dark:text-white">{job.title}</p>
                    {customer && (
                      <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-slate-500 dark:text-slate-400">
                        <User className="h-3 w-3" />
                        {customer.name}
                      </p>
                    )}
                  </div>
                  <span className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE_CLASSES[job.status]}`}>
                    {STATUS_LABELS[job.status]}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                  {job.scheduledDate && (
                    <span className="flex items-center gap-1">
                      <CalendarClock className="h-3 w-3" />
                      {new Date(job.scheduledDate).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
                    </span>
                  )}
                  <span className={`inline-flex rounded px-1.5 py-0.5 text-[10px] font-medium ${PRIORITY_BADGE_CLASSES[job.priority]}`}>
                    {PRIORITY_LABELS[job.priority]}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {active && (
        <JobActionSheet
          job={active}
          customerName={active.customerId ? getCustomer(active.customerId)?.name ?? null : null}
          customerAddress={
            active.customerId
              ? [getCustomer(active.customerId)?.address, getCustomer(active.customerId)?.city, getCustomer(active.customerId)?.state]
                  .filter(Boolean)
                  .join(", ")
              : null
          }
          onClose={() => setActive(null)}
          onClockIn={() => clockIn(active.id).then((u) => u && setActive(u))}
          onClockOut={() => clockOut(active.id).then((u) => u && setActive(u))}
          onSaveNotes={(notes) => setTechNotes(active.id, notes).then((u) => u && setActive(u))}
          onAddPhoto={async (file) => {
            const path = await uploadJobPhoto(active.id, file);
            if (path) await addPhoto(active.id, path);
            const fresh = workOrders.find((w) => w.id === active.id);
            if (fresh) setActive(fresh);
          }}
          onSaveSignature={async (dataUrl) => {
            const path = await uploadSignature(active.id, dataUrl);
            if (path) await setSignature(active.id, path);
          }}
          onComplete={() => completeWorkOrder(active.id).then((u) => u && setActive(u))}
        />
      )}
    </div>
  );
}

function JobActionSheet({
  job,
  customerName,
  customerAddress,
  onClose,
  onClockIn,
  onClockOut,
  onSaveNotes,
  onAddPhoto,
  onSaveSignature,
  onComplete,
}: {
  job: WorkOrder;
  customerName: string | null;
  customerAddress: string | null;
  onClose: () => void;
  onClockIn: () => void;
  onClockOut: () => void;
  onSaveNotes: (notes: string) => void;
  onAddPhoto: (file: File) => Promise<void>;
  onSaveSignature: (dataUrl: string) => Promise<void>;
  onComplete: () => void;
}) {
  const [notes, setNotes] = useState(job.techNotes ?? "");
  const [notesOpen, setNotesOpen] = useState(false);
  const [sigOpen, setSigOpen] = useState(false);
  const [signature, setSignature] = useState<string | null>(null);
  const [photoUrls, setPhotoUrls] = useState<Map<string, string>>(new Map());
  const [sigUrl, setSigUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [savingNotes, setSavingNotes] = useState(false);
  const [savingSig, setSavingSig] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (job.photos.length > 0) {
      getSignedUrls(job.photos).then(setPhotoUrls);
    } else {
      setPhotoUrls(new Map());
    }
  }, [job.photos]);

  useEffect(() => {
    if (job.signatureStorageId) {
      getSignedUrls([job.signatureStorageId]).then((m) => setSigUrl(m.get(job.signatureStorageId!) ?? null));
    } else {
      setSigUrl(null);
    }
  }, [job.signatureStorageId]);

  async function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    await onAddPhoto(file);
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function handleSaveNotes() {
    setSavingNotes(true);
    onSaveNotes(notes);
    setSavingNotes(false);
    setNotesOpen(false);
  }

  async function handleSaveSignature() {
    if (!signature) return;
    setSavingSig(true);
    await onSaveSignature(signature);
    setSavingSig(false);
    setSigOpen(false);
    setSignature(null);
  }

  const isInProgress = job.status === "in_progress";
  const isCompleted = job.status === "completed" || job.status === "cancelled";

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/50 backdrop-blur-sm">
      <div className="flex h-full w-full max-w-md flex-col bg-white shadow-xl dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <div className="min-w-0">
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE_CLASSES[job.status]}`}>
                {STATUS_LABELS[job.status]}
              </span>
              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${PRIORITY_BADGE_CLASSES[job.priority]}`}>
                {PRIORITY_LABELS[job.priority]}
              </span>
            </div>
            <h2 className="truncate text-lg font-semibold text-slate-900 dark:text-white">{job.title}</h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
          {job.description && (
            <p className="text-sm text-slate-700 dark:text-slate-300">{job.description}</p>
          )}

          {customerName && (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-800/40">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Customer</p>
              <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">{customerName}</p>
              {customerAddress && (
                <p className="mt-1 flex items-start gap-1 text-xs text-slate-500 dark:text-slate-400">
                  <MapPin className="mt-0.5 h-3 w-3 shrink-0" />
                  {customerAddress}
                </p>
              )}
            </div>
          )}

          {job.scheduledDate && (
            <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
              <CalendarClock className="h-4 w-4 text-slate-400" />
              {new Date(job.scheduledDate).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-800">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Clock in</p>
              <p className="mt-1 text-sm text-slate-900 dark:text-white">
                {job.clockInTime ? new Date(job.clockInTime).toLocaleTimeString(undefined, { timeStyle: "short" }) : "—"}
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-800">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Clock out</p>
              <p className="mt-1 text-sm text-slate-900 dark:text-white">
                {job.clockOutTime ? new Date(job.clockOutTime).toLocaleTimeString(undefined, { timeStyle: "short" }) : "—"}
              </p>
            </div>
          </div>

          {!isCompleted && (
            <div className="flex gap-3">
              {!isInProgress ? (
                <button
                  onClick={onClockIn}
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-700"
                >
                  <Clock className="h-4 w-4" />
                  Clock in & start
                </button>
              ) : (
                <button
                  onClick={onClockOut}
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  <Clock className="h-4 w-4" />
                  Clock out
                </button>
              )}
              <button
                onClick={onComplete}
                disabled={!isInProgress}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-accent-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-accent-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <CheckCircle2 className="h-4 w-4" />
                Complete
              </button>
            </div>
          )}

          {/* Technician notes */}
          <div className="rounded-lg border border-slate-200 dark:border-slate-800">
            <button
              onClick={() => setNotesOpen((o) => !o)}
              className="flex w-full items-center justify-between px-4 py-3 text-sm font-semibold text-slate-900 dark:text-white"
            >
              <span className="flex items-center gap-2">
                <StickyNote className="h-4 w-4 text-slate-400" />
                Technician notes
              </span>
              <span className="text-xs font-normal text-slate-400">{notesOpen ? "Hide" : "Edit"}</span>
            </button>
            {notesOpen && (
              <div className="border-t border-slate-200 p-4 dark:border-slate-800">
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={4}
                  placeholder="Add notes about the job..."
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
                <button
                  onClick={handleSaveNotes}
                  disabled={savingNotes}
                  className="mt-3 w-full rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-700 disabled:opacity-50"
                >
                  {savingNotes ? "Saving..." : "Save notes"}
                </button>
              </div>
            )}
            {!notesOpen && job.techNotes && (
              <p className="whitespace-pre-wrap border-t border-slate-200 px-4 py-3 text-sm text-slate-600 dark:border-slate-800 dark:text-slate-300">
                {job.techNotes}
              </p>
            )}
          </div>

          {/* Photos */}
          <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                <Camera className="h-4 w-4 text-slate-400" />
                Photos ({job.photos.length})
              </span>
              {!isCompleted && (
                <>
                  <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={handlePhoto} className="hidden" />
                  <button
                    onClick={() => fileRef.current?.click()}
                    disabled={uploading}
                    className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-100 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
                    Add photo
                  </button>
                </>
              )}
            </div>
            {job.photos.length > 0 ? (
              <div className="mt-3 grid grid-cols-3 gap-2">
                {job.photos.map((p, i) => (
                  <div key={i} className="aspect-square overflow-hidden rounded-lg border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-800">
                    {photoUrls.get(p) ? (
                      <img src={photoUrls.get(p)!} alt={`Job photo ${i + 1}`} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-sm italic text-slate-400 dark:text-slate-500">No photos attached</p>
            )}
          </div>

          {/* Signature */}
          <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                <PenLine className="h-4 w-4 text-slate-400" />
                Customer signature
              </span>
              {!isCompleted && !sigOpen && (
                <button
                  onClick={() => setSigOpen(true)}
                  className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  <PenLine className="h-3.5 w-3.5" />
                  {job.signatureStorageId ? "Re-sign" : "Capture"}
                </button>
              )}
            </div>
            {sigOpen && (
              <div className="mt-3">
                <SignaturePad onChange={setSignature} />
                <button
                  onClick={handleSaveSignature}
                  disabled={!signature || savingSig}
                  className="mt-3 w-full rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-700 disabled:opacity-50"
                >
                  {savingSig ? "Saving..." : "Save signature"}
                </button>
              </div>
            )}
            {!sigOpen && sigUrl && (
              <div className="mt-3 rounded-lg border border-slate-200 bg-white p-2 dark:border-slate-700">
                <img src={sigUrl} alt="Customer signature" className="h-24 w-full object-contain" />
              </div>
            )}
            {!sigOpen && !sigUrl && (
              <p className="mt-2 text-sm italic text-slate-400 dark:text-slate-500">No signature captured</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
