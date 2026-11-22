"""Testleaf FDE Week 7 — Compare four document chunking strategies.

Install: python -m pip install -r requirements.txt
Run:     python chunking_lab.py --file sample_policy.md
Try:     python chunking_lab.py --file my_document.md --chunk-size 240 --overlap 30

The first three methods do not need an embedding model. The semantic method uses
BAAI/bge-small-en-v1.5 and may download the model on the first run.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

from langchain_text_splitters import (
    MarkdownHeaderTextSplitter,
    RecursiveCharacterTextSplitter,
)

STRATEGIES = ("fixed", "recursive", "structure", "semantic")


def fixed_size(text: str, size: int, overlap: int) -> list[dict[str, Any]]:
    """Split mechanically every N characters (not tokens or words)."""
    chunks: list[dict[str, Any]] = []
    step = size - overlap
    for start in range(0, len(text), step):
        end = min(start + size, len(text))
        chunks.append({"text": text[start:end], "metadata": {"start": start, "end": end}})
        if end == len(text):
            break
    return chunks


def recursive(text: str, size: int, overlap: int) -> list[dict[str, Any]]:
    """Try paragraph, line, space, then character boundaries."""
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=size,
        chunk_overlap=overlap,
        separators=["\n\n", "\n", " ", ""],
        length_function=len,
    )
    return [{"text": piece, "metadata": {}} for piece in splitter.split_text(text)]


def structure_aware(text: str) -> list[dict[str, Any]]:
    """Use Markdown headings; preserve the heading path in each chunk's metadata.

    This method is based on structure, NOT on a max-character limit. A plain .txt
    file without # headings may appear as one large chunk. That is intentional.
    """
    splitter = MarkdownHeaderTextSplitter(
        headers_to_split_on=[
            ("#", "H1"),
            ("##", "H2"),
            ("###", "H3"),
        ],
        strip_headers=False,
    )
    documents = splitter.split_text(text)
    return [
        {"text": doc.page_content, "metadata": dict(doc.metadata)}
        for doc in documents
    ]


def semantic(text: str, threshold: float) -> list[dict[str, Any]]:
    """Split near semantic change points using embeddings of neighboring sentences.

    Embedding similarity determines boundaries; chunk_size/overlap do not control
    this strategy. Its chunks are NOT guaranteed to be under a maximum length.
    """
    # Imports are lazy: the first three methods run without model downloads.
    from langchain_experimental.text_splitter import SemanticChunker
    from langchain_huggingface import HuggingFaceEmbeddings

    embedder = HuggingFaceEmbeddings(model_name="BAAI/bge-small-en-v1.5")
    splitter = SemanticChunker(
        embedder,
        breakpoint_threshold_type="percentile",
        breakpoint_threshold_amount=threshold,
    )
    return [
        {"text": doc.page_content, "metadata": dict(doc.metadata)}
        for doc in splitter.create_documents([text])
    ]


def run_method(name: str, text: str, size: int, overlap: int, threshold: float):
    if name == "fixed":
        return fixed_size(text, size, overlap)
    if name == "recursive":
        return recursive(text, size, overlap)
    if name == "structure":
        return structure_aware(text)
    return semantic(text, threshold)


def main() -> None:
    parser = argparse.ArgumentParser(description="Compare four RAG chunking methods")
    parser.add_argument("--file", default="sample_policy.md", help="UTF-8 .txt or .md file")
    parser.add_argument("--method", choices=["all", *STRATEGIES], default="all")
    parser.add_argument("--chunk-size", type=int, default=240, help="Characters; fixed and recursive only")
    parser.add_argument("--overlap", type=int, default=30, help="Characters; fixed and recursive only")
    parser.add_argument("--semantic-percentile", type=float, default=75,
                        help="Break at distance percentile (1–99); semantic only")
    parser.add_argument("--out", default="chunking_results", help="Directory for output JSON files")
    args = parser.parse_args()

    if args.chunk_size <= 0 or not 0 <= args.overlap < args.chunk_size:
        parser.error("chunk-size must be positive and 0 <= overlap < chunk-size")
    if not 1 <= args.semantic_percentile <= 99:
        parser.error("semantic-percentile must be between 1 and 99")

    source = Path(args.file)
    if not source.exists() or source.suffix.lower() not in (".md", ".txt"):
        parser.error("Provide an existing .md or .txt file with --file")
    text = source.read_text(encoding="utf-8").strip()
    if not text:
        parser.error("The selected document is empty")

    print(f"\nDOCUMENT: {source} | {len(text)} characters")
    print("NOTE: Character counts are not token counts.\n")
    selected = STRATEGIES if args.method == "all" else (args.method,)
    output_dir = Path(args.out)
    output_dir.mkdir(parents=True, exist_ok=True)

    for name in selected:
        print("\n" + "=" * 72)
        print(f"{name.upper()} CHUNKING")
        print("=" * 72)
        if name == "structure" and "#" not in text:
            print("Tip: structure-aware splitting works best on Markdown with # headings.")
        try:
            chunks = run_method(
                name, text, args.chunk_size, args.overlap, args.semantic_percentile
            )
        except (ImportError, OSError, RuntimeError) as exc:
            print(f"Could not run {name}: {exc}")
            print("Try the non-semantic methods first, or check model installation/cache.")
            continue

        print(f"TOTAL CHUNKS: {len(chunks)}")
        for number, chunk in enumerate(chunks, start=1):
            body = chunk["text"]
            print(f"\n--- CHUNK {number} | {len(body)} characters ---")
            if chunk["metadata"]:
                print("METADATA:", chunk["metadata"])
            print(body)
        result_file = output_dir / f"{name}.json"
        result_file.write_text(
            json.dumps(
                {"method": name, "source": str(source), "chunks": chunks},
                ensure_ascii=False, indent=2,
            ),
            encoding="utf-8",
        )
        print(f"\nSaved: {result_file}")
    print("\nDISCUSS: Which boundaries respect full ideas? Where was context lost?")


if __name__ == "__main__":
    main()
