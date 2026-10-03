"use client";
import { useEffect, useState } from "react";
import { Puck, type Data } from "@puckeditor/core";
import "@puckeditor/core/puck.css";
import "./editor.css";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import {
  AlertTriangle,
  Check,
  ChevronDown,
  ExternalLink,
  Eye,
  Globe,
  History,
  Loader2,
  RefreshCw,
  Save,
  ShoppingBag,
  Upload,
} from "lucide-react";
import { gangstarzConfig } from "@/lib/puck/gangstarz";
import { toPuck, fromPuck } from "@/lib/website/gangstarz-adapter";
import type { SiteSnapshotV1 } from "@/lib/website/schema";
export function GangstarzEditor() {
  const [snapshot, setSnapshot] = useState<SiteSnapshotV1 | null>(null);
  const [data, setData] = useState<Data | null>(null);
  const [message, setMessage] = useState("Loading Gangstarz workspace…");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [confirmReload, setConfirmReload] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [revisions, setRevisions] = useState<
    { revision: number; created_at: string }[]
  >([]);
  const [key, setKey] = useState(0);

  function reportError(error: unknown) {
    setError(
      error instanceof Error ? error.message : "Unable to complete action",
    );
  }

  async function load() {
    const res = await fetch("/api/v1/website/gangstarz", { cache: "no-store" });
    const body = await res.json();
    if (!res.ok) throw new Error(body.error);
    setSnapshot(body.data);
    setData(toPuck(body.data));
    setRevisions(body.revisions);
    setDirty(false);
    setError(null);
    setKey((k) => k + 1);
    setMessage("Draft loaded. Publish when you are ready.");
  }

  useEffect(() => {
    load()
      .catch(reportError)
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (dirty) e.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  async function action(action: string, revision?: number) {
    if (!snapshot || !data || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/website/gangstarz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          revision,
          expectedRevision: snapshot.revision,
          data: action === "save" ? fromPuck(data, snapshot) : undefined,
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error);
      if (action === "save") {
        setSnapshot((s) => (s ? { ...s, revision: body.revision } : s));
        setRevisions((previous) => [
          { revision: body.revision, created_at: new Date().toISOString() },
          ...previous,
        ]);
        setDirty(false);
        setMessage("Draft saved. The live site has not changed.");
      } else if (action === "publish")
        setMessage("Published to gangstarz.axxes.club.");
      else if (action === "unpublish") setMessage("Website unpublished.");
      else await load();
    } catch (error) {
      reportError(error);
    } finally {
      setBusy(false);
    }
  }

  async function reload() {
    setBusy(true);
    setError(null);
    try {
      await load();
    } catch (error) {
      reportError(error);
    } finally {
      setBusy(false);
      setLoading(false);
    }
  }
  return (
    <section
      aria-label="Gangstarz website editor"
      className="members-website-editor flex min-h-[560px] h-[calc(100dvh-7rem)] flex-col overflow-hidden border bg-background text-foreground lg:h-[calc(100dvh-4rem)]"
    >
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-4 border-b px-4 py-4 sm:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center border bg-card text-muted-foreground">
            <Globe className="size-4" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h1 className="text-sm font-semibold tracking-tight">
              Gangstarz website
            </h1>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Brand, pages, events, gallery &amp; shop
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/website/gangstarz/commerce">
              <ShoppingBag aria-hidden="true" />
              Commerce
            </Link>
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <a
              href="https://gangstarz.axxes.club"
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink aria-hidden="true" />
              View website
            </a>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <a
              href="https://gangstarz.axxes.club/preview/home"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Eye aria-hidden="true" />
              Preview saved draft
            </a>
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={busy || !snapshot || !dirty}
            onClick={() => action("save")}
          >
            <Save aria-hidden="true" />
            Save draft
          </Button>
          <Button
            size="sm"
            disabled={busy || dirty || !snapshot}
            title={dirty ? "Save your draft before publishing" : undefined}
            onClick={() => action("publish")}
          >
            <Upload aria-hidden="true" />
            Publish
          </Button>
        </div>
      </header>
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b bg-card px-4 py-2.5 text-xs sm:px-5">
        <p
          role="status"
          aria-live="polite"
          className="flex min-w-0 items-center gap-2 text-muted-foreground"
        >
          {busy || loading ? (
            <Loader2
              className="size-3.5 shrink-0 animate-spin"
              aria-hidden="true"
            />
          ) : error || !snapshot ? (
            <AlertTriangle className="size-3.5 shrink-0" aria-hidden="true" />
          ) : dirty ? (
            <span className="size-1.5 shrink-0 bg-warning" aria-hidden="true" />
          ) : (
            <Check className="size-3.5 shrink-0" aria-hidden="true" />
          )}
          <span>
            {busy
              ? "Updating website…"
              : error
                ? error
                : dirty
                  ? "Unsaved changes — save your draft before publishing."
                  : message}
          </span>
        </p>
        {snapshot && (
          <Badge
            variant="outline"
            className="shrink-0 text-[10px] font-normal text-muted-foreground"
          >
            Draft · Revision {snapshot.revision}
          </Badge>
        )}
      </div>
      {snapshot && data ? (
        <>
          <div
            className="members-website-puck min-h-0 flex-1 overflow-hidden"
            aria-busy={busy}
            inert={busy}
          >
            <Puck
              key={key}
              config={gangstarzConfig}
              data={data}
              headerTitle="Page editor"
              headerPath=""
              onChange={(d) => {
                setData(d);
                setDirty(true);
              }}
              onPublish={() => action("save")}
              overrides={{
                headerActions: () => (
                  <span className="px-2 text-xs text-muted-foreground">
                    Select a section to edit
                  </span>
                ),
              }}
            />
          </div>
          <details className="group shrink-0 border-t bg-card">
            <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-ring sm:px-5">
              <History className="size-3.5" aria-hidden="true" />
              Revision history &amp; publishing options
              <ChevronDown
                className="ml-auto size-3.5 transition-transform group-open:rotate-180"
                aria-hidden="true"
              />
            </summary>
            <div className="max-h-52 overflow-y-auto border-t px-4 py-4 sm:px-5">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy}
                  onClick={() =>
                    dirty ? setConfirmReload(true) : void reload()
                  }
                >
                  <RefreshCw aria-hidden="true" />
                  Reload saved draft
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive hover:text-destructive"
                  disabled={busy}
                  onClick={() => action("unpublish")}
                >
                  Unpublish website
                </Button>
              </div>
              {revisions.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  Your saved revisions will appear here.
                </p>
              ) : (
                <ul className="divide-y border">
                  {revisions.map((r) => (
                    <li
                      key={r.revision}
                      className="flex flex-wrap items-center justify-between gap-3 px-3 py-2.5"
                    >
                      <div>
                        <p className="text-xs font-medium">
                          Revision {r.revision}
                        </p>
                        <p className="mt-1 text-[11px] text-muted-foreground">
                          {new Date(r.created_at).toLocaleString()}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busy || dirty}
                        title={
                          dirty
                            ? "Save your changes before restoring a revision"
                            : undefined
                        }
                        onClick={() => action("restore", r.revision)}
                      >
                        Restore as draft
                        <span className="sr-only"> revision {r.revision}</span>
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </details>
        </>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
          {loading ? (
            <>
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Loading your website workspace…
              </p>
            </>
          ) : (
            <>
              <Globe className="mb-1 size-8 text-muted-foreground" />
              <h2 className="text-sm font-medium">
                Unable to open your website
              </h2>
              <p className="max-w-sm text-xs text-muted-foreground">
                {error || message}
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setLoading(true);
                  void reload();
                }}
              >
                <RefreshCw aria-hidden="true" />
                Try again
              </Button>
            </>
          )}
        </div>
      )}
      <AlertDialog open={confirmReload} onOpenChange={setConfirmReload}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reload the saved draft?</AlertDialogTitle>
            <AlertDialogDescription>
              Your unsaved changes will be discarded. The latest saved draft and
              revision history will be loaded. Your live website will stay
              unchanged.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep editing</AlertDialogCancel>
            <AlertDialogAction onClick={() => void reload()}>
              Discard changes &amp; reload
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
