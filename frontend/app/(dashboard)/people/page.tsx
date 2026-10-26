"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import {
  Search,
  Plus,
  Users,
  X,
  Mail,
  UserRound,
  UserPlus,
  LoaderCircle,
  ArrowRight,
  Trash2,
  Phone,
  UserCheck,
  UserRoundPlus,
  CircleAlert,
  CheckCircle2,
  UsersRound,
  RotateCcw,
  Clock,
  ShieldCheck,
} from "lucide-react";
import { apiFetch } from "@/lib/api";

type Person = {
  id: number;
  name: string;
  phone: string;
  address?: string;
  email?: string;
  status: "ACTIVE" | "DECEASED" | "CLOSED";
  linked_user: number | null;
  invited_email?: string;
  profile_picture?: string | null;
  deleted_at?: string | null;
};

type RegisteredUser = {
  id: number;
  name: string;
  email: string;
};

type AddMode = "registered" | "invite" | "manual";

const API_BASE = (
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000"
).replace(/\/+$/, "");

const colors = {
  background: "#FAF9F6",
  navy: "#14243D",
  navyHover: "#203958",
  secondary: "#777A80",
  border: "#DAD9D4",
  divider: "#DFDED8",
  gold: "#8C7547",
};

const inputClass =
  "h-11 w-full rounded-lg border border-[#DAD9D4] bg-white px-3 text-xs text-[#252B35] outline-none transition placeholder:text-[#96989C] focus:border-[#14243D] focus:ring-2 focus:ring-[#14243D]/10";

const primaryButtonClass =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#14243D] px-4 py-2.5 text-xs font-medium text-white transition hover:bg-[#203958] focus:outline-none focus:ring-4 focus:ring-[#14243D]/10 disabled:cursor-not-allowed disabled:opacity-60";

const secondaryButtonClass =
  "inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-[#DAD9D4] bg-white px-3 py-2 text-xs font-medium text-[#14243D] transition hover:bg-[#FAF9F6] focus:outline-none focus:ring-2 focus:ring-[#14243D]/10 disabled:cursor-not-allowed disabled:opacity-50";

