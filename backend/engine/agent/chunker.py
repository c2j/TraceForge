"""Artifact chunking for WebSocket message transmission.

Per spec T067: Send large artifacts in chunks to avoid message size limits.
Per spec FR-027: Chunk binary data if >1MB.
"""

import zlib
from typing import Optional, Tuple
from utils.logging import Logger


class ArtifactChunker:
    """Handles chunking of large artifacts for WebSocket transmission."""

    def __init__(self, chunk_size: int = 1024 * 1024):
        """Initialize ArtifactChunker.

        Args:
            chunk_size: Maximum chunk size in bytes (default: 1MB per spec FR-027)
        """
        self.chunk_size = chunk_size
        self.max_chunk_size = chunk_size  # Alias for backward compatibility
        self.logger = Logger.get(__name__)
        self._current_artifact: Optional[bytes] = None
        self._current_chunks: list[bytes] = []

    def chunk_binary_data(
        self,
        data: bytes,
        artifact_id: str,
        compress: bool = True,
    ) -> list[bytes]:
        """Chunk binary data for WebSocket transmission.

        Args:
            data: Binary data to chunk
            artifact_id: Unique artifact identifier
            compress: Whether to compress data before chunking

        Returns:
            List of binary chunks
        """
        if compress:
            data = zlib.compress(data, level=6)
            self.logger.debug(f"Compressed artifact: {artifact_id}")

        chunks = []
        total_chunks = (len(data) + self.max_chunk_size - 1) // self.max_chunk_size

        for i in range(total_chunks):
            start = i * self.max_chunk_size
            end = min(start + self.max_chunk_size, len(data))
            chunk = data[start:end]

            # Add chunk header: [artifact_id:total_chunks:chunk_index:chunk_length]
            header = f"{artifact_id}:{total_chunks}:{i}:{len(chunk)}".encode()
            chunk_data = header + b":" + chunk

            chunks.append(chunk_data)

        self.logger.info(
            f"Chunked artifact {artifact_id}: {total_chunks} chunks, total size: {len(data)} bytes"
        )
        return chunks

    def reconstruct_binary_data(self, chunks: list[bytes]) -> Optional[bytes]:
        """Reconstruct binary data from chunks.

        Args:
            chunks: List of chunk data

        Returns:
            Reconstructed binary data
        """
        if not chunks:
            return None

        try:
            sorted_chunks = sorted(chunks, key=self._extract_chunk_index)
            artifact_id = None

            reconstructed_parts = []
            for chunk in sorted_chunks:
                # Parse header: [artifact_id:total_chunks:chunk_index:chunk_length]:data
                # Find 4th colon which separates header from data
                colon_positions = []
                pos = 0
                while True:
                    pos = chunk.find(b":", pos)
                    if pos == -1:
                        break
                    colon_positions.append(pos)
                    pos += 1

                if len(colon_positions) < 4:
                    raise ValueError("Invalid chunk format: not enough colons")

                header_end = colon_positions[3]
                header = chunk[:header_end].decode()
                data_start = header_end + 1

                parts = header.split(":")
                if len(parts) != 4:
                    raise ValueError(f"Invalid header format: expected 4 parts, got {len(parts)}")

                current_artifact_id, total_chunks_str, chunk_index_str, chunk_length_str = parts
                current_chunk_index = int(chunk_index_str)
                expected_chunk_index = self._extract_chunk_index(chunk)

                if current_chunk_index != expected_chunk_index:
                    raise ValueError(
                        f"Chunk index mismatch: {current_chunk_index} != {expected_chunk_index}"
                    )

                if artifact_id and current_artifact_id != artifact_id:
                    raise ValueError(
                        f"Artifact ID mismatch: {current_artifact_id} != {artifact_id}"
                    )

                artifact_id = current_artifact_id
                data = chunk[data_start:]
                reconstructed_parts.append(data)

            reconstructed = b"".join(reconstructed_parts)
            decompressed = zlib.decompress(reconstructed)

            self.logger.info(f"Reconstructed artifact {artifact_id}: {len(decompressed)} bytes")
            return decompressed

        except Exception as e:
            self.logger.error(f"Failed to reconstruct artifact: {e}")
            return None

    def _extract_chunk_index(self, chunk: bytes) -> int:
        """Extract chunk index from chunk data.

        Args:
            chunk: Chunk data with header

        Returns:
            Chunk index
        """
        try:
            # Header format: artifact_id:total_chunks:chunk_index:chunk_length
            # Find the 4th colon which separates header from data
            colon_positions = []
            pos = 0
            while True:
                pos = chunk.find(b":", pos)
                if pos == -1:
                    break
                colon_positions.append(pos)
                pos += 1

            if len(colon_positions) < 4:
                raise ValueError("Invalid chunk format: not enough colons")

            # Header is everything before the 4th colon
            header_end = colon_positions[3]
            header = chunk[:header_end].decode()
            parts = header.split(":")
            return int(parts[2])  # chunk_index is at index 2
        except Exception:
            raise ValueError("Invalid chunk format")

    def chunk_artifact(self, artifact_data: bytes) -> list[bytes]:
        """Chunk artifact data (for test compatibility).

        Args:
            artifact_data: Binary data to chunk

        Returns:
            List of binary chunks
        """
        self._current_artifact = artifact_data
        chunks = []
        total_chunks = (len(artifact_data) + self.chunk_size - 1) // self.chunk_size

        for i in range(total_chunks):
            start = i * self.chunk_size
            end = min(start + self.chunk_size, len(artifact_data))
            chunk = artifact_data[start:end]
            chunks.append(chunk)

        self._current_chunks = chunks
        self.logger.info(f"Chunked artifact: {total_chunks} chunks")
        return chunks

    def get_chunk_count(self) -> int:
        """Get number of chunks for current artifact (for test compatibility).

        Returns:
            Number of chunks
        """
        if self._current_artifact is None:
            return 0
        return (len(self._current_artifact) + self.chunk_size - 1) // self.chunk_size

    def get_chunk(self, index: int) -> Optional[bytes]:
        """Get chunk by index (for test compatibility).

        Args:
            index: Chunk index

        Returns:
            Chunk data or None if index out of range
        """
        if not self._current_chunks or index < 0 or index >= len(self._current_chunks):
            return None
        return self._current_chunks[index]
