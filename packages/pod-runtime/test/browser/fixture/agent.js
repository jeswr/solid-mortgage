// AUTHORED-BY Claude Opus 5.5
// Fixture agent served at /agents/bank.js: answers every inbox write with a receipt.
export const handlers = {
  async inbox(message, context) {
    await context.podFetch(context.podUrl(context.owner, "/outbox/receipt.txt"), {
      body: `received ${message.path} from ${message.from.org}`,
      headers: { "content-type": "text/plain" },
      method: "PUT",
    });
    context.note({ kind: "org-to-org", org: context.app, text: `handled ${message.path}` });
  },
};
