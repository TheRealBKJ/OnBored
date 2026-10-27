import type { AppState } from './types'

const d = (daysAgo: number) => new Date(Date.now() - daysAgo * 86400000).toISOString()

// Fictional company: "Relay", a freight-dispatch startup. All data is demo data.
export const seed: AppState = {
  currentUserId: 'u-sam',
  users: [
    { id: 'u-priya', name: 'Priya Raman', role: 'senior', title: 'Staff Engineer', team: 'Dispatch', track: 'Backend', color: '#7c5cff' },
    { id: 'u-marcus', name: 'Marcus Chen', role: 'senior', title: 'Senior Engineer', team: 'Web', track: 'Frontend', color: '#e0730d' },
    { id: 'u-dana', name: 'Dana Okafor', role: 'senior', title: 'Platform Lead', team: 'Platform', track: 'Platform', color: '#0f9d76' },
    { id: 'u-sam', name: 'Sam Rivera', role: 'new', title: 'Software Engineer I', team: 'Dispatch', track: 'Backend', color: '#2f7de1', startDate: d(9) },
    { id: 'u-alex', name: 'Alex Kim', role: 'new', title: 'SWE Intern', team: 'Web', track: 'Frontend', color: '#d43f6a', startDate: d(3) },
  ],

  areas: [
    {
      id: 'a-gateway', name: 'API Gateway', path: 'services/gateway', depth: 'core', ownerId: 'u-dana',
      description: 'Single entry point for all client traffic. Auth, rate limiting, request routing to internal services.',
      why: 'We consolidated three public APIs into one gateway in 2024 so auth and rate limits live in exactly one place. See ADR-007.',
      dependsOn: ['a-auth'], gotchas: ['Route config is generated, so edit routes.yaml, not routes.gen.ts', 'Local dev needs the mock auth service running'],
    },
    {
      id: 'a-dispatch', name: 'Dispatch Engine', path: 'services/dispatch', depth: 'core', ownerId: 'u-priya',
      description: 'Matches loads to carriers. Scoring, assignment, and the event log every other service reads from.',
      why: 'Built event-sourced so we can replay any assignment decision when a carrier disputes it. Disputes were 40% of support tickets before.',
      dependsOn: ['a-db', 'a-queue'], gotchas: ['Never mutate an event, always append a correcting event', 'Scoring weights live in config, not code'],
    },
    {
      id: 'a-billing', name: 'Billing', path: 'services/billing', depth: 'supporting', ownerId: 'u-priya',
      description: 'Invoices, carrier payouts and the Stripe integration.',
      why: 'Kept as a separate service so finance can ship changes on their own release cadence and audits have a narrow surface.',
      dependsOn: ['a-db', 'a-queue'], gotchas: ['Money is integer cents everywhere. No floats.', 'Payout jobs are idempotent by design; keep them that way'],
    },
    {
      id: 'a-web', name: 'Web App', path: 'apps/web', depth: 'core', ownerId: 'u-marcus',
      description: 'Shipper and carrier dashboards. React + TypeScript, talks only to the gateway.',
      why: 'One app with role-based routes instead of two apps. Shippers and carriers share 70% of components.',
      dependsOn: ['a-gateway', 'a-ui'], gotchas: ['Feature flags come from the gateway at boot', 'Do not call internal services directly from the browser'],
    },
    {
      id: 'a-ui', name: 'UI Kit', path: 'packages/ui', depth: 'supporting', ownerId: 'u-marcus',
      description: 'Shared components, tokens and the table/grid we use everywhere.',
      why: 'We wrote our own data grid after two vendor grids failed at 10k-row load boards.',
      dependsOn: [], gotchas: ['Every component needs a story and an a11y check'],
    },
    {
      id: 'a-auth', name: 'Auth', path: 'services/auth', depth: 'core', ownerId: 'u-dana',
      description: 'Sessions, API keys, org/role permissions.',
      why: 'Permissions are checked at the gateway and again in each service (defense in depth) after a 2023 incident.',
      dependsOn: ['a-db'], gotchas: ['Role names are stable API; never rename one'],
    },
    {
      id: 'a-queue', name: 'Event Queue', path: 'infra/queue', depth: 'supporting', ownerId: 'u-dana',
      description: 'Kafka topics and consumers shared by dispatch and billing.',
      why: 'Chosen over SQS for ordered per-load partitions; replay matters more to us than ops simplicity.',
      dependsOn: [], gotchas: ['Topic schemas are versioned; bump the version instead of editing'],
    },
    {
      id: 'a-db', name: 'Postgres', path: 'infra/db', depth: 'edge', ownerId: 'u-dana',
      description: 'Primary datastore, migrations and read replicas.',
      why: 'One database per service, not one shared schema. Keeps ownership clear.',
      dependsOn: [], gotchas: ['Migrations must be backwards compatible for one release'],
    },
  ],

  docs: [
    {
      id: 'doc-adr7', kind: 'decision', title: 'ADR-007: One gateway for all public traffic', areaId: 'a-gateway', tracks: [],
      summary: 'Why we merged three public APIs behind a single gateway.',
      question: 'Why is there a gateway instead of each service exposing its own API?',
      decision: 'All external traffic goes through services/gateway. Services are private.',
      alternatives: ['Keep per-service public APIs with a shared auth library', 'Managed API gateway (AWS API Gateway)'],
      body: 'Three services each had their own auth middleware and they drifted. Two security bugs in 2024 came from that drift. A shared library would still need every service to upgrade in lockstep. The managed gateway could not do our per-org rate limits without custom Lambdas, which cost more than running our own.',
      sources: [{ label: 'Design review deck, Mar 2024' }, { label: 'INC-212 postmortem' }],
      tags: ['architecture', 'security', 'gateway'], authorId: 'u-dana', createdAt: d(400), views: 31,
    },
    {
      id: 'doc-adr12', kind: 'decision', title: 'ADR-012: Event-sourced dispatch', areaId: 'a-dispatch', tracks: ['Backend'],
      summary: 'Why dispatch stores events instead of current state.',
      question: 'Why does dispatch append events instead of updating rows?',
      decision: 'Assignments are stored as an append-only event log; current state is a projection.',
      alternatives: ['CRUD tables with an audit table', 'Snapshot + diff'],
      body: 'Carrier disputes were 40% of support tickets. Support needed to answer "why did load X go to carrier Y at 3:02pm". An audit table could tell us what changed but not the scoring inputs at that moment. With events we replay the exact inputs.',
      sources: [{ label: 'Support ticket analysis, Q2 2023' }, { label: 'RFC: Dispatch v2' }],
      tags: ['architecture', 'dispatch', 'events'], authorId: 'u-priya', createdAt: d(600), views: 22,
    },
    {
      id: 'doc-why-cents', kind: 'why', title: 'Why is money stored as integer cents?', areaId: 'a-billing', tracks: ['Backend'],
      summary: 'Captured from a conversation between Priya and a new hire.',
      question: 'Why do we store money as integer cents instead of decimals?',
      decision: 'All amounts are integer cents. Conversion happens only at display.',
      body: 'Floats lose precision on addition and we had a payout rounding bug that underpaid carriers by a cent per load. Postgres numeric works but every language boundary (JS especially) turned it back into a float. Integers survive every hop.',
      sources: [{ label: 'Slack answer from Priya' }, { label: 'BILL-88 rounding bug' }],
      tags: ['billing', 'money'], authorId: 'u-priya', createdAt: d(40), views: 14,
    },
    {
      id: 'doc-setup', kind: 'guide', title: 'Local dev setup', tracks: [],
      summary: 'Get every service running locally in about 30 minutes.',
      body: '1. Install Docker, Node 22, Go 1.23.\n2. `make bootstrap` pulls images and seeds the DB.\n3. `make dev` starts gateway, auth (mock), dispatch and web.\n4. Visit localhost:5173 and log in as shipper@demo.test.\n\nIf `make dev` hangs on Kafka, run `make queue-reset`.',
      tags: ['setup', 'day-1'], authorId: 'u-dana', createdAt: d(90), views: 58,
    },
    {
      id: 'doc-review', kind: 'guide', title: 'How we do code review', tracks: [],
      summary: 'What reviewers look for, and how fast to expect a review.',
      body: 'Small PRs (<400 lines). One approval from the area owner. Reviews within one working day. Explain the why in the PR description, not just the what. If you are unsure, open a draft and ask.',
      tags: ['process', 'day-1'], authorId: 'u-priya', createdAt: d(200), views: 40,
    },
    {
      id: 'doc-grid', kind: 'decision', title: 'ADR-015: In-house data grid', areaId: 'a-ui', tracks: ['Frontend'],
      summary: 'Why we did not use AG Grid or TanStack Table directly.',
      question: 'Why did we build our own data grid?',
      decision: 'packages/ui ships its own virtualized grid built on TanStack primitives.',
      alternatives: ['AG Grid Enterprise', 'TanStack Table with default rendering'],
      body: 'Load boards hit 10k+ rows with live updates every second. AG Grid handled the rows but its licensing cost scaled with seats. TanStack defaults re-rendered every row per update. We kept TanStack for state and wrote our own row virtualization and diffing.',
      sources: [{ label: 'Perf benchmark notebook' }, { label: 'Frontend guild notes, Jan 2025' }],
      tags: ['frontend', 'performance'], authorId: 'u-marcus', createdAt: d(280), views: 9,
    },
    {
      id: 'doc-flags', kind: 'link', title: 'Feature flag dashboard', url: 'https://example.com/flags', tracks: ['Frontend', 'Backend'],
      summary: 'Where flags are toggled per environment.', body: 'Read-only for new hires. Ask your area owner before flipping anything in staging.',
      tags: ['tools'], authorId: 'u-marcus', createdAt: d(120), views: 12,
    },
  ],

  tasks: [
    {
      id: 't-1', title: 'Add a unit test for scoring tie-breaks', source: 'senior', kind: 'tests', areaId: 'a-dispatch',
      file: 'services/dispatch/scoring/rank.go', line: 88, difficulty: 2, estimate: '2-3 hrs',
      description: 'When two carriers have equal scores we fall back to earliest bid. There is no test for it.',
      learns: 'How scoring inputs flow from events into a ranking, and our table-driven test style.',
      status: 'in_progress', assigneeId: 'u-sam', recommendedById: 'u-priya', createdAt: d(6),
    },
    {
      id: 't-2', title: 'Fix typo-level lint warnings in billing/payouts', source: 'ai', kind: 'cleanup', areaId: 'a-billing',
      file: 'services/billing/payouts/run.go', line: 14, difficulty: 1, estimate: '30 min',
      description: '4 lint warnings (unused params, shadowed err). Safe, small first PR.',
      snippet: 'func runPayout(ctx context.Context, batch Batch, dryRun bool) error {',
      learns: 'Our PR flow end to end: branch, CI, review, merge.',
      status: 'open', createdAt: d(5),
    },
    {
      id: 't-3', title: 'Resolve TODO: document retry policy', source: 'ai', kind: 'todo', areaId: 'a-queue',
      file: 'infra/queue/consumer.ts', line: 42, difficulty: 1, estimate: '1 hr',
      description: 'A TODO asks for the retry/backoff policy to be documented in the consumer.',
      snippet: '// TODO: document why we cap retries at 5 and what happens after',
      learns: 'How consumers retry and where dead letters go.',
      status: 'open', createdAt: d(5),
    },
    {
      id: 't-4', title: 'Add empty state to Loads table', source: 'senior', kind: 'feature', areaId: 'a-web',
      file: 'apps/web/src/loads/LoadsTable.tsx', line: 120, difficulty: 2, estimate: 'half day',
      description: 'New shippers see a blank grid. Add an empty state with a "Post your first load" CTA using the UI Kit EmptyState.',
      learns: 'Routing, the UI Kit, and how the web app reads flags.',
      status: 'open', assigneeId: 'u-alex', recommendedById: 'u-marcus', createdAt: d(2),
    },
    {
      id: 't-5', title: 'Add missing story for <Badge>', source: 'ai', kind: 'docs', areaId: 'a-ui',
      file: 'packages/ui/src/Badge.tsx', difficulty: 1, estimate: '45 min',
      description: 'Badge has no Storybook story. Every UI Kit component is expected to have one.',
      learns: 'UI Kit conventions and the a11y check.',
      status: 'open', createdAt: d(2),
    },
  ],

  plans: [
    {
      id: 'p-backend', title: 'Backend onboarding: Dispatch team', track: 'Backend', authorId: 'u-priya', assigneeIds: ['u-sam'], createdAt: d(14),
      description: 'Four weeks from laptop to your first real dispatch change. Focus on why the system looks the way it does.',
      phases: [
        { id: 'ph-1', title: 'Week 1: Get running', goal: 'Everything runs locally and you have merged one PR.', items: [
          { id: 'pi-1', type: 'read', title: 'Local dev setup', refId: 'doc-setup' },
          { id: 'pi-2', type: 'read', title: 'How we do code review', refId: 'doc-review' },
          { id: 'pi-3', type: 'task', title: 'Ship a tiny cleanup PR', refId: 't-2' },
          { id: 'pi-4', type: 'meet', title: '30 min with Dana on platform', note: 'Bring questions about the gateway.' },
        ] },
        { id: 'ph-2', title: 'Week 2: Understand dispatch', goal: 'Explain in your own words why dispatch is event-sourced.', items: [
          { id: 'pi-5', type: 'explore', title: 'Walk the Dispatch Engine area', refId: 'a-dispatch' },
          { id: 'pi-6', type: 'read', title: 'ADR-012: Event-sourced dispatch', refId: 'doc-adr12' },
          { id: 'pi-7', type: 'read', title: 'ADR-007: One gateway', refId: 'doc-adr7' },
          { id: 'pi-8', type: 'task', title: 'Test scoring tie-breaks', refId: 't-1' },
        ] },
        { id: 'ph-3', title: 'Weeks 3-4: First real change', goal: 'Own a small change in dispatch or billing end to end.', items: [
          { id: 'pi-9', type: 'explore', title: 'Walk the Billing area', refId: 'a-billing' },
          { id: 'pi-10', type: 'read', title: 'Why money is integer cents', refId: 'doc-why-cents' },
          { id: 'pi-11', type: 'task', title: 'Document queue retry policy', refId: 't-3' },
        ] },
      ],
    },
    {
      id: 'p-frontend', title: 'Frontend intern plan: Web', track: 'Frontend', authorId: 'u-marcus', assigneeIds: ['u-alex'], createdAt: d(5),
      description: 'Ten weeks. Ship UI in week one, then learn the grid.',
      phases: [
        { id: 'ph-f1', title: 'Week 1: Get running', goal: 'Run the web app and ship a story.', items: [
          { id: 'pi-f1', type: 'read', title: 'Local dev setup', refId: 'doc-setup' },
          { id: 'pi-f2', type: 'explore', title: 'Walk the Web App area', refId: 'a-web' },
          { id: 'pi-f3', type: 'task', title: 'Badge story', refId: 't-5' },
        ] },
        { id: 'ph-f2', title: 'Week 2: Real UI', goal: 'Ship a user-visible change.', items: [
          { id: 'pi-f4', type: 'read', title: 'ADR-015: In-house data grid', refId: 'doc-grid' },
          { id: 'pi-f5', type: 'task', title: 'Loads table empty state', refId: 't-4' },
        ] },
      ],
    },
  ],

  threads: [
    {
      id: 'th-1', participantIds: ['u-sam', 'u-priya'], subject: 'Why integer cents?', context: { kind: 'area', id: 'a-billing' },
      messages: [
        { id: 'm-1', fromId: 'u-sam', body: 'Quick one: why is every amount in billing an int? Postgres has numeric.', at: d(40) },
        { id: 'm-2', fromId: 'u-priya', body: 'Floats lose precision and we once underpaid carriers by a cent a load (BILL-88). numeric is fine in Postgres but JS turns it back into a float at the API boundary. Integers survive every hop.', at: d(40), savedDocId: 'doc-why-cents' },
      ],
    },
    {
      id: 'th-2', participantIds: ['u-sam', 'u-priya'], subject: 'Tie-break test', context: { kind: 'task', id: 't-1' },
      messages: [
        { id: 'm-3', fromId: 'u-sam', body: 'Started on the tie-break test. Should I build events by hand or is there a fixture helper?', at: d(1) },
        { id: 'm-4', fromId: 'u-priya', body: 'Use testutil.NewLoadEvents(). It sets sane defaults so you only override what matters for the case.', at: d(1) },
      ],
    },
  ],

  progress: { 'u-sam': ['pi-1', 'pi-2', 'pi-3', 'pi-4', 'pi-5'], 'u-alex': ['pi-f1'] },
  reads: {},
}
