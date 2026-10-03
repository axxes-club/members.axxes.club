import { createMailClient } from "./client.js";
import { createDurableComposer } from "./composer.js";
import { createEncryptedDraftCache } from "./drafts.js";
// The composer stores actor-private revisions. It never submits native mail.
export function installDurableCompose({ client, request, state, onError }) {
  const $ = (id) => document.getElementById(id),
    fields = ["to", "cc", "bcc", "subject", "body"];
  let nativeAllowed = false,
    generation = 0,
    activeClient,
    controller,
    cache,
    owner,
    opening = false,
    uploading = false,
    closing = false,
    locked = false,
    timer,
    localTail = Promise.resolve();
  const say = (text) => ($("draft-status").textContent = text);
  const same = (a, b) =>
    a &&
    b &&
    ["actorId", "organizationId", "mailboxId"].every((k) => a[k] === b[k]);
  async function canonical(expected, scopedClient) {
    const organizations = await request("/v1/organizations");
    const organization = organizations.items.find(
      (x) => x.organizationId === expected.organizationId,
    );
    if (!organization)
      throw Object.assign(Error("Your organization access has changed."), {
        status: 403,
      });
    const mailbox = await request(
      "/v1/organizations/" +
        encodeURIComponent(expected.organizationId) +
        "/mailbox",
    );
    if (
      !same(expected, {
        actorId: organization.userId,
        organizationId: organization.organizationId,
        mailboxId: mailbox?.id,
      }) ||
      !["mailbox-created", "verified", "active"].includes(mailbox.stage)
    )
      throw Object.assign(
        Error(
          "Your account or mailbox has changed. Reopen Mail before recovering this draft.",
        ),
        { status: 403 },
      );
    const context = await scopedClient.composition();
    if (!same(expected, context))
      throw Object.assign(
        Error("Your account changed. Reopen Mail before continuing."),
        { status: 403 },
      );
    return expected;
  }
  function controls() {
    const snap = controller?.snapshot(),
      busy = opening || uploading || closing || snap?.busy;
    $("save-draft").disabled = !!busy || locked || !snap;
    $("close-compose").disabled = !!busy;
    $("attachments").disabled = !!busy || locked || !nativeAllowed;
    $("send").disabled = true;
    $("schedule-send").disabled = true;
    for (const button of $("attachment-list").querySelectorAll("button"))
      button.disabled = !!busy || locked;
  }
  function failure(e) {
    if (e.status === 401 || e.status === 403) {
      locked = true;
      fields.forEach((id) => ($(id).value = ""));
      $("attachment-list").replaceChildren();
      onError(e);
    } else say(e.message);
    controls();
  }
  function body() {
    return {
      subject: $("subject").value,
      text: $("body").value,
      to: $("to")
        .value.split(",")
        .map((x) => x.trim())
        .filter(Boolean),
      cc: $("cc")
        .value.split(",")
        .map((x) => x.trim())
        .filter(Boolean),
      bcc: $("bcc")
        .value.split(",")
        .map((x) => x.trim())
        .filter(Boolean),
      attachments: controller?.snapshot()?.body.attachments || [],
    };
  }
  function render(value) {
    for (const name of ["to", "cc", "bcc"])
      $(name).value = (value[name] || []).join(", ");
    $("subject").value = value.subject;
    $("body").value = value.text;
    renderAttachments(value.attachments || []);
  }
  function renderAttachments(items) {
    $("attachment-list").replaceChildren();
    for (const item of items) {
      const li = document.createElement("li");
      li.textContent = item.name + " ";
      const remove = document.createElement("button");
      remove.type = "button";
      remove.textContent = "Remove";
      remove.onclick = () => {
        if (
          locked ||
          uploading ||
          opening ||
          closing ||
          controller?.snapshot()?.busy
        )
          return;
        const value = body();
        value.attachments = value.attachments.filter(
          (x) => x.attachmentId !== item.attachmentId,
        );
        controller.update(value);
        renderAttachments(value.attachments);
        saveSoon();
      };
      li.append(remove);
      $("attachment-list").append(li);
    }
    controls();
  }
  function store() {
    const current = controller,
      token = generation;
    localTail = localTail
      .catch(() => {})
      .then(() => {
        if (token !== generation || current !== controller || locked) return;
        return current.storeLocal();
      });
    return localTail;
  }
  function saveSoon() {
    clearTimeout(timer);
    store()
      .then(() => {
        if (!locked)
          say(
            navigator.onLine
              ? "Saved on this device. Synchronizing…"
              : "Saved encrypted on this device. Reconnect to synchronize.",
          );
      })
      .catch(failure);
    timer = setTimeout(() => {
      if (navigator.onLine) flush();
    }, 900);
  }
  async function flush() {
    if (!controller || locked || uploading) return;
    const current = controller,
      token = generation;
    clearTimeout(timer);
    try {
      await localTail.catch(() => {});
      if (token !== generation || controller !== current || locked) return;
      const result = await current.flush();
      if (token !== generation || controller !== current || locked) return;
      if (result.conflict) {
        $("keep-mine").disabled = true;
        $("keep-mine").onclick = null;
        $("conflict-copy").textContent = "";
        $("draft-conflict").hidden = false;
        say(
          "Another saved version exists. Your edits were retained separately. Review both before continuing.",
        );
      } else {
        say(
          controller.snapshot().dirty
            ? "Saved. Newer edits are waiting to synchronize."
            : "Saved privately to your account.",
        );
        if (controller.snapshot().dirty) timer = setTimeout(flush, 200);
      }
    } catch (e) {
      if (token === generation && controller === current) failure(e);
    } finally {
      controls();
    }
  }
  async function open(mode = "new", id) {
    if (opening || $("composer").open) return;
    const token = ++generation;
    opening = true;
    locked = false;
    state.draft = { opening: true };
    controls();
    const valid = () => {
      if (token !== generation || locked)
        throw Object.assign(Error("Composer access changed."), { status: 403 });
    };
    try {
      const organizations = await request("/v1/organizations");
      valid();
      const org = organizations.items.find(
        (x) => x.organizationId === state.organization,
      );
      if (!org || !state.mailbox)
        throw Error("Choose an active mailbox first.");
      owner = {
        actorId: org.userId,
        organizationId: state.organization,
        mailboxId: state.mailbox.id,
      };
      const expected = { ...owner },
        scopedClient = createMailClient((path, options) =>
          request(path, { ...options, expectedActor: expected.actorId }),
        );
      scopedClient.bind(expected.organizationId, expected.mailboxId);
      activeClient = scopedClient;
      const session = await scopedClient.composition();
      valid();
      if (!same(expected, session) || session.durableDrafts !== true)
        throw Error("Private draft storage is temporarily unavailable.");
      cache = createEncryptedDraftCache(async () => {
        valid();
        const result = await canonical(expected, scopedClient);
        valid();
        return result;
      });
      await cache.connect();
      valid();
      localTail = Promise.resolve();
      let draft = {
        draftId: crypto.randomUUID(),
        body: {
          subject: "",
          text: "",
          to: [],
          cc: [],
          bcc: [],
          attachments: [],
        },
      };
      if (mode === "recover") {
        const local = await cache.latest();
        valid();
        if (!local)
          throw Error(
            "No encrypted draft is available for this account and mailbox.",
          );
        draft = local.value;
        draft.storageRevision = local.revision;
      }
      if (mode === "server") {
        const saved = await scopedClient.readDraft(id);
        valid();
        draft = {
          draftId: saved.draftId,
          revision: saved.revision,
          body: saved.body,
          editVersion: 0,
          savedEditVersion: 0,
        };
      }
      nativeAllowed = session.nativeAttachments === true;
      const identity = session.sender;
      $("from").replaceChildren();
      if (identity) {
        const option = document.createElement("option");
        option.textContent = identity.email;
        option.value = identity.email;
        $("from").append(option);
      } else throw Error("Your mailbox identity is unavailable.");
      $("from").disabled = true;
      const privateCache = cache;
      let writes = Promise.resolve();
      controller = createDurableComposer({
        authorize: async (mode) => {
          valid();
          if (!same(owner, expected)) throw Error("Composer access is locked.");
          if (!mode?.local) {
            await canonical(expected, scopedClient);
            valid();
          }
        },
        writeLocal: (value, revision) => {
          const next = writes
            .catch(() => {})
            .then(() => {
              valid();
              return privateCache.save(value.draftId, value, revision);
            });
          writes = next;
          return next;
        },
        save: (input) => {
          valid();
          return scopedClient.saveRevision(input);
        },
        onChange: controls,
      });
      controller.open(draft);
      state.draft = { durable: true };
      $("draft-form").reset();
      render(draft.body);
      $("draft-conflict").hidden = !draft.conflictRevision;
      $("keep-mine").disabled = true;
      $("keep-mine").onclick = null;
      $("conflict-copy").textContent = "";
      $("draft-status").textContent =
        "Your drafts are private. Mail delivery is not available yet.";
      $("composer").showModal();
      $("to").focus();
    } catch (e) {
      if (token === generation) {
        state.draft = null;
        failure(e);
      }
    } finally {
      if (token === generation) {
        opening = false;
        controls();
      }
    }
  }
  $("compose").onclick = () => open();
  $("recover-draft").onclick = () => open("recover");
  $("personal-drafts").onclick = async () => {
    if (opening || $("composer").open) return;
    const token = generation;
    try {
      const result = await client.listDrafts();
      if (token !== generation) return;
      $("private-draft-list").replaceChildren();
      for (const draft of result.items) {
        const button = document.createElement("button");
        button.textContent =
          "Draft · " + new Date(draft.updatedAt).toLocaleString();
        button.onclick = () => {
          $("private-drafts").close();
          open("server", draft.draftId);
        };
        const row = document.createElement("li");
        row.append(button);
        $("private-draft-list").append(row);
      }
      $("private-drafts-status").textContent = result.items.length
        ? result.hasMore
          ? "Showing your 50 most recent drafts."
          : "Only your private drafts are shown."
        : "No private drafts yet.";
      $("private-drafts").showModal();
    } catch (e) {
      if (token === generation) onError(e);
    }
  };
  $("close-private-drafts").onclick = () => $("private-drafts").close();
  for (const name of fields)
    $(name).addEventListener("input", () => {
      if (locked || !controller || opening) return;
      controller.update(body());
      saveSoon();
    });
  $("save-draft").onclick = flush;
  $("draft-form").onsubmit = (e) => {
    e.preventDefault();
    say("Mail delivery is not available yet. Your draft remains saved.");
  };
  const close = async () => {
    if (opening || uploading || closing || controller?.snapshot()?.busy) return;
    const current = controller,
      token = generation;
    closing = true;
    controls();
    try {
      await store();
      if (token !== generation || controller !== current) return;
      if (!current.close()) return;
      generation++;
      clearTimeout(timer);
      $("composer").close();
      state.draft = null;
    } catch (e) {
      failure(e);
    } finally {
      closing = false;
      controls();
    }
  };
  $("close-compose").onclick = close;
  $("composer").oncancel = (e) => {
    e.preventDefault();
    close();
  };
  $("review-conflict").onclick = async () => {
    const reviewing = controller,
      reviewClient = activeClient,
      draftId = controller?.snapshot()?.draftId;
    if (!draftId || locked) return;
    try {
      const current = await reviewClient.readDraft(draftId);
      if (
        controller !== reviewing ||
        controller.snapshot()?.draftId !== draftId ||
        locked
      )
        return;
      $("conflict-copy").textContent =
        "Current saved version\nTo: " +
        current.body.to.join(", ") +
        "\nCc: " +
        (current.body.cc || []).join(", ") +
        "\nBcc: " +
        (current.body.bcc || []).join(", ") +
        "\nSubject: " +
        current.body.subject +
        "\n\n" +
        current.body.text +
        "\n\nAttachments: " +
        (current.body.attachments || []).map((a) => a.name).join(", ");
      $("keep-mine").disabled = false;
      $("keep-mine").onclick = async () => {
        if (
          controller !== reviewing ||
          controller.snapshot()?.draftId !== draftId ||
          locked
        )
          return;
        try {
          controller.useMine(current.revision);
          $("draft-conflict").hidden = true;
          await flush();
        } catch (e) {
          failure(e);
        }
      };
    } catch (e) {
      failure(e);
    }
  };
  $("attachments").onchange = async (e) => {
    const token = generation,
      uploadClient = activeClient,
      current = controller;
    const files = [...e.target.files];
    if (
      locked ||
      opening ||
      closing ||
      uploading ||
      controller?.snapshot()?.busy
    )
      return;
    if (body().attachments.length + files.length > 8) {
      say("Choose up to 8 attachments.");
      return;
    }
    uploading = true;
    controls();
    try {
      for (const file of files) {
        say("Uploading " + file.name + "…");
        if (token !== generation || locked)
          throw Error("Composer access is locked.");
        const item = await uploadClient.uploadAttachment(file);
        if (token !== generation || controller !== current || locked)
          throw Error("Composer access is locked.");
        if (!item.attachmentId)
          throw Error("This attachment was not registered for private drafts.");
        const value = body();
        value.attachments.push({
          attachmentId: item.attachmentId,
          name: file.name,
        });
        controller.update(value);
        renderAttachments(value.attachments);
        await store();
      }
      saveSoon();
    } catch (e) {
      failure(e);
    } finally {
      uploading = false;
      e.target.value = "";
      controls();
    }
  };
  window.addEventListener("online", () => {
    if (controller?.snapshot() && !locked) flush();
  });
  return {
    lock() {
      generation++;
      locked = true;
      opening = false;
      $("private-drafts").close();
      clearTimeout(timer);
      controls();
    },
  };
}
