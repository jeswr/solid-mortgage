import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { afterEach, describe, expect, it } from "vitest";
import {
  ActivityLog,
  describePath,
  parseAclRules,
  startPodRecorder,
} from "../scripts/demo/activity.ts";

const LENDER = "https://lender.example/orgs/underwriting#id";
const SERVICER = "https://servicer.example/orgs/servicing#id";
const OWNER = "https://localhost:1/profile#me";
const directory = new Map([
  [LENDER, "Primary lender"],
  [SERVICER, "Loan servicer"],
  [OWNER, "Alex Rivera (borrower)"],
]);

const acl = (agents: string[]) => `
@prefix acl: <http://www.w3.org/ns/auth/acl#>.
<#owner> a acl:Authorization; acl:agent <${OWNER}>; acl:accessTo <./closing-record>;
  acl:mode acl:Read, acl:Write, acl:Control.
${agents
  .map(
    (agent, index) =>
      `<#reader${index}> a acl:Authorization; acl:agent <${agent}>; acl:accessTo <./closing-record>; acl:mode acl:Read.`,
  )
  .join("\n")}`;

describe("demo pod activity", () => {
  it("parses WAC documents into labelled rules", () => {
    const rules = parseAclRules(
      acl([LENDER]),
      "http://pod.test/mortgage/closing-record.acl",
      directory,
    );
    expect(rules).toEqual(
      expect.arrayContaining([
        {
          agent: OWNER,
          modes: ["Control", "Read", "Write"],
          scope: "this resource",
          who: "Alex Rivera (borrower)",
        },
        { agent: LENDER, modes: ["Read"], scope: "this resource", who: "Primary lender" },
      ]),
    );
    expect(parseAclRules("not turtle <", "http://pod.test/x.acl", directory)).toBeUndefined();
  });

  it("names pod paths in plain language", () => {
    expect(describePath("/mortgage/credentials/income")).toBe("employment and income credential");
    expect(describePath("/mortgage/closing-record.acl")).toBe("closing record");
    expect(describePath("/mortgage/")).toBe("folder /mortgage/");
  });

  describe("recorder", () => {
    let pod: Server | undefined;
    let recorder: Server | undefined;
    afterEach(() => {
      pod?.close();
      recorder?.close();
    });

    it("logs reads, writes and the access-rule diff of each ACL write", async () => {
      const store = new Map<string, string>();
      pod = createServer((request, response) => {
        const chunks: Buffer[] = [];
        request.on("data", (chunk: Buffer) => chunks.push(chunk));
        request.on("end", () => {
          const path = request.url ?? "/";
          if (request.method === "PUT") {
            store.set(path, Buffer.concat(chunks).toString("utf8"));
            response.writeHead(201).end();
          } else if (store.has(path)) {
            response.writeHead(200, { "content-type": "text/turtle" }).end(store.get(path));
          } else {
            response.writeHead(404).end();
          }
        });
      });
      await new Promise<void>((done) => pod?.listen(0, "127.0.0.1", done));
      const podPort = (pod.address() as AddressInfo).port;
      const probe = createServer();
      await new Promise<void>((done) => probe.listen(0, "127.0.0.1", done));
      const listenPort = (probe.address() as AddressInfo).port;
      await new Promise<void>((done) => probe.close(() => done()));

      const log = new ActivityLog();
      let muted = true;
      recorder = await startPodRecorder({
        listenPort,
        podPort,
        log,
        directory,
        attributeServerCall: () => "Digital Closing",
        browserOrigins: new Map([["http://127.0.0.1:4401", "Data Vault"]]),
        isMuted: () => muted,
      });
      const base = `http://127.0.0.1:${listenPort}`;
      const put = (path: string, body: string) =>
        fetch(`${base}${path}`, {
          method: "PUT",
          headers: { "content-type": "text/turtle" },
          body,
        });

      // Seeding is muted but still establishes the baseline rules.
      await put("/mortgage/closing-record.acl", acl([LENDER]));
      muted = false;
      await put("/mortgage/closing-record", "<#it> a <#Record>.");
      await fetch(`${base}/mortgage/closing-record`, {
        headers: { origin: "http://127.0.0.1:4401" },
      });
      await put("/mortgage/closing-record.acl", acl([SERVICER]));

      const events = log.all();
      expect(events.map((event) => event.kind)).toEqual(["write", "read", "access"]);
      expect(events[0]).toMatchObject({
        app: "Digital Closing",
        summary: "Digital Closing saved Alex's closing record",
      });
      expect(events[1]).toMatchObject({
        actor: "Alex Rivera (in the browser)",
        app: "Data Vault",
        summary: "Alex read the closing record",
      });
      const change = events[2];
      expect(change?.summary).toBe(
        "Digital Closing changed permissions on Alex's closing record: granted Loan servicer read access; removed Primary lender's read access",
      );
      expect(change?.access?.granted.map((rule) => rule.agent)).toEqual([SERVICER]);
      expect(change?.access?.revoked.map((rule) => rule.agent)).toEqual([LENDER]);
    });
  });
});
