// Small in-memory stand-in for the prisma client, covering only the calls the
// payment code makes. Rows are plain objects keyed by their primary key.

type Row = Record<string, any>;

const PK: Record<string, string> = { keyValuePair: "key" };

const DEFAULTS: Record<string, () => Row> = {
  transaction: () => ({ status: "PENDING" }),
  simpleTransaction: () => ({ status: "PENDING", txId: null }),
  transactionalLock: () => ({ lock: null, lease: null }),
  keyValuePair: () => ({ expiresAt: null }),
  report: () => ({ status: "PAYMENT_PENDING" }),
};

let counter = 0;

const matches = (row: Row, where: Row = {}): boolean =>
  Object.entries(where).every(([k, v]) => {
    const actual = row[k] === undefined ? null : row[k];
    if (v && typeof v === "object" && !(v instanceof Date)) {
      if ("in" in v) return v.in.includes(actual);
      if ("lt" in v) return actual !== null && actual < v.lt;
    }
    return actual === (v === undefined ? null : v);
  });

const clean = (data: Row): Row =>
  Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined));

const makeModel = (name: string, rows: Map<string, Row>) => {
  const pk = PK[name] ?? "id";
  const all = () => [...rows.values()];
  const create = async ({ data }: { data: Row }) => {
    const row: Row = {
      ...(DEFAULTS[name]?.() ?? {}),
      id: `${name}-${++counter}`,
      // distinct, increasing timestamps keep createdAt ordering deterministic
      createdAt: new Date(Date.now() + counter),
      ...clean(data),
    };
    if (rows.has(row[pk])) {
      throw new Error(`Unique constraint failed on ${name}.${pk}`);
    }
    rows.set(row[pk], row);
    return { ...row };
  };
  return {
    findFirst: async ({ where, orderBy }: Row = {}) => {
      let found = all().filter((r) => matches(r, where));
      if (orderBy?.createdAt) {
        const dir = orderBy.createdAt === "asc" ? 1 : -1;
        found = found.sort(
          (a, b) => dir * (a.createdAt.getTime() - b.createdAt.getTime())
        );
      }
      return found[0] ? { ...found[0] } : null;
    },
    findMany: async ({ where }: Row = {}) =>
      all()
        .filter((r) => matches(r, where))
        .map((r) => ({ ...r })),
    create,
    update: async ({ where, data }: Row) => {
      const row = all().find((r) => matches(r, where));
      if (!row) throw new Error(`${name} not found`);
      Object.assign(row, clean(data));
      return { ...row };
    },
    updateMany: async ({ where, data }: Row) => {
      const found = all().filter((r) => matches(r, where));
      found.forEach((r) => Object.assign(r, data));
      return { count: found.length };
    },
    upsert: async ({ where, create: createData, update }: Row) => {
      const row = all().find((r) => matches(r, where));
      if (!row) return create({ data: createData });
      Object.assign(row, clean(update));
      return { ...row };
    },
    deleteMany: async ({ where }: Row = {}) => {
      const found = all().filter((r) => matches(r, where));
      found.forEach((r) => rows.delete(r[pk]));
      return { count: found.length };
    },
  };
};

const MODELS = [
  "transaction",
  "paymentInstrument",
  "charge",
  "simpleTransaction",
  "keyValuePair",
  "transactionalLock",
  "report",
] as const;

export const createFakePrisma = () => {
  const tables: Record<string, Map<string, Row>> = {};
  const prisma: Record<string, any> = {};
  for (const name of MODELS) {
    tables[name] = new Map();
    prisma[name] = makeModel(name, tables[name]);
  }
  // Seed a row directly, bypassing defaults for fields that are given
  const seed = (model: (typeof MODELS)[number], row: Row) => {
    const full: Row = {
      ...(DEFAULTS[model]?.() ?? {}),
      id: `${model}-${++counter}`,
      createdAt: new Date(Date.now() + counter),
      ...row,
    };
    tables[model].set(full[PK[model] ?? "id"], full);
    return full;
  };
  return { prisma, tables, seed };
};

// Explorer-shaped tx fixture: payment outputs plus fee and change
export const explorerTx = (opts: {
  id: string;
  confirmations?: number;
  payments: { address: string; value?: number; assets?: { tokenId: string; amount: number }[]; mainChain?: boolean }[];
}) => ({
  id: opts.id,
  numConfirmations: opts.confirmations ?? 5,
  outputs: [
    ...opts.payments.map((p) => ({
      address: p.address,
      value: p.value ?? 1000000,
      assets: p.assets ?? [],
      mainChain: p.mainChain ?? true,
    })),
    {
      address: "2iHkR7CWvD1R4j1yZg5bkeDRQavjAaVPeTDFGGLZduHyfWMuYpmhHocX8GJoaieTx78FntzJbCBVL6rf96ocJoZdmWBL9",
      value: 1100000,
      assets: [],
      mainChain: true,
    },
    {
      address: "9hSender1ChangeAddress",
      value: 5000000000,
      assets: [],
      mainChain: true,
    },
  ],
});
