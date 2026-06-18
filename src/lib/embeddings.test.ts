import { describe, it, expect } from "vitest";
import { toVectorLiteral, EMBEDDING_DIMS } from "@/lib/embeddings";

describe("embeddings: toVectorLiteral", () => {
  it("serialises a vector into pgvector's bracket format", () => {
    expect(toVectorLiteral([0.1, 0.2, 0.3])).toBe("[0.1,0.2,0.3]");
  });

  it("handles an empty vector", () => {
    expect(toVectorLiteral([])).toBe("[]");
  });

  it("preserves negative and integer values", () => {
    expect(toVectorLiteral([-1, 0, 2.5])).toBe("[-1,0,2.5]");
  });

  it("targets the 1536-dim text-embedding-3-small space", () => {
    expect(EMBEDDING_DIMS).toBe(1536);
  });
});
