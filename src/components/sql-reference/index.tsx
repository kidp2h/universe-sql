"use client";

import * as React from "react";
import {
  BookOpen,
  Search,
  Copy,
  Check,
  CornerDownLeft,
  Filter,
  Bookmark,
  Sparkles,
} from "lucide-react";
import { useTabStore } from "@/stores/tab-store";
import { useSidebarStore } from "@/stores/sidebar-store";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

type ReferenceItem = {
  id: string;
  title: string;
  description: string;
  sql: string;
  tags: string[];
};

type ReferenceCategory = {
  id: string;
  name: string;
  icon: string;
  items: ReferenceItem[];
};

const REFERENCE_DATA: ReferenceCategory[] = [
  {
    id: "basics",
    name: "Basics & Joins",
    icon: "database",
    items: [
      {
        id: "inner-join",
        title: "INNER JOIN",
        description:
          "Returns records that have matching values in both tables.",
        sql: `SELECT \n  orders.order_id,\n  users.name,\n  orders.amount\nFROM orders\nINNER JOIN users \n  ON orders.user_id = users.id;`,
        tags: ["select", "join", "basics"],
      },
      {
        id: "left-join",
        title: "LEFT OUTER JOIN",
        description:
          "Returns all records from the left table, and matched records from the right table. Fill unmatched right values with NULL.",
        sql: `SELECT \n  users.name,\n  orders.order_id,\n  orders.amount\nFROM users\nLEFT JOIN orders \n  ON users.id = orders.user_id;`,
        tags: ["select", "join", "basics", "outer"],
      },
      {
        id: "coalesce-null",
        title: "COALESCE (Handle NULLs)",
        description:
          "Evaluates arguments in order and returns the first non-null value. Perfect for custom fallbacks.",
        sql: `SELECT \n  name,\n  COALESCE(phone, 'No Phone Number Provided') as contact_number\nFROM users;`,
        tags: ["null", "basics", "coalesce"],
      },
    ],
  },
  {
    id: "window",
    name: "Window Functions",
    icon: "activity",
    items: [
      {
        id: "row-number",
        title: "ROW_NUMBER()",
        description:
          "Assigns a unique, sequential integer to each row in a partition, starting from 1.",
        sql: `SELECT \n  employee_id,\n  department,\n  salary,\n  ROW_NUMBER() OVER (\n    PARTITION BY department \n    ORDER BY salary DESC\n  ) as salary_rank\nFROM employees;`,
        tags: ["window", "partition", "rank"],
      },
      {
        id: "lag-lead",
        title: "LAG() & LEAD()",
        description:
          "Accesses data from a previous or subsequent row in the same result set without self-joining.",
        sql: `SELECT \n  date,\n  revenue,\n  LAG(revenue, 1) OVER (ORDER BY date) as prev_day_revenue,\n  revenue - LAG(revenue, 1) OVER (ORDER BY date) as daily_growth\nFROM sales;`,
        tags: ["window", "lag", "lead", "analytics"],
      },
      {
        id: "moving-avg",
        title: "Moving Average",
        description:
          "Calculates an average over a rolling window of rows (e.g. 7-day moving average).",
        sql: `SELECT \n  date,\n  revenue,\n  AVG(revenue) OVER (\n    ORDER BY date\n    ROWS BETWEEN 6 PRECEDING AND CURRENT ROW\n  ) as rolling_7day_avg\nFROM sales;`,
        tags: ["window", "average", "analytics"],
      },
    ],
  },
  {
    id: "jsonb",
    name: "JSONB Operations",
    icon: "braces",
    items: [
      {
        id: "jsonb-extract-text",
        title: "Extract Text Value (->>)",
        description:
          "Extracts JSON object field or array element as pure text.",
        sql: `SELECT \n  profile->>'email' as email,\n  profile->'address'->>'city' as city\nFROM users\nWHERE profile->>'email' IS NOT NULL;`,
        tags: ["json", "jsonb", "extract"],
      },
      {
        id: "jsonb-contains",
        title: "Contains Operator (@>)",
        description:
          "Checks if the left JSONB document contains the right JSONB structure. Uses GIN indexes.",
        sql: `SELECT name, profile \nFROM users \nWHERE profile @> '{"role": "admin", "status": "active"}';`,
        tags: ["json", "jsonb", "contains", "index"],
      },
      {
        id: "jsonb-update-path",
        title: "Modify & Update path (jsonb_set)",
        description:
          "Modifies or inserts a field inside a deep JSONB document path.",
        sql: `UPDATE users \nSET profile = jsonb_set(\n  profile, \n  '{address,zipcode}', \n  '"90210"'\n)\nWHERE id = 42;`,
        tags: ["json", "jsonb", "update", "set"],
      },
    ],
  },
  {
    id: "ctes",
    name: "Common Table Expressions",
    icon: "git-merge",
    items: [
      {
        id: "basic-cte",
        title: "Standard CTE (WITH)",
        description:
          "Defines temporary auxiliary queries to break down complex queries into readable steps.",
        sql: `WITH regional_sales AS (\n  SELECT region, SUM(amount) as total_sales\n  FROM orders\n  GROUP BY region\n), top_regions AS (\n  SELECT region\n  FROM regional_sales\n  WHERE total_sales > 10000\n)\nSELECT *\nFROM orders\nWHERE region IN (SELECT region FROM top_regions);`,
        tags: ["cte", "with", "readable"],
      },
      {
        id: "recursive-cte",
        title: "Recursive CTE (Hierarchies)",
        description:
          "Recursively traverses hierarchical, tree-structured data like org charts, taxonomies, or paths.",
        sql: `WITH RECURSIVE org_chart AS (\n  -- Anchor member: Start with top manager\n  SELECT id, name, manager_id, 1 as level\n  FROM employees\n  WHERE manager_id IS NULL\n  \n  UNION ALL\n  \n  -- Recursive member: Join with sub-employees\n  SELECT e.id, e.name, e.manager_id, o.level + 1\n  FROM employees e\n  INNER JOIN org_chart o ON e.manager_id = o.id\n)\nSELECT * FROM org_chart ORDER BY level;`,
        tags: ["cte", "recursive", "hierarchy"],
      },
    ],
  },
  {
    id: "datetime",
    name: "Date & Time Math",
    icon: "calendar",
    items: [
      {
        id: "age-interval",
        title: "Calculate Age (AGE)",
        description:
          "Calculates precise calendar intervals between two timestamps or compared to current date.",
        sql: `SELECT \n  name,\n  birth_date,\n  AGE(birth_date) as exact_age,\n  EXTRACT(year FROM AGE(birth_date)) as age_in_years\nFROM employees;`,
        tags: ["date", "time", "age"],
      },
      {
        id: "date-series",
        title: "Generate Date Series",
        description:
          "Generates a continuous sequence of days, hours, or months. Perfect for mock charts.",
        sql: `SELECT \n  day::date as date_point\nFROM generate_series(\n  CURRENT_DATE - INTERVAL '30 days',\n  CURRENT_DATE,\n  '1 day'::interval\n) as day;`,
        tags: ["date", "series", "generate"],
      },
      {
        id: "timezone-convert",
        title: "Timezone Conversion",
        description:
          "Converts timestamps across timezones dynamically using AT TIME ZONE.",
        sql: `SELECT \n  created_at as local_timestamp,\n  created_at AT TIME ZONE 'UTC' AT TIME ZONE 'EST' as est_timestamp\nFROM orders;`,
        tags: ["date", "time", "timezone"],
      },
    ],
  },
  {
    id: "indexing",
    name: "Performance Tuning",
    icon: "zap",
    items: [
      {
        id: "explain-analyze",
        title: "EXPLAIN ANALYZE",
        description:
          "Executes the query and outputs the detailed query execution plan, timings, and buffers.",
        sql: `EXPLAIN (ANALYZE, BUFFERS, VERBOSE, FORMAT TEXT)\nSELECT * \nFROM orders \nWHERE user_id = 1530 \nORDER BY created_at DESC;`,
        tags: ["explain", "performance", "analyze"],
      },
      {
        id: "gin-index",
        title: "GIN Index (JSONB Search)",
        description:
          "Creates a Generalized Inverted Index on deep JSONB columns for lightning fast key searches.",
        sql: `CREATE INDEX idx_users_profile_gin \nON users USING gin (profile);`,
        tags: ["index", "gin", "jsonb", "performance"],
      },
      {
        id: "partial-index",
        title: "Partial Index (Filtered)",
        description:
          "Creates an index on a subset of a table. Saves disk space and enhances search speed.",
        sql: `CREATE INDEX idx_orders_active_unpaid \nON orders (user_id) \nWHERE status = 'unpaid' AND is_active = true;`,
        tags: ["index", "performance", "partial"],
      },
    ],
  },
];

