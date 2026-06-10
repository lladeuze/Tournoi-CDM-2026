/* Minimal in-memory mock of the Supabase client used in maquette mode.
   Supports the chainable query patterns this app actually uses. */

import {
  DEMO_USER,
  demoTables,
  demoMatches,
  demoOtherPredictions,
} from './demoData';

function rowsFor(table: string): any[] {
  const base = demoTables[table] ? [...demoTables[table]] : [];

  // Enrich predictions with their nested match (profile page needs it).
  if (table === 'predictions') {
    return base.map((p) => ({
      ...p,
      matches: demoMatches.find((m) => m.id === p.match_id) || null,
    }));
  }

  return base;
}

type Filter = { type: 'eq' | 'in'; field: string; value: any };

class DemoQuery implements PromiseLike<{ data: any; error: null }> {
  private table: string;
  private singleRow = false;
  private payload: any = null;
  private filters: Filter[] = [];

  constructor(table: string) {
    this.table = table;
  }

  // --- chainable no-ops that just return `this` ---
  select(_cols?: string) {
    return this;
  }
  order() {
    return this;
  }
  eq(field?: string, value?: any) {
    if (field !== undefined) this.filters.push({ type: 'eq', field, value });
    return this;
  }
  neq() {
    return this;
  }
  in(field?: string, value?: any) {
    if (field !== undefined) this.filters.push({ type: 'in', field, value });
    return this;
  }
  or() {
    return this;
  }
  ilike() {
    return this;
  }
  like() {
    return this;
  }
  gte() {
    return this;
  }
  lte() {
    return this;
  }
  gt() {
    return this;
  }
  lt() {
    return this;
  }
  range() {
    return this;
  }
  limit() {
    return this;
  }
  filter() {
    return this;
  }

  // --- terminal-ish modifiers ---
  maybeSingle() {
    this.singleRow = true;
    return this;
  }
  single() {
    this.singleRow = true;
    return this;
  }

  // --- mutations (return success, echo payload) ---
  insert(payload: any) {
    this.payload = Array.isArray(payload) ? payload : [payload];
    return this;
  }
  update(payload: any) {
    this.payload = [payload];
    return this;
  }
  upsert(payload: any) {
    this.payload = Array.isArray(payload) ? payload : [payload];
    return this;
  }
  delete() {
    this.payload = [];
    return this;
  }

  // Merge upserts into the in-memory demo tables (predictions & champion picks).
  private persist(rows: any[]) {
    const store = demoTables[this.table];
    if (!store) return;

    const keyFor = (row: any): ((r: any) => boolean) | null => {
      if (this.table === 'predictions' && row.match_id != null) {
        return (r) => r.match_id === row.match_id;
      }
      if (
        (this.table === 'champion_predictions' ||
          this.table === 'award_predictions') &&
        row.user_id != null
      ) {
        return (r) => r.user_id === row.user_id;
      }
      return null;
    };

    for (const row of rows) {
      const match = keyFor(row);
      if (!match) continue;
      const idx = store.findIndex(match);
      if (idx >= 0) store[idx] = { ...store[idx], ...row };
      else store.push(row);
    }
  }

  private resolveData() {
    if (this.payload) {
      const withIds = this.payload.map((row: any, i: number) => ({
        id: row.id || `demo-${this.table}-${i}-${row.code || row.name || 'row'}`,
        ...row,
      }));

      // Persist in-session so the maquette behaves like a real backend:
      // saved predictions / champion picks survive until a full reload.
      this.persist(withIds);

      return this.singleRow ? withIds[0] ?? null : withIds;
    }

    let rows = rowsFor(this.table);

    for (const f of this.filters) {
      if (f.type === 'eq') {
        rows = rows.filter((r) => r[f.field] === f.value);
      } else if (f.type === 'in' && Array.isArray(f.value)) {
        rows = rows.filter((r) => f.value.includes(r[f.field]));
      }
    }

    return this.singleRow ? rows[0] ?? null : rows;
  }

  then<TResult1 = { data: any; error: null }, TResult2 = never>(
    onfulfilled?:
      | ((value: { data: any; error: null }) => TResult1 | PromiseLike<TResult1>)
      | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null
  ): PromiseLike<TResult1 | TResult2> {
    const result = { data: this.resolveData(), error: null };
    return Promise.resolve(result).then(onfulfilled, onrejected);
  }
}

// In-session demo auth: start logged OUT, any sign-in works, survives reloads.
const DEMO_AUTH_KEY = 'wc-demo-signedin';

function isSignedIn(): boolean {
  try {
    return localStorage.getItem(DEMO_AUTH_KEY) === '1';
  } catch {
    return false;
  }
}

function setSignedIn(value: boolean) {
  try {
    if (value) localStorage.setItem(DEMO_AUTH_KEY, '1');
    else localStorage.removeItem(DEMO_AUTH_KEY);
  } catch {}
}

const demoAuth = {
  async getUser() {
    return {
      data: { user: isSignedIn() ? DEMO_USER : null },
      error: null,
    };
  },
  async getSession() {
    return {
      data: { session: isSignedIn() ? { user: DEMO_USER } : null },
      error: null,
    };
  },
  async signInWithPassword() {
    setSignedIn(true);
    return { data: { user: DEMO_USER, session: {} }, error: null };
  },
  async signUp() {
    setSignedIn(true);
    return { data: { user: DEMO_USER, session: {} }, error: null };
  },
  async signOut() {
    setSignedIn(false);
    return { error: null };
  },
  async resetPasswordForEmail() {
    return { data: {}, error: null };
  },
  async updateUser() {
    return { data: { user: DEMO_USER }, error: null };
  },
  onAuthStateChange() {
    return { data: { subscription: { unsubscribe() {} } } };
  },
};

export function createDemoClient() {
  return {
    auth: demoAuth,
    from(table: string) {
      return new DemoQuery(table);
    },
    async rpc(name: string) {
      if (name === 'get_match_predictions_for_league') {
        return { data: demoOtherPredictions, error: null };
      }
      return { data: null, error: null };
    },
  } as any;
}
