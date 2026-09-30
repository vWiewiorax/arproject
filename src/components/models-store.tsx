"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { models as seed, type ArModel, type ModelStatus } from "@/lib/models";

type Store = {
  models: ArModel[];
  addModel: (name: string, status: ModelStatus) => ArModel;
  removeModel: (id: string) => void;
  updateModel: (id: string, patch: Partial<ArModel>) => void;
};

const ModelsContext = createContext<Store | null>(null);

const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "model";

export function ModelsProvider({ children }: { children: ReactNode }) {
  const [models, setModels] = useState<ArModel[]>(seed);

  const addModel = useCallback((name: string, status: ModelStatus) => {
    const model: ArModel = {
      id: `${slugify(name)}-${Date.now().toString(36)}`,
      name,
      status,
      scans: 0,
      createdAt: new Date().toISOString().slice(0, 10),
      fileSize: `${(1 + Math.random() * 5).toFixed(1)} MB`,
      polygons: `${Math.round(10 + Math.random() * 60)}k`,
      slug: Math.random().toString(36).slice(2, 7),
    };
    setModels((prev) => [model, ...prev]);
    return model;
  }, []);

  const removeModel = useCallback((id: string) => setModels((prev) => prev.filter((m) => m.id !== id)), []);

  const updateModel = useCallback(
    (id: string, patch: Partial<ArModel>) => setModels((prev) => prev.map((m) => (m.id === id ? { ...m, ...patch } : m))),
    [],
  );

  const value = useMemo(() => ({ models, addModel, removeModel, updateModel }), [models, addModel, removeModel, updateModel]);
  return <ModelsContext.Provider value={value}>{children}</ModelsContext.Provider>;
}

export function useModels() {
  const ctx = useContext(ModelsContext);
  if (!ctx) throw new Error("useModels must be used within ModelsProvider");
  return ctx;
}