export default function PeoplePage() {
  const [people, setPeople] = useState<Person[]>([]);
  const [recentlyDeleted, setRecentlyDeleted] = useState<Person[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [trashLoading, setTrashLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [trashOpen, setTrashOpen] = useState(false);
  const [mode, setMode] = useState<AddMode>("registered");

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [registeredQuery, setRegisteredQuery] = useState("");
  const [registeredUsers, setRegisteredUsers] = useState<RegisteredUser[]>([]);
  const [searchingUsers, setSearchingUsers] = useState(false);

  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [restoringId, setRestoringId] = useState<number | null>(null);
  const [permanentlyDeletingId, setPermanentlyDeletingId] =
    useState<number | null>(null);

  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadPeople = useCallback(async () => {
    setLoading(true);

    try {
      const response = await apiFetch("/api/people/");
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.detail || "Unable to load people.");
      }

      setPeople(Array.isArray(data) ? data : (data.results ?? []));
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load people.");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadRecentlyDeleted = useCallback(async () => {
    setTrashLoading(true);

    try {
      const response = await apiFetch("/api/people/recently-deleted/");
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.detail || "Unable to load recently deleted people."
        );
      }

      setRecentlyDeleted(Array.isArray(data) ? data : (data.results ?? []));
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load recently deleted people."
      );
    } finally {
      setTrashLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPeople();
    void loadRecentlyDeleted();
  }, [loadPeople, loadRecentlyDeleted]);

  useEffect(() => {
    const query = registeredQuery.trim();

    if (mode !== "registered" || query.length < 2) {
      setRegisteredUsers([]);
      setSearchingUsers(false);
      return;
    }

    let cancelled = false;

    const timer = setTimeout(async () => {
      setSearchingUsers(true);

      try {
        const response = await apiFetch(
          `/api/auth/users/search/?q=${encodeURIComponent(query)}`
        );
        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(data.detail || "User search failed.");
        }

        if (!cancelled) {
          setRegisteredUsers(data.results ?? []);
          setError("");
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "User search failed.");
          setRegisteredUsers([]);
        }
      } finally {
        if (!cancelled) {
          setSearchingUsers(false);
        }
      }
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [registeredQuery, mode]);

  const filteredPeople = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return people;

    return people.filter((person) =>
      [
        person.name,
        person.phone,
        person.address ?? "",
        person.email ?? "",
        person.invited_email ?? "",
      ].some((value) => value.toLowerCase().includes(query))
    );
  }, [people, search]);

  function openModal() {
    setMode("registered");
    setName("");
    setPhone("");
    setEmail("");
    setRegisteredQuery("");
    setRegisteredUsers([]);
    setError("");
    setNotice("");
    setModalOpen(true);
  }

  function closeModal() {
    if (saving) return;
    setModalOpen(false);
    setError("");
  }

  async function submitPerson(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    setSaving(true);

    try {
      let endpoint = "/api/people/";
      let body: Record<string, unknown> = {
        name: name.trim(),
        phone: phone.trim(),
        status: "ACTIVE",
      };

      if (mode === "invite") {
        endpoint = "/api/people/invite/";
        body = {
          name: name.trim(),
          email: email.trim().toLowerCase(),
          phone: phone.trim(),
        };
      } else if (mode === "registered") {
        throw new Error("Choose a registered user from the search results.");
      }

      const response = await apiFetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.detail ||
            data.email?.[0] ||
            data.name?.[0] ||
            "Unable to save this person."
        );
      }

      setModalOpen(false);
      setNotice(
        mode === "invite"
          ? data.detail || "Invitation sent successfully."
          : "Person added successfully."
      );

      await loadPeople();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  async function linkRegisteredUser(user: RegisteredUser) {
    setError("");
    setNotice("");
    setSaving(true);

    try {
      const response = await apiFetch("/api/people/link-user/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: user.id }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.detail || "Unable to link this user.");
      }

      setModalOpen(false);
      setNotice(`${user.name} has been added to your people.`);
      await loadPeople();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to link this user.");
    } finally {
      setSaving(false);
    }
  }

  async function deletePerson(person: Person) {
    const confirmed = window.confirm(
      `Move ${person.name} to Recently Deleted?\n\nYou can restore this person later.`
    );

    if (!confirmed) return;

    setDeletingId(person.id);
    setError("");
    setNotice("");

    try {
      const response = await apiFetch(`/api/people/${person.id}/`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.detail || "Unable to remove this person.");
      }

      setPeople((current) =>
        current.filter((item) => item.id !== person.id)
      );

      setNotice(`${person.name} was moved to Recently Deleted.`);
      await loadRecentlyDeleted();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to remove this person."
      );
    } finally {
      setDeletingId(null);
    }
  }

  async function restorePerson(person: Person) {
    setRestoringId(person.id);
    setError("");
    setNotice("");

    try {
      const response = await apiFetch(`/api/people/${person.id}/restore/`, {
        method: "POST",
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.detail || "Unable to restore this person.");
      }

      setRecentlyDeleted((current) =>
        current.filter((item) => item.id !== person.id)
      );

      setNotice(`${person.name} has been restored.`);
      await loadPeople();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to restore this person."
      );
    } finally {
      setRestoringId(null);
    }
  }

  async function permanentlyDeletePerson(person: Person) {
    const confirmed = window.confirm(
      `Permanently delete ${person.name}?\n\nThis cannot be undone. Their associated PAYAT record may also be deleted.`
    );

    if (!confirmed) return;

    setPermanentlyDeletingId(person.id);
    setError("");
    setNotice("");

    try {
      const response = await apiFetch(
        `/api/people/${person.id}/permanent-delete/`,
        { method: "DELETE" }
      );

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(
          data.detail || "Unable to permanently delete this person."
        );
      }

      setRecentlyDeleted((current) =>
        current.filter((item) => item.id !== person.id)
      );

      setNotice(`${person.name} was permanently deleted.`);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to permanently delete this person."
      );
    } finally {
      setPermanentlyDeletingId(null);
    }
  }

  function statusLabel(status: Person["status"]) {
    if (status === "DECEASED") return "Deceased";
    if (status === "CLOSED") return "Closed";
    return "Active";
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#FAF9F6] text-[#14243D]">
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
        {/* Page heading */}
        <header className="flex flex-col gap-5 border-b border-[#DFDED8] pb-7 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <div className="mb-4 inline-flex items-center gap-2 rounded-lg border border-[#DAD9D4] bg-white px-3 py-2 text-xs font-medium text-[#14243D]">
              <UsersRound size={15} />
              Your PAYAT community
            </div>

            <h1 className="font-serif text-3xl leading-tight tracking-tight text-[#14243D] sm:text-4xl">
              People
            </h1>

            <p className="mt-2 max-w-xl text-sm leading-6 text-[#777A80]">
              Keep your contacts organised, connect with registered users, and
              manage each person&apos;s PAYAT details in one place.
            </p>
          </div>

          <div className="flex w-full shrink-0 items-center gap-2 sm:w-auto">
            <button
              type="button"
              onClick={() => {
                setError("");
                setTrashOpen(true);
                void loadRecentlyDeleted();
              }}
              aria-label="Recently deleted people"
              title="Recently deleted"
              className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-[#DAD9D4] bg-white text-[#14243D] transition hover:border-[#14243D] hover:bg-[#F4F2EC] focus:outline-none focus:ring-2 focus:ring-[#14243D]/10"
            >
              <Trash2 size={17} />

              {recentlyDeleted.length > 0 && (
                <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#14243D] px-1 text-[10px] font-medium text-white">
                  {recentlyDeleted.length > 99
                    ? "99+"
                    : recentlyDeleted.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={openModal}
              className={`${primaryButtonClass} flex-1 sm:flex-none sm:px-5`}
            >
              <Plus size={16} />
              Add a person
            </button>
          </div>
        </header>

        {/* Notifications */}
        {notice && (
          <div
            role="status"
            className="mt-5 flex items-start gap-3 rounded-lg border border-[#DAD9D4] bg-white px-4 py-3 text-xs text-[#14243D]"
          >
            <CheckCircle2 size={17} className="mt-0.5 shrink-0 text-[#8C7547]" />
            <p className="min-w-0 flex-1 leading-5">{notice}</p>
            <button
              type="button"
              onClick={() => setNotice("")}
              aria-label="Dismiss notification"
              className="rounded-md p-1 text-[#777A80] hover:bg-[#FAF9F6] hover:text-[#14243D]"
            >
              <X size={15} />
            </button>
          </div>
        )}

        {error && !modalOpen && !trashOpen && (
          <AlertMessage message={error} onClose={() => setError("")} />
        )}

        {/* Search and count */}
        <div className="mt-7 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex h-11 w-full min-w-0 items-center gap-3 rounded-lg border border-[#DAD9D4] bg-white px-3 transition focus-within:border-[#14243D] focus-within:ring-2 focus-within:ring-[#14243D]/10 sm:max-w-lg">
            <Search size={16} className="shrink-0 text-[#777A80]" />

            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by name, phone, email or address"
              aria-label="Search people"
              className="h-full w-full min-w-0 bg-transparent text-xs text-[#252B35] outline-none placeholder:text-[#96989C]"
            />

            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                aria-label="Clear search"
                className="shrink-0 rounded-md p-1 text-[#777A80] hover:bg-[#FAF9F6] hover:text-[#14243D]"
              >
                <X size={15} />
              </button>
            )}
          </div>

          <p className="text-xs text-[#777A80] sm:text-right">
            Showing{" "}
            <span className="font-medium text-[#14243D]">
              {filteredPeople.length}
            </span>{" "}
            {filteredPeople.length === 1 ? "person" : "people"}
          </p>
        </div>

        {/* People list */}
        <section className="mt-5 overflow-hidden rounded-xl border border-[#DAD9D4] bg-white">
          <div className="flex items-center justify-between border-b border-[#DFDED8] px-4 py-4 sm:px-5">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#FAF9F6] text-[#14243D]">
                <Users size={17} />
              </div>

              <div>
                <h2 className="text-sm font-medium text-[#14243D]">
                  Your people
                </h2>
                <p className="mt-1 text-xs text-[#777A80]">
                  Contact list and PAYAT connections
                </p>
              </div>
            </div>

            <span className="hidden text-[11px] text-[#8C7547] sm:block">
              MANAGE CONTACTS
            </span>
          </div>

          {loading ? (
            <div className="flex min-h-56 items-center justify-center gap-3 px-6 py-16 text-xs text-[#777A80]">
              <LoaderCircle size={18} className="animate-spin text-[#14243D]" />
              Loading people...
            </div>
          ) : filteredPeople.length === 0 ? (
            <div className="px-5 py-14 text-center sm:px-6 sm:py-16">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl border border-[#DAD9D4] bg-[#FAF9F6] text-[#14243D]">
                {search ? <Search size={23} /> : <Users size={23} />}
              </div>

              <h2 className="mt-4 font-serif text-xl tracking-tight text-[#14243D]">
                {search ? "No people found" : "Your community starts here"}
              </h2>

              <p className="mx-auto mt-2 max-w-sm text-xs leading-5 text-[#777A80]">
                {search
                  ? "Try a different name, phone number, email or address."
                  : "Add a registered user, invite someone by email, or create a contact manually."}
              </p>

              {search ? (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className={`${secondaryButtonClass} mt-5`}
                >
                  Clear search
                </button>
              ) : (
                <button
                  type="button"
                  onClick={openModal}
                  className={`${primaryButtonClass} mt-5`}
                >
                  <Plus size={16} />
                  Add your first person
                </button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-[#DFDED8]">
              {filteredPeople.map((person) => (
                <div
                  key={person.id}
                  className="flex min-w-0 items-center gap-3 px-3 py-4 transition hover:bg-[#FAF9F6]/70 sm:gap-4 sm:px-5"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[#DAD9D4] bg-[#FAF9F6] text-sm font-medium text-[#14243D]">
                    {person.profile_picture ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={
                          person.profile_picture.startsWith("http")
                            ? person.profile_picture
                            : `${API_BASE}/${person.profile_picture.replace(/^\/+/, "")}`
                        }
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      (person.name.trim()[0] || "?").toUpperCase()
                    )}
                  </div>

                  <a href={`/people/${person.id}`} className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-[#14243D] transition hover:text-[#8C7547] sm:text-sm">
                      {person.name}
                    </p>

                    <p className="mt-1 flex min-w-0 items-center gap-1.5 truncate text-xs text-[#777A80]">
                      <Phone size={12} className="shrink-0" />
                      <span className="truncate">
                        {person.phone ||
                          person.invited_email ||
                          person.email ||
                          "No contact details"}
                      </span>
                    </p>

                    {person.address && (
                      <p className="mt-1 truncate text-[11px] text-[#96989C]">
                        {person.address}
                      </p>
                    )}
                  </a>

                  <div className="hidden shrink-0 sm:block">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[10px] font-medium ${
                        person.status === "ACTIVE"
                          ? "border-[#DAD9D4] bg-[#FAF9F6] text-[#14243D]"
                          : "border-[#E7E5DF] bg-white text-[#777A80]"
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          person.status === "ACTIVE"
                            ? "bg-[#8C7547]"
                            : "bg-[#96989C]"
                        }`}
                      />
                      {statusLabel(person.status)}
                    </span>
                  </div>

                  {person.linked_user && (
                    <span className="hidden shrink-0 items-center gap-1 text-[11px] text-[#8C7547] md:inline-flex">
                      <UserCheck size={13} />
                      Registered
                    </span>
                  )}

                  <a
                    href={`/people/${person.id}`}
                    aria-label={`View ${person.name}`}
                    className="shrink-0 rounded-lg p-2 text-[#777A80] transition hover:bg-[#F4F2EC] hover:text-[#14243D]"
                  >
                    <ArrowRight size={16} />
                  </a>

                  <button
                    type="button"
                    disabled={deletingId === person.id}
                    onClick={() => void deletePerson(person)}
                    aria-label={`Move ${person.name} to Recently Deleted`}
                    title="Move to Recently Deleted"
                    className="shrink-0 rounded-lg p-2 text-[#96989C] transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                  >
                    {deletingId === person.id ? (
                      <LoaderCircle size={16} className="animate-spin" />
                    ) : (
                      <Trash2 size={16} />
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        <footer className="mt-6 flex flex-col items-center justify-center gap-2 text-center">
          <div className="flex items-center gap-2 text-[#14243D]">
            <ShieldCheck size={14} />
            <span className="text-[11px] font-medium">PAYAT</span>
          </div>
          <p className="text-[10px] text-[#96989C]">
            Your community, organised with care.
          </p>
        </footer>
      </div>

      {/* Recently Deleted modal */}
      {trashOpen && (
        <ModalBackdrop onClose={() => setTrashOpen(false)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="recently-deleted-title"
            className="my-auto max-h-[calc(100dvh-24px)] w-full max-w-2xl overflow-y-auto rounded-xl border border-[#DAD9D4] bg-white shadow-2xl sm:max-h-[calc(100dvh-40px)]"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-[#DFDED8] bg-white px-5 py-5 sm:px-6">
              <div>
                <div className="mb-3 inline-flex items-center gap-2 rounded-lg border border-[#DAD9D4] bg-[#FAF9F6] px-3 py-1.5 text-[11px] font-medium text-[#14243D]">
                  <Trash2 size={13} />
                  Deleted contacts
                </div>

                <h2
                  id="recently-deleted-title"
                  className="font-serif text-2xl tracking-tight text-[#14243D]"
                >
                  Recently Deleted
                </h2>

                <p className="mt-1 text-xs leading-5 text-[#777A80]">
                  Restore a person or permanently remove them.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setTrashOpen(false)}
                aria-label="Close Recently Deleted"
                className="rounded-lg p-2 text-[#777A80] transition hover:bg-[#FAF9F6] hover:text-[#14243D]"
              >
                <X size={17} />
              </button>
            </div>

            {error && (
              <div className="px-5 pt-4 sm:px-6">
                <AlertMessage message={error} onClose={() => setError("")} />
              </div>
            )}

            {trashLoading ? (
              <LoadingState message="Loading deleted people..." />
            ) : recentlyDeleted.length === 0 ? (
              <div className="px-5 py-12 text-center sm:px-6">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl border border-[#DAD9D4] bg-[#FAF9F6] text-[#14243D]">
                  <Trash2 size={21} />
                </div>

                <h3 className="mt-4 font-serif text-xl text-[#14243D]">
                  Your basket is empty
                </h3>

                <p className="mx-auto mt-2 max-w-sm text-xs leading-5 text-[#777A80]">
                  People you remove will appear here, so you can restore them
                  later.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-[#DFDED8]">
                {recentlyDeleted.map((person) => (
                  <div
                    key={person.id}
                    className="flex flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:px-6"
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#DAD9D4] bg-[#FAF9F6] text-sm font-medium text-[#777A80]">
                        {(person.name.trim()[0] || "?").toUpperCase()}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-medium text-[#14243D] sm:text-sm">
                          {person.name}
                        </p>

                        <p className="mt-1 truncate text-xs text-[#777A80]">
                          {person.phone ||
                            person.invited_email ||
                            person.email ||
                            "No contact details"}
                        </p>

                        <p className="mt-1 flex items-center gap-1 text-[10px] text-[#96989C]">
                          <Clock size={11} />
                          Deleted{" "}
                          {person.deleted_at
                            ? new Date(person.deleted_at).toLocaleString()
                            : "date unavailable"}
                        </p>
                      </div>
                    </div>

                    <div className="flex shrink-0 flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={
                          restoringId === person.id ||
                          permanentlyDeletingId === person.id
                        }
                        onClick={() => void restorePerson(person)}
                        className={secondaryButtonClass}
                      >
                        {restoringId === person.id ? (
                          <LoaderCircle size={14} className="animate-spin" />
                        ) : (
                          <RotateCcw size={14} />
                        )}
                        Restore
                      </button>

                      <button
                        type="button"
                        disabled={
                          restoringId === person.id ||
                          permanentlyDeletingId === person.id
                        }
                        onClick={() => void permanentlyDeletePerson(person)}
                        aria-label={`Permanently delete ${person.name}`}
                        className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-medium text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {permanentlyDeletingId === person.id ? (
                          <LoaderCircle size={14} className="animate-spin" />
                        ) : (
                          <Trash2 size={14} />
                        )}
                        Delete forever
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end border-t border-[#DFDED8] px-5 py-4 sm:px-6">
              <button
                type="button"
                onClick={() => setTrashOpen(false)}
                className={secondaryButtonClass}
              >
                Close
              </button>
            </div>
          </div>
        </ModalBackdrop>
      )}

      {/* Add person modal */}
      {modalOpen && (
        <ModalBackdrop onClose={closeModal}>
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-person-title"
            className="my-auto max-h-[calc(100dvh-24px)] w-full max-w-lg overflow-y-auto rounded-xl border border-[#DAD9D4] bg-white shadow-2xl sm:max-h-[calc(100dvh-40px)]"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-[#DFDED8] bg-white px-5 py-5 sm:px-6">
              <div>
                <div className="mb-3 inline-flex items-center gap-2 rounded-lg border border-[#DAD9D4] bg-[#FAF9F6] px-3 py-1.5 text-[11px] font-medium text-[#14243D]">
                  <UserRoundPlus size={13} />
                  PAYAT community
                </div>

                <h2
                  id="add-person-title"
                  className="font-serif text-2xl tracking-tight text-[#14243D]"
                >
                  Add a person
                </h2>

                <p className="mt-1 text-xs leading-5 text-[#777A80]">
                  Choose how you want to add this person.
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                disabled={saving}
                aria-label="Close dialog"
                className="rounded-lg p-2 text-[#777A80] transition hover:bg-[#FAF9F6] hover:text-[#14243D] disabled:opacity-50"
              >
                <X size={17} />
              </button>
            </div>

            {/* Add modes */}
            <div className="grid grid-cols-3 gap-2 px-4 pt-5 sm:gap-3 sm:px-6">
              <ModeButton
                active={mode === "registered"}
                onClick={() => {
                  setMode("registered");
                  setError("");
                }}
                icon={<Users size={18} />}
                label="Registered"
              />

              <ModeButton
                active={mode === "invite"}
                onClick={() => {
                  setMode("invite");
                  setError("");
                }}
                icon={<Mail size={18} />}
                label="Invite by email"
              />

              <ModeButton
                active={mode === "manual"}
                onClick={() => {
                  setMode("manual");
                  setError("");
                }}
                icon={<UserRound size={18} />}
                label="Add manually"
              />
            </div>

            {error && (
              <div className="px-5 pt-4 sm:px-6">
                <AlertMessage message={error} onClose={() => setError("")} />
              </div>
            )}

            {mode === "registered" ? (
              <div className="px-5 pb-6 pt-5 sm:px-6">
                <label
                  htmlFor="registered-search"
                  className="mb-2 block text-xs font-medium text-[#252B35]"
                >
                  Search registered PAYAT users
                </label>

                <div className="flex h-11 items-center gap-3 rounded-lg border border-[#DAD9D4] bg-white px-3 transition focus-within:border-[#14243D] focus-within:ring-2 focus-within:ring-[#14243D]/10">
                  <Search size={16} className="shrink-0 text-[#777A80]" />

                  <input
                    id="registered-search"
                    autoFocus
                    value={registeredQuery}
                    onChange={(event) =>
                      setRegisteredQuery(event.target.value)
                    }
                    placeholder="Enter a name or email"
                    className="h-full w-full min-w-0 bg-transparent text-xs text-[#252B35] outline-none placeholder:text-[#96989C]"
                  />

                  {searchingUsers && (
                    <LoaderCircle
                      size={16}
                      className="shrink-0 animate-spin text-[#14243D]"
                    />
                  )}
                </div>

                <div className="mt-3 max-h-64 overflow-y-auto">
                  {registeredQuery.trim().length < 2 ? (
                    <div className="py-8 text-center">
                      <Search
                        size={22}
                        className="mx-auto text-[#96989C]"
                      />
                      <p className="mt-2 text-xs text-[#777A80]">
                        Enter at least 2 characters to search.
                      </p>
                    </div>
                  ) : searchingUsers ? (
                    <div className="flex items-center justify-center gap-2 py-8 text-xs text-[#777A80]">
                      <LoaderCircle
                        size={16}
                        className="animate-spin text-[#14243D]"
                      />
                      Searching users...
                    </div>
                  ) : registeredUsers.length === 0 ? (
                    <div className="py-8 text-center">
                      <p className="text-xs font-medium text-[#14243D]">
                        No matching users found
                      </p>
                      <p className="mt-1 text-xs text-[#777A80]">
                        You can invite them by email instead.
                      </p>
                    </div>
                  ) : (
                    registeredUsers.map((user) => (
                      <div
                        key={user.id}
                        className="flex items-center gap-3 border-b border-[#DFDED8] py-3 last:border-0"
                      >
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#DAD9D4] bg-[#FAF9F6] text-[#14243D]">
                          <UserPlus size={16} />
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-medium text-[#14243D]">
                            {user.name}
                          </p>
                          <p className="mt-1 truncate text-[11px] text-[#777A80]">
                            {user.email}
                          </p>
                        </div>

                        <button
                          type="button"
                          disabled={saving}
                          onClick={() => void linkRegisteredUser(user)}
                          className={`${primaryButtonClass} min-h-9 px-3 py-2`}
                        >
                          {saving ? (
                            <LoaderCircle
                              size={14}
                              className="animate-spin"
                            />
                          ) : (
                            <Plus size={14} />
                          )}
                          {saving ? "Adding..." : "Add"}
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ) : (
              <form
                onSubmit={submitPerson}
                className="space-y-4 px-5 pb-6 pt-5 sm:px-6"
              >
                <div>
                  <label
                    htmlFor="person-name"
                    className="mb-2 block text-xs font-medium text-[#252B35]"
                  >
                    Full name <span className="text-red-500">*</span>
                  </label>

                  <input
                    id="person-name"
                    required
                    maxLength={150}
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Enter their name"
                    className={inputClass}
                  />
                </div>

                {mode === "invite" && (
                  <div>
                    <label
                      htmlFor="person-email"
                      className="mb-2 block text-xs font-medium text-[#252B35]"
                    >
                      Email address <span className="text-red-500">*</span>
                    </label>

                    <input
                      id="person-email"
                      type="email"
                      required
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="name@example.com"
                      className={inputClass}
                    />

                    <p className="mt-2 text-[11px] leading-4 text-[#777A80]">
                      They can register using this email and verify it with the
                      OTP sent during registration.
                    </p>
                  </div>
                )}

                <div>
                  <label
                    htmlFor="person-phone"
                    className="mb-2 block text-xs font-medium text-[#252B35]"
                  >
                    Phone number{" "}
                    <span className="font-normal text-[#96989C]">
                      (optional)
                    </span>
                  </label>

                  <input
                    id="person-phone"
                    type="tel"
                    maxLength={30}
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    placeholder="Enter their phone number"
                    className={inputClass}
                  />
                </div>

                <div className="flex flex-col-reverse gap-2 border-t border-[#DFDED8] pt-4 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={closeModal}
                    disabled={saving}
                    className={secondaryButtonClass}
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={saving}
                    className={primaryButtonClass}
                  >
                    {saving ? (
                      <>
                        <LoaderCircle size={15} className="animate-spin" />
                        {mode === "invite"
                          ? "Sending invitation..."
                          : "Adding person..."}
                      </>
                    ) : (
                      <>
                        {mode === "invite" ? (
                          <Mail size={15} />
                        ) : (
                          <Plus size={15} />
                        )}
                        {mode === "invite" ? "Send invitation" : "Add person"}
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </ModalBackdrop>
      )}
    </main>
  );
}

function AlertMessage({
  message,
  onClose,
}: {
  message: string;
  onClose: () => void;
}) {
  return (
    <div
      role="alert"
      className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-3 text-xs text-red-700"
    >
      <CircleAlert size={16} className="mt-0.5 shrink-0" />
      <p className="min-w-0 flex-1 break-words leading-5">{message}</p>
      <button
        type="button"
        onClick={onClose}
        aria-label="Dismiss error"
        className="rounded-md p-1 hover:bg-red-100"
      >
        <X size={14} />
      </button>
    </div>
  );
}

function LoadingState({ message }: { message: string }) {
  return (
    <div className="flex min-h-48 items-center justify-center gap-3 px-6 py-12 text-xs text-[#777A80]">
      <LoaderCircle size={18} className="animate-spin text-[#14243D]" />
      {message}
    </div>
  );
}

function ModalBackdrop({
  children,
  onClose,
}: {
  children: ReactNode;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto bg-[#14243D]/50 p-3 backdrop-blur-sm sm:p-5"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      {children}
    </div>
  );
}

function ModeButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-h-24 min-w-0 flex-col items-center justify-center gap-2 rounded-lg border px-2 py-3 text-center transition sm:min-h-28 ${
        active
          ? "border-[#14243D] bg-[#FAF9F6] text-[#14243D] ring-1 ring-[#14243D]/5"
          : "border-[#DAD9D4] bg-white text-[#777A80] hover:bg-[#FAF9F6] hover:text-[#14243D]"
      }`}
    >
      {icon}
      <span className="text-[11px] font-medium leading-4 sm:text-xs">
        {label}
      </span>
    </button>
  );
}