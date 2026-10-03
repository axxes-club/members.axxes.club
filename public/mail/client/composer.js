// Composition state has no provider side effects. An uncertain revision save
// keeps its exact operation/body until idempotent replay resolves the result.
export function createDurableComposer(deps) {
  const uuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    integer = (n) => Number.isInteger(n) && n >= 0 && n <= 2147483647;
  let draft = null,
    inFlight = null;
  const clone = (value) => structuredClone(value),
    snapshot = () =>
      draft
        ? clone({
            ...draft,
            busy: !!inFlight,
            dirty: draft.editVersion > draft.savedEditVersion,
          })
        : null;
  const body = (value) => {
    const clean = clone(value),
      text = JSON.stringify(clean);
    if (
      !clean ||
      typeof clean !== "object" ||
      Array.isArray(clean) ||
      new TextEncoder().encode(text).length > 262144
    )
      throw Error("Draft exceeds the current limit.");
    return clean;
  };
  const notify = () => deps.onChange?.(snapshot());
  async function persist(current) {
    if (draft !== current) throw Error("Composer context changed.");
    if (current.storageRevision >= 2147483647)
      throw Error("Local draft revision limit reached.");
    current.storageRevision++;
    await deps.writeLocal(clone(current), current.storageRevision);
    if (draft !== current) throw Error("Composer context changed.");
  }
  return {
    snapshot,
    open(input) {
      if (inFlight)
        throw Error("Wait for the current save before opening another draft.");
      if (!uuid.test(input.draftId) || !integer(input.revision ?? 0))
        throw Error("Invalid draft reference.");
      const pending = input.pending ? clone(input.pending) : null;
      if (
        pending &&
        (!uuid.test(pending.operationId) ||
          !integer(pending.expectedRevision) ||
          !integer(pending.editVersion))
      )
        throw Error("Invalid recovered operation.");
      const next = {
        draftId: input.draftId,
        body: body(input.body),
        revision: input.revision ?? 0,
        editVersion: input.editVersion ?? 1,
        savedEditVersion: input.savedEditVersion ?? 0,
        storageRevision: input.storageRevision ?? 0,
        conflictRevision: input.conflictRevision ?? null,
        pending,
      };
      if (
        !integer(next.editVersion) ||
        !integer(next.savedEditVersion) ||
        !integer(next.storageRevision) ||
        next.savedEditVersion > next.editVersion ||
        (next.conflictRevision !== null &&
          (!integer(next.conflictRevision) || next.conflictRevision < 1)) ||
        (pending && pending.editVersion > next.editVersion)
      )
        throw Error("Invalid recovered revision.");
      if (pending) pending.body = body(pending.body);
      draft = next;
      notify();
      return snapshot();
    },
    update(value) {
      if (!draft) throw Error("Open a draft first.");
      if (draft.editVersion >= 2147483647)
        throw Error("Draft edit limit reached.");
      draft.body = body(value);
      draft.editVersion++;
      notify();
    },
    flush() {
      if (inFlight) return inFlight;
      if (!draft) return Promise.reject(Error("Open a draft first."));
      if (draft.conflictRevision)
        return Promise.reject(
          Error("Review the retained conflicting draft before saving again."),
        );
      if (draft.editVersion === draft.savedEditVersion && !draft.pending)
        return Promise.resolve({ revision: draft.revision, conflict: false });
      const current = draft;
      inFlight = Promise.resolve()
        .then(async () => {
          await deps.authorize();
          if (draft !== current) throw Error("Composer context changed.");
          if (!current.pending)
            current.pending = {
              operationId: crypto.randomUUID(),
              expectedRevision: current.revision,
              body: clone(current.body),
              editVersion: current.editVersion,
            };
          const frozen = clone(current.pending);
          await persist(current);
          const result = await deps.save({
            draftId: current.draftId,
            operationId: frozen.operationId,
            expectedRevision: frozen.expectedRevision,
            body: frozen.body,
          });
          if (draft !== current) throw Error("Composer context changed.");
          if (
            !result ||
            !integer(result.revision) ||
            result.revision < 1 ||
            typeof result.conflict !== "boolean"
          )
            throw Error("Draft save status is unknown.");
          if (result.conflict) {
            current.conflictRevision = result.revision;
            current.pending = null;
          } else {
            current.revision = result.revision;
            current.savedEditVersion = frozen.editVersion;
            current.pending = null;
          }
          await persist(current);
          return result;
        })
        .finally(() => {
          inFlight = null;
          notify();
        });
      notify();
      return inFlight;
    },
    async storeLocal() {
      if (!draft) throw Error("Open a draft first.");
      const current = draft;
      await deps.authorize({ local: true });
      return persist(current);
    },
    useMine(currentRevision) {
      if (
        !draft ||
        inFlight ||
        !draft.conflictRevision ||
        !integer(currentRevision) ||
        currentRevision < 1
      )
        throw Error(
          "Read the current server draft before resolving this conflict.",
        );
      draft.revision = currentRevision;
      draft.conflictRevision = null;
      draft.pending = null;
      draft.savedEditVersion = 0;
      notify();
    },
    close() {
      if (inFlight) return false;
      draft = null;
      notify();
      return true;
    },
  };
}
