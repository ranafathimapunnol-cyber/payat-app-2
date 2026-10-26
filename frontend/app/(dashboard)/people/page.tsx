"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
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
};

type RegisteredUser = {
  id: number;
  name: string;
  email: string;
};

type AddMode = "registered" | "invite" | "manual";

export default function PeoplePage() {
  const [people, setPeople] = useState<Person[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [mode, setMode] = useState<AddMode>("registered");

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [registeredQuery, setRegisteredQuery] = useState("");
  const [registeredUsers, setRegisteredUsers] = useState<RegisteredUser[]>([]);
  const [searchingUsers, setSearchingUsers] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
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

      setPeople(Array.isArray(data) ? data : data.results ?? []);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load people.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPeople();
  }, [loadPeople]);

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
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "User search failed.");
          setRegisteredUsers([]);
        }
      } finally {
        if (!cancelled) setSearchingUsers(false);
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
      `Remove ${person.name} from your people list?`
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

      setPeople((current) => current.filter((item) => item.id !== person.id));
      setNotice(`${person.name} was removed.`);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to remove this person."
      );
    } finally {
      setDeletingId(null);
    }
  }

  function statusLabel(status: Person["status"]) {
    if (status === "DECEASED") return "Deceased";
    if (status === "CLOSED") return "Closed";
    return "Active";
  }

  function resetSearch() {
    setSearch("");
  }

  return (
    <section className="min-h-screen overflow-x-hidden bg-slate-50 text-slate-800">
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
        {/* Page heading */}
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#dce4f0] bg-white px-3 py-1.5 text-xs font-semibold text-[#172b4d]">
              <UsersRound size={14} />
              Your PAYAT community
            </div>

            <h1 className="text-3xl font-semibold tracking-tight text-[#172b4d] sm:text-4xl">
              People
            </h1>

            <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500 sm:text-base">
              Organise your contacts, connect with registered users, and keep
              each person&apos;s PAYAT details together.
            </p>
          </div>

          <button
            type="button"
            onClick={openModal}
            className="inline-flex w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-[#172b4d] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#233e68] focus:outline-none focus:ring-4 focus:ring-blue-900/15 sm:w-auto"
          >
            <Plus size={18} />
            Add a person
          </button>
        </div>

        {/* Notifications */}
        {notice && (
          <div
            role="status"
            className="mt-6 flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-[#172b4d]"
          >
            <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
            <p className="min-w-0 flex-1">{notice}</p>
            <button
              type="button"
              onClick={() => setNotice("")}
              aria-label="Dismiss notification"
              className="rounded-md p-1 hover:bg-blue-100"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {error && !modalOpen && (
          <div
            role="alert"
            className="mt-6 flex items-start gap-3 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            <CircleAlert size={18} className="mt-0.5 shrink-0" />
            <p className="min-w-0 flex-1 break-words">{error}</p>
            <button
              type="button"
              onClick={() => setError("")}
              aria-label="Dismiss error"
              className="rounded-md p-1 hover:bg-red-100"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* Search and count */}
        <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex w-full min-w-0 items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 transition focus-within:border-[#172b4d] focus-within:ring-4 focus-within:ring-blue-900/5 sm:max-w-lg">
            <Search size={19} className="shrink-0 text-slate-400" />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by name, phone, email or address"
              aria-label="Search people"
              className="w-full min-w-0 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
            />
            {search && (
              <button
                type="button"
                onClick={resetSearch}
                aria-label="Clear search"
                className="shrink-0 rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X size={16} />
              </button>
            )}
          </div>

          <div className="flex items-center justify-between gap-3 sm:justify-end">
            <span className="text-sm text-slate-500">
              Showing{" "}
              <span className="font-semibold text-[#172b4d]">
                {filteredPeople.length}
              </span>{" "}
              {filteredPeople.length === 1 ? "person" : "people"}
            </span>
          </div>
        </div>

        {/* People list */}
        <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 bg-white px-4 py-4 sm:px-6">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#eef2f8] text-[#172b4d]">
                <Users size={18} />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-[#172b4d]">
                  Your people
                </h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  Contact list and PAYAT connections
                </p>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex min-h-64 items-center justify-center gap-3 px-6 py-16 text-sm text-slate-500">
              <LoaderCircle size={20} className="animate-spin text-[#172b4d]" />
              Loading people...
            </div>
          ) : filteredPeople.length === 0 ? (
            <div className="px-5 py-16 text-center sm:px-6 sm:py-20">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-[#e1e8f2] bg-[#f2f5fa] text-[#172b4d]">
                {search ? <Search size={27} /> : <Users size={27} />}
              </div>

              <h2 className="mt-5 text-lg font-semibold text-[#172b4d]">
                {search ? "No people found" : "Your community starts here"}
              </h2>

              <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">
                {search
                  ? "Try a different name, phone number, email or address."
                  : "Add a registered user, invite someone by email, or create a contact manually."}
              </p>

              {search ? (
                <button
                  type="button"
                  onClick={resetSearch}
                  className="mt-5 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-[#172b4d] transition hover:bg-slate-50"
                >
                  Clear search
                </button>
              ) : (
                <button
                  type="button"
                  onClick={openModal}
                  className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#172b4d] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#233e68]"
                >
                  <Plus size={17} />
                  Add your first person
                </button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredPeople.map((person) => (
                <div
                  key={person.id}
                  className="flex min-w-0 items-center gap-3 px-3 py-4 transition hover:bg-slate-50 sm:gap-4 sm:px-6"
                >
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[#e1e8f2] bg-[#eef2f8] text-sm font-semibold text-[#172b4d]">
                    {person.profile_picture ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={
                          person.profile_picture.startsWith("http")
                            ? person.profile_picture
                            : `${(
                                process.env.NEXT_PUBLIC_API_BASE_URL ||
                                "http://localhost:8000"
                              ).replace(/\/+$/, "")}/${person.profile_picture.replace(/^\/+/, "")}`
                        }
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      (person.name.trim()[0] || "?").toUpperCase()
                    )}
                  </div>

                  <a href={`/people/${person.id}`} className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-900 transition hover:text-[#172b4d]">
                      {person.name}
                    </p>
                    <p className="mt-1 flex min-w-0 items-center gap-1.5 truncate text-xs text-slate-500">
                      <Phone size={12} className="shrink-0" />
                      <span className="truncate">
                        {person.phone ||
                          person.invited_email ||
                          person.email ||
                          "No contact details"}
                      </span>
                    </p>
                    {person.address && (
                      <p className="mt-1 truncate text-xs text-slate-400">
                        {person.address}
                      </p>
                    )}
                  </a>

                  <div className="hidden shrink-0 sm:block">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
                        person.status === "ACTIVE"
                          ? "bg-[#eef2f8] text-[#172b4d]"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          person.status === "ACTIVE"
                            ? "bg-[#172b4d]"
                            : "bg-slate-400"
                        }`}
                      />
                      {statusLabel(person.status)}
                    </span>
                  </div>

                  {person.linked_user && (
                    <span className="hidden shrink-0 items-center gap-1 text-xs font-medium text-[#233e68] md:inline-flex">
                      <UserCheck size={14} />
                      Registered
                    </span>
                  )}

                  <a
                    href={`/people/${person.id}`}
                    aria-label={`View ${person.name}`}
                    className="shrink-0 rounded-lg p-2 text-slate-400 transition hover:bg-[#eef2f8] hover:text-[#172b4d]"
                  >
                    <ArrowRight size={17} />
                  </a>

                  <button
                    type="button"
                    disabled={deletingId === person.id}
                    onClick={() => void deletePerson(person)}
                    aria-label={`Remove ${person.name}`}
                    title="Remove person"
                    className="shrink-0 rounded-lg p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                  >
                    {deletingId === person.id ? (
                      <LoaderCircle size={17} className="animate-spin" />
                    ) : (
                      <Trash2 size={17} />
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-slate-400">
          PAYAT · Your community, organised with care
        </p>
      </div>

      {/* Add person modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-[#101d33]/60 p-3 backdrop-blur-sm sm:p-5"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeModal();
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-person-title"
            className="my-auto max-h-[calc(100dvh-24px)] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl sm:max-h-[calc(100dvh-40px)]"
          >
            <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-100 bg-white px-5 py-5 sm:px-6">
              <div>
                <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-[#eef2f8] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-[#172b4d]">
                  <UserRoundPlus size={13} />
                  Community
                </div>
                <h2
                  id="add-person-title"
                  className="text-xl font-semibold tracking-tight text-[#172b4d]"
                >
                  Add a person
                </h2>
                <p className="mt-1 text-sm leading-5 text-slate-500">
                  Choose how you want to add this person.
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                disabled={saving}
                aria-label="Close dialog"
                className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
              >
                <X size={19} />
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
                icon={<Users size={20} />}
                label="Registered"
              />
              <ModeButton
                active={mode === "invite"}
                onClick={() => {
                  setMode("invite");
                  setError("");
                }}
                icon={<Mail size={20} />}
                label="Invite by email"
              />
              <ModeButton
                active={mode === "manual"}
                onClick={() => {
                  setMode("manual");
                  setError("");
                }}
                icon={<UserRound size={20} />}
                label="Add manually"
              />
            </div>

            {error && (
              <div
                role="alert"
                className="mx-5 mt-4 flex items-start gap-2 rounded-xl border border-red-100 bg-red-50 px-3 py-3 text-sm text-red-700 sm:mx-6"
              >
                <CircleAlert size={17} className="mt-0.5 shrink-0" />
                <p className="min-w-0 flex-1 break-words">{error}</p>
              </div>
            )}

            {mode === "registered" ? (
              <div className="px-5 pb-6 pt-5 sm:px-6">
                <label
                  htmlFor="registered-search"
                  className="text-sm font-medium text-slate-700"
                >
                  Search registered PAYAT users
                </label>

                <div className="mt-2 flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3.5 py-3 transition focus-within:border-[#172b4d] focus-within:ring-4 focus-within:ring-blue-900/5">
                  <Search size={18} className="shrink-0 text-slate-400" />
                  <input
                    id="registered-search"
                    autoFocus
                    value={registeredQuery}
                    onChange={(event) =>
                      setRegisteredQuery(event.target.value)
                    }
                    placeholder="Enter a name or email"
                    className="w-full min-w-0 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
                  />
                  {searchingUsers && (
                    <LoaderCircle
                      size={17}
                      className="shrink-0 animate-spin text-[#172b4d]"
                    />
                  )}
                </div>

                <div className="mt-3 max-h-64 overflow-y-auto">
                  {registeredQuery.trim().length < 2 ? (
                    <div className="py-8 text-center">
                      <Search
                        size={23}
                        className="mx-auto text-slate-300"
                      />
                      <p className="mt-2 text-sm text-slate-500">
                        Enter at least 2 characters to search.
                      </p>
                    </div>
                  ) : searchingUsers ? (
                    <div className="flex items-center justify-center gap-2 py-8 text-sm text-slate-500">
                      <LoaderCircle
                        size={17}
                        className="animate-spin text-[#172b4d]"
                      />
                      Searching users...
                    </div>
                  ) : registeredUsers.length === 0 ? (
                    <div className="py-8 text-center">
                      <p className="text-sm font-medium text-slate-700">
                        No matching users found
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        You can invite them by email instead.
                      </p>
                    </div>
                  ) : (
                    registeredUsers.map((user) => (
                      <div
                        key={user.id}
                        className="flex items-center gap-3 border-b border-slate-100 py-3 last:border-0"
                      >
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#eef2f8] text-[#172b4d]">
                          <UserPlus size={18} />
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-slate-900">
                            {user.name}
                          </p>
                          <p className="truncate text-xs text-slate-500">
                            {user.email}
                          </p>
                        </div>

                        <button
                          type="button"
                          disabled={saving}
                          onClick={() => void linkRegisteredUser(user)}
                          className="shrink-0 rounded-lg bg-[#172b4d] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#233e68] disabled:opacity-50"
                        >
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
                    className="text-sm font-medium text-slate-700"
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
                    className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#172b4d] focus:ring-4 focus:ring-blue-900/5"
                  />
                </div>

                {mode === "invite" && (
                  <div>
                    <label
                      htmlFor="person-email"
                      className="text-sm font-medium text-slate-700"
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
                      className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#172b4d] focus:ring-4 focus:ring-blue-900/5"
                    />
                    <p className="mt-1.5 text-xs leading-5 text-slate-500">
                      They can register using this email and verify it with
                      the OTP sent during registration.
                    </p>
                  </div>
                )}

                <div>
                  <label
                    htmlFor="person-phone"
                    className="text-sm font-medium text-slate-700"
                  >
                    Phone number{" "}
                    <span className="font-normal text-slate-400">
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
                    className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#172b4d] focus:ring-4 focus:ring-blue-900/5"
                  />
                </div>

                <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={closeModal}
                    disabled={saving}
                    className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#172b4d] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#233e68] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {saving ? (
                      <>
                        <LoaderCircle size={17} className="animate-spin" />
                        {mode === "invite"
                          ? "Sending invitation..."
                          : "Adding person..."}
                      </>
                    ) : (
                      <>
                        {mode === "invite" ? (
                          <Mail size={17} />
                        ) : (
                          <Plus size={17} />
                        )}
                        {mode === "invite" ? "Send invitation" : "Add person"}
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </section>
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
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-h-24 min-w-0 flex-col items-center justify-center gap-2 rounded-xl border px-2 py-3 text-center transition sm:min-h-28 ${
        active
          ? "border-[#172b4d] bg-[#eef2f8] text-[#132037] shadow-sm"
          : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
      }`}
    >
      {icon}
      <span className="text-xs font-semibold leading-4 sm:text-sm">
        {label}
      </span>
    </button>
  );
}
