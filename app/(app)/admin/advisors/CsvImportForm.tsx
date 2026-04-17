"use client";

import { useState, useTransition } from "react";
import { importAssignments } from "./actions";

export function CsvImportForm() {
  const [pending, start] = useTransition();
  const [result, setResult] = useState<null | {
    created: number;
    skipped: number;
    errors: string[];
  }>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    start(async () => {
      const r = await importAssignments(fd);
      setResult(r);
    });
  }

  return (
    <form onSubmit={onSubmit} className="card p-5 space-y-3">
      <div className="font-medium">Bulk assign (CSV)</div>
      <p className="text-sm text-slate-600">
        One pair per line: <code className="font-mono">advisor_email,student_email</code>.
        Duplicates are skipped.
      </p>
      <textarea
        name="csv"
        rows={8}
        required
        className="input font-mono text-xs"
        placeholder={"advisor1@school.edu,student1@school.edu\nadvisor1@school.edu,student2@school.edu"}
      />
      <div className="flex items-center justify-end gap-3">
        {result ? (
          <div className="text-sm">
            {result.created} created, {result.skipped} skipped
            {result.errors.length > 0 ? `, ${result.errors.length} errors` : ""}
          </div>
        ) : null}
        <button type="submit" className="btn-primary" disabled={pending}>
          {pending ? "Importing..." : "Import"}
        </button>
      </div>
      {result && result.errors.length > 0 ? (
        <ul className="text-xs text-red-700 space-y-0.5">
          {result.errors.map((e, i) => (
            <li key={i}>{e}</li>
          ))}
        </ul>
      ) : null}
    </form>
  );
}
