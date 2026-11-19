// AUTHORED-BY Claude Opus 5.5
// Fixture agent served at /agents/bank.js: answers every inbox write with a receipt, and reads
// every resource it is notified about, recording what the pod server answered.
export const handlers = {
  async changed(message, context) {
    const read = await context.podFetch(message.url);
    const body = read.ok ? await read.text() : "";
    await context.podFetch(context.podUrl(context.owner, "/outbox/changed.txt"), {
      body: `${message.activity} ${read.status} ${body}`,
      headers: { "content-type": "text/plain" },
      method: "PUT",
    });
  },
  async inbox(message, context) {
    await context.podFetch(context.podUrl(context.owner, "/outbox/receipt.txt"), {
      body: `received ${message.path} from ${message.from.org}`,
      headers: { "content-type": "text/plain" },
      method: "PUT",
    });
    context.note({ kind: "org-to-org", org: context.app, text: `handled ${message.path}` });
  },
};
