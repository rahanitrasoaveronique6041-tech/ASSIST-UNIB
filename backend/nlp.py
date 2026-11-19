CHUNK_SIZE = 1100
CHUNK_OVERLAP = 140


def split_document(text: str) -> list[str]:
    normalized = "\n".join(line.strip() for line in text.splitlines()).strip()
    if not normalized:
        return []

    chunks: list[str] = []
    start = 0
    while start < len(normalized):
        end = min(start + CHUNK_SIZE, len(normalized))
        if end < len(normalized):
            boundary = normalized.rfind("\n", start + CHUNK_SIZE // 2, end)
            if boundary > start:
                end = boundary
        chunk = normalized[start:end].strip()
        if chunk:
            chunks.append(chunk)
        if end >= len(normalized):
            break
        start = max(end - CHUNK_OVERLAP, start + 1)
    return chunks