export default function SQLReferencePage() {
  const { t } = useTranslation();
  const setQuerySql = useTabStore((state) => state.setQuerySql);
  const activeQueryTabId = useTabStore((state) => state.activeQueryTabId);
  const queryTabs = useTabStore((state) => state.queryTabs);

  const [activeCategory, setActiveCategory] = React.useState<string>("basics");
  const [searchQuery, setSearchQuery] = React.useState<string>("");
  const [copiedId, setCopiedId] = React.useState<string | null>(null);

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success(t("copiedTemplateSuccess"), { duration: 1500 });
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleApply = (sql: string) => {
    const activeTab = queryTabs.find((t) => t.id === activeQueryTabId);
    if (!activeTab || activeTab.type) {
      // Find the last active standard SQL query tab or open a new one
      const sqlTab = queryTabs.find((t) => !t.type || t.type === "sql");
      if (sqlTab) {
        useTabStore.getState().updateActiveQueryTabId(sqlTab.id);
        const currentSql = sqlTab.sql;
        const newSql = currentSql.trim() ? `${currentSql}\n\n${sql}` : sql;
        setQuerySql(newSql);
        toast.success(t("templateAppended", { name: sqlTab.title }));
      } else {
        useTabStore.getState().openSqlTab({
          sql,
          connectionId: useSidebarStore.getState().selectedConnectionId,
        });
        toast.success(t("templateLoadedNewTab"));
      }
    } else {
      const currentSql = activeTab.sql;
      const newSql = currentSql.trim() ? `${currentSql}\n\n${sql}` : sql;
      setQuerySql(newSql);
      toast.success(t("templateAppendedActive", { name: activeTab.title }));
    }
  };

  const filteredCategories = React.useMemo(() => {
    if (!searchQuery.trim()) return REFERENCE_DATA;
    const query = searchQuery.toLowerCase();

    return REFERENCE_DATA.map((cat) => {
      const matchingItems = cat.items.filter(
        (item) =>
          item.title.toLowerCase().includes(query) ||
          item.description.toLowerCase().includes(query) ||
          item.sql.toLowerCase().includes(query) ||
          item.tags.some((t) => t.toLowerCase().includes(query)),
      );
      return {
        ...cat,
        items: matchingItems,
      };
    }).filter((cat) => cat.items.length > 0);
  }, [searchQuery]);

  const activeCategoryData = React.useMemo(() => {
    return filteredCategories.find((cat) => cat.id === activeCategory);
  }, [filteredCategories, activeCategory]);

  // Adjust active category if it gets filtered out
  React.useEffect(() => {
    if (
      filteredCategories.length > 0 &&
      !filteredCategories.some((c) => c.id === activeCategory)
    ) {
      setActiveCategory(filteredCategories[0].id);
    }
  }, [filteredCategories, activeCategory]);

  return (
    <div className="flex h-full w-full bg-background overflow-hidden animate-in fade-in duration-300">
      {/* Sidebar - Index list */}
      <div className="w-64 border-r bg-card flex flex-col shrink-0">
        <div className="p-4 border-b shrink-0 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
              <BookOpen className="size-3.5 text-brand" />
              {t("toolSqlRefName")}
            </span>
            <span className="text-xs bg-brand/10 text-brand px-1.5 py-0.5 rounded font-mono font-bold">
              PostgreSQL
            </span>
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t("sqlRefSearchPlaceholder")}
              className="pl-8 h-8 text-sm w-full bg-background"
            />
          </div>
        </div>

        {/* Categories list */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {filteredCategories.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              {t("noMatchingCategories")}
            </div>
          ) : (
            filteredCategories.map((cat) => {
              const isActive = cat.id === activeCategory;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setActiveCategory(cat.id)}
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-lg transition-all",
                    isActive
                      ? "bg-brand/10 text-brand"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
                  )}
                >
                  <span className="flex items-center gap-2">
                    <Bookmark
                      className={cn(
                        "size-3.5",
                        isActive ? "text-brand" : "text-muted-foreground/60",
                      )}
                    />
                    {t(cat.id)}
                  </span>
                  <span className="text-xs bg-muted px-1.5 py-0.2 rounded-full text-muted-foreground">
                    {cat.items.length}
                  </span>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Main reference pane */}
      <div className="flex-1 flex flex-col min-w-0 bg-background/50">
        {/* Banner header */}
        <div className="p-6 border-b bg-card shrink-0 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
              <Sparkles className="size-4 text-brand animate-pulse" />
              {activeCategoryData ? t(activeCategoryData.id) : t("sqlLibrary")}
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5 leading-normal">
              {t("sqlRefSubtitleDesc")}
            </p>
          </div>
        </div>

        {/* Content list */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {!activeCategoryData || activeCategoryData.items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center p-8 text-center max-w-md mx-auto space-y-3">
              <BookOpen className="size-10 text-muted-foreground/30 animate-pulse" />
              <p className="text-sm text-muted-foreground leading-normal">
                {t("sqlRefEmptyState")}
              </p>
            </div>
          ) : (
            activeCategoryData.items.map((item) => {
              const isCopied = copiedId === item.id;
              return (
                <div
                  key={item.id}
                  className="bg-card border rounded-xl overflow-hidden hover:border-brand/30 hover:shadow-xs transition-all duration-300"
                >
                  {/* Item metadata card */}
                  <div className="p-4 border-b flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <h4 className="text-sm font-bold text-foreground">
                        {item.title}
                      </h4>
                      <p className="text-[11px] text-muted-foreground leading-normal max-w-2xl">
                        {item.description}
                      </p>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      {/* Copy button */}
                      <button
                        type="button"
                        onClick={() => handleCopy(item.id, item.sql)}
                        className="flex items-center justify-center size-8 rounded-lg border hover:bg-muted text-muted-foreground hover:text-foreground transition-all duration-150"
                        title={t("copyToClipboard")}
                      >
                        {isCopied ? (
                          <Check className="size-3.5 text-emerald-500" />
                        ) : (
                          <Copy className="size-3.5" />
                        )}
                      </button>

                      {/* Inject into editor button */}
                      <button
                        type="button"
                        onClick={() => handleApply(item.sql)}
                        className="flex items-center gap-1 px-2.5 h-8 text-[11px] font-semibold rounded-lg bg-brand hover:bg-brand/80 text-white shadow-xs transition-all duration-150"
                        title={t("appendToActiveTab")}
                      >
                        <CornerDownLeft className="size-3" />
                        {t("insertLabel")}
                      </button>
                    </div>
                  </div>

                  {/* SQL block viewport */}
                  <div className="relative bg-muted/30 p-4 font-mono text-[11px] text-foreground leading-relaxed whitespace-pre overflow-x-auto border-t border-border/40 select-text">
                    {item.sql}
                  </div>

                  {/* Tags footer */}
                  <div className="px-4 py-2 bg-muted/10 border-t border-border/20 flex items-center gap-1.5 overflow-x-auto shrink-0 select-none">
                    <Filter className="size-2.5 text-muted-foreground/60 shrink-0" />
                    {item.tags.map((tag) => (
                      <span
                        key={tag}
                        className="text-[9px] bg-muted text-muted-foreground px-2 py-0.5 rounded-full shrink-0 font-medium font-sans"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

// Sub-component wrapper for input to prevent standard Next.js styling overrides
function Input({ className, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      data-slot="input"
      className={cn(
        "border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm shadow-xs transition-shadow outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}
