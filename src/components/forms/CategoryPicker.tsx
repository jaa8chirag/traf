"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Select } from "@/components/ui";

interface Node {
  id: string;
  name: string;
  isLeaf: boolean;
}

async function children(parent: string | null): Promise<Node[]> {
  const res = await fetch(`/api/categories${parent ? `?parent=${parent}` : ""}`);
  if (!res.ok) return [];
  return ((await res.json()) as { items: Node[] }).items;
}

/** Cascading selects L1 -> L4. `Continue` is enabled on a leaf and navigates to `${basePath}?category=ID`. */
export function CategoryPicker({ basePath }: { basePath: string }) {
  const router = useRouter();
  const [levels, setLevels] = useState<Node[][]>([]);
  const [picked, setPicked] = useState<(Node | undefined)[]>([]);

  useEffect(() => {
    let live = true;
    children(null).then((roots) => live && setLevels([roots]));
    return () => {
      live = false;
    };
  }, []);

  async function choose(level: number, id: string) {
    const node = levels[level].find((n) => n.id === id);
    const nextPicked = [...picked.slice(0, level), node];
    setPicked(nextPicked);
    const nextLevels = levels.slice(0, level + 1);
    if (node && !node.isLeaf) nextLevels.push(await children(node.id));
    setLevels(nextLevels);
  }

  const last = picked[picked.length - 1];
  return (
    <div className="space-y-3">
      {levels.map((opts, level) => (
        <Select key={level} aria-label={`Category level ${level + 1}`} value={picked[level]?.id ?? ""} onChange={(e) => choose(level, e.target.value)}>
          <option value="" disabled>
            {level === 0 ? "Choose a category…" : "Choose a sub-category…"}
          </option>
          {opts.map((n) => (
            <option key={n.id} value={n.id}>
              {n.name}
            </option>
          ))}
        </Select>
      ))}
      <Button disabled={!last?.isLeaf} onClick={() => last && router.push(`${basePath}?category=${last.id}`)}>
        Continue
      </Button>
      {last && !last.isLeaf && <p className="text-xs text-muted">Keep choosing until there are no more sub-categories.</p>}
    </div>
  );
}
