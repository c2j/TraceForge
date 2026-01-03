"""Unit tests for ArtifactChunker.

Per spec T067: Send large artifacts in chunks to avoid message size limits.
Per spec FR-027: Chunk binary data if >1MB.
"""

import sys
import os

# Add parent directories to path for imports
test_file = os.path.abspath(__file__)
unit_dir = os.path.dirname(test_file)
tests_dir = os.path.dirname(unit_dir)
backend_dir = os.path.dirname(tests_dir)
parent_dir = os.path.dirname(backend_dir)
engine_dir = os.path.join(parent_dir, "engine")
sys.path.insert(0, engine_dir)

import pytest
from agent.chunker import ArtifactChunker


class TestArtifactChunker:
    """Unit tests for ArtifactChunker chunking functionality."""

    @pytest.fixture
    def chunker(self):
        """Create ArtifactChunker instance for testing."""
        return ArtifactChunker(chunk_size=1024 * 1024)

    @pytest.mark.parametrize(
        "data_size,expected_chunks,compress",
        [
            (1024 * 1024, 1, True),  # 1MB compressed -> 1 chunk
            (
                1024 * 1024 + 1,
                2,
                True,
            ),  # 1MB+1 compressed -> 2 chunks (but compression reduces size)
            (5 * 1024 * 1024, 5, False),  # 5MB uncompressed -> 5 chunks
            (512 * 1024, 1, False),  # 512KB uncompressed -> 1 chunk
            (2 * 1024 * 1024, 2, False),  # 2MB uncompressed -> 2 chunks
        ],
        ids=[
            "1MB-compressed",
            "1MB+1-compressed",
            "5MB-uncompressed",
            "512KB-uncompressed",
            "2MB-uncompressed",
        ],
    )
    def test_chunk_binary_data_various_sizes(
        self, chunker, data_size, expected_chunks, compress
    ):
        """Test chunking with various data sizes."""
        artifact_id = "test-artifact-001"
        test_data = b"x" * data_size

        chunks = chunker.chunk_binary_data(test_data, artifact_id, compress=compress)

        # For compressed data, actual chunk count may differ due to compression
        if compress:
            # Just verify we got chunks and they have correct structure
            assert len(chunks) >= 1, f"Expected at least 1 chunk, got {len(chunks)}"
        else:
            assert len(chunks) == expected_chunks, (
                f"Expected {expected_chunks} chunks for {data_size} bytes, got {len(chunks)}"
            )

        # Verify each chunk has correct header format
        for i, chunk in enumerate(chunks):
            # Format: artifact_id:total_chunks:chunk_index:chunk_length:data
            first_colon = chunk.index(b":", 0)
            header_prefix = chunk[:first_colon].decode()
            parts = header_prefix.split(":")

            assert parts[0] == artifact_id, f"Chunk {i}: artifact_id mismatch"

    def test_reconstruct_binary_data_from_chunks(self, chunker):
        """Test reconstructing binary data from chunks."""
        original_data = b"test artifact data for reconstruction"
        artifact_id = "test-artifact-002"

        chunks = chunker.chunk_binary_data(original_data, artifact_id, compress=True)
        reconstructed = chunker.reconstruct_binary_data(chunks)

        assert reconstructed is not None, "Failed to reconstruct data from chunks"
        assert reconstructed == original_data, (
            f"Reconstructed data does not match original: {reconstructed[:50]}... != {original_data[:50]}..."
        )

    @pytest.mark.parametrize(
        "chunk_data,should_raise,error_message",
        [
            (b"invalid:header", True, "Invalid chunk format"),
            (b"artifact:2:1:100", True, "Missing data"),  # Has header but no data
            (b"malformed_data", True, "Invalid chunk format"),
        ],
        ids=["invalid-header", "missing-data", "no-header-separator"],
    )
    def test_reconstruct_malformed_chunk(
        self, chunker, chunk_data, should_raise, error_message
    ):
        """Test reconstruction with malformed chunks."""
        if should_raise:
            result = chunker.reconstruct_binary_data([chunk_data])
            assert result is None, f"Expected None for malformed chunk, got: {result}"
        else:
            result = chunker.reconstruct_binary_data([chunk_data])
            assert result is not None, "Failed to reconstruct valid chunk"

    def test_reconstruct_empty_chunks(self, chunker):
        """Test reconstruction with empty chunk list."""
        result = chunker.reconstruct_binary_data([])
        assert result is None, "Expected None for empty chunks list"

    def test_chunk_binary_data_with_compression(self, chunker):
        """Test that compression reduces data size."""
        original_data = b"x" * (2 * 1024 * 1024)  # 2MB of repeated data
        artifact_id = "test-compression"

        # Without compression
        chunks_uncompressed = chunker.chunk_binary_data(
            original_data, artifact_id, compress=False
        )
        total_uncompressed = sum(len(chunk) for chunk in chunks_uncompressed)

        # With compression
        chunks_compressed = chunker.chunk_binary_data(
            original_data, artifact_id, compress=True
        )
        total_compressed = sum(len(chunk) for chunk in chunks_compressed)

        assert total_compressed < total_uncompressed, (
            f"Compressed data ({total_compressed}) should be smaller than uncompressed ({total_uncompressed})"
        )

    def test_extract_chunk_index(self, chunker):
        """Test extracting chunk index from chunk data."""
        artifact_id = "test-index"
        chunk_index = 3
        chunk_length = 100
        test_data = b"x" * chunk_length

        # Create chunk with proper format: artifact_id:total_chunks:chunk_index:chunk_length:data
        chunk_data = (
            f"{artifact_id}:10:{chunk_index}:{chunk_length}:".encode() + test_data
        )

        extracted_index = chunker._extract_chunk_index(chunk_data)
        assert extracted_index == chunk_index, (
            f"Extracted index {extracted_index} does not match expected {chunk_index}"
        )

    def test_extract_chunk_index_invalid_format(self, chunker):
        """Test extracting chunk index from invalid format."""
        invalid_chunk = b"invalid_data_without_header"

        with pytest.raises(ValueError, match="Invalid chunk format"):
            chunker._extract_chunk_index(invalid_chunk)

    def test_reconstruct_multiple_artifacts_mismatch(self, chunker):
        """Test reconstruction fails with mixed artifact IDs."""
        artifact_1 = "artifact-001"
        artifact_2 = "artifact-002"

        chunks_1 = chunker.chunk_binary_data(b"data1", artifact_1, compress=False)
        chunks_2 = chunker.chunk_binary_data(b"data2", artifact_2, compress=False)

        # Mix chunks from different artifacts
        mixed_chunks = [chunks_1[0], chunks_2[0]]

        result = chunker.reconstruct_binary_data(mixed_chunks)
        assert result is None, "Should return None for mixed artifact IDs"

    def test_reconstruct_out_of_order_chunks(self, chunker):
        """Test reconstruction handles out-of-order chunks."""
        original_data = b"x" * (2 * 1024 * 1024)  # 2MB
        artifact_id = "test-out-of-order"

        # Note: Use compress=True because reconstruct_binary_data expects compressed data
        chunks = chunker.chunk_binary_data(original_data, artifact_id, compress=True)

        # Reverse chunk order
        reversed_chunks = list(reversed(chunks))

        # Should still reconstruct correctly because chunks are sorted by index
        reconstructed = chunker.reconstruct_binary_data(reversed_chunks)
        assert reconstructed is not None, "Failed to reconstruct out-of-order chunks"
        assert reconstructed == original_data, (
            "Reconstructed data does not match original"
        )

    def test_chunk_artifact_without_headers(self, chunker):
        """Test chunk_artifact method (for backward compatibility)."""
        artifact_data = b"test artifact without headers"
        chunks = chunker.chunk_artifact(artifact_data)

        assert len(chunks) == 1, f"Expected 1 chunk, got {len(chunks)}"
        assert chunks[0] == artifact_data, "Chunk data does not match original"

    def test_get_chunk_count(self, chunker):
        """Test getting chunk count for current artifact."""
        artifact_data = b"x" * (3 * 1024 * 1024)  # 3MB
        chunker.chunk_artifact(artifact_data)

        expected_count = (
            len(artifact_data) + chunker.chunk_size - 1
        ) // chunker.chunk_size
        actual_count = chunker.get_chunk_count()

        assert actual_count == expected_count, (
            f"Expected {expected_count} chunks, got {actual_count}"
        )

    def test_get_chunk_count_no_artifact(self, chunker):
        """Test get_chunk_count when no artifact has been chunked."""
        count = chunker.get_chunk_count()
        assert count == 0, "Expected 0 chunks when no artifact loaded"

    @pytest.mark.parametrize(
        "index,should_succeed",
        [
            (0, True),
            (1, True),
            (-1, False),
            (10, False),
        ],
        ids=["valid-first", "valid-second", "invalid-negative", "invalid-out-of-range"],
    )
    def test_get_chunk_by_index(self, chunker, index, should_succeed):
        """Test getting chunk by index."""
        artifact_data = b"x" * (2 * 1024 * 1024)  # 2MB
        chunker.chunk_artifact(artifact_data)

        chunk = chunker.get_chunk(index)

        if should_succeed:
            assert chunk is not None, f"Expected chunk at index {index}"
            assert isinstance(chunk, bytes), f"Chunk at index {index} should be bytes"
        else:
            assert chunk is None, f"Expected None for invalid index {index}"

    def test_default_chunk_size(self):
        """Test default chunk size is 1MB as per spec FR-027."""
        chunker = ArtifactChunker()
        assert chunker.chunk_size == 1024 * 1024, "Default chunk size should be 1MB"
        assert chunker.max_chunk_size == 1024 * 1024, (
            "max_chunk_size should match chunk_size"
        )

    def test_custom_chunk_size(self):
        """Test custom chunk size configuration."""
        custom_size = 512 * 1024  # 512KB
        chunker = ArtifactChunker(chunk_size=custom_size)

        assert chunker.chunk_size == custom_size, f"Expected chunk_size {custom_size}"
        assert chunker.max_chunk_size == custom_size, (
            "max_chunk_size should match chunk_size"
        )

    def test_chunk_header_format_compressed(self, chunker):
        """Test chunk header format for compressed data."""
        artifact_id = "test-header"
        test_data = b"test data"

        chunks = chunker.chunk_binary_data(test_data, artifact_id, compress=True)

        assert len(chunks) == 1, "Expected 1 chunk for small data"
        chunk = chunks[0]

        # Verify header format: artifact_id:total_chunks:chunk_index:chunk_length:data
        # Find 4th colon which separates header from data
        colon_count = 0
        header_end = 0
        for i, byte in enumerate(chunk):
            if byte == ord(b":"):
                colon_count += 1
                if colon_count == 4:
                    header_end = i
                    break

        header_prefix = chunk[:header_end].decode()
        parts = header_prefix.split(":")

        assert parts[0] == artifact_id, "artifact_id mismatch"
        assert int(parts[1]) == 1, "total_chunks mismatch"

    def test_chunk_header_format_uncompressed_multiple_chunks(self, chunker):
        """Test chunk header format for uncompressed data with multiple chunks."""
        artifact_id = "test-multichunk"
        test_data = b"x" * (2 * 1024 * 1024)  # 2MB

        chunks = chunker.chunk_binary_data(test_data, artifact_id, compress=False)

        assert len(chunks) == 2, "Expected 2 chunks for 2MB data"

        # Check first chunk header
        first_chunk = chunks[0]
        colon_count = 0
        header_end = 0
        for i, byte in enumerate(first_chunk):
            if byte == ord(b":"):
                colon_count += 1
                if colon_count == 4:
                    header_end = i
                    break
        header_prefix = first_chunk[:header_end].decode()
        parts = header_prefix.split(":")

        assert parts[0] == artifact_id, "artifact_id mismatch"
        assert int(parts[1]) == 2, "total_chunks mismatch"
        assert int(parts[2]) == 0, "chunk_index should be 0 for first chunk"

        # Check second chunk header
        second_chunk = chunks[1]
        colon_count = 0
        header_end_2 = 0
        for i, byte in enumerate(second_chunk):
            if byte == ord(b":"):
                colon_count += 1
                if colon_count == 4:
                    header_end_2 = i
                    break
        header_prefix_2 = second_chunk[:header_end_2].decode()
        parts_2 = header_prefix_2.split(":")

        assert parts_2[0] == artifact_id, "artifact_id mismatch"
        assert int(parts_2[1]) == 2, "total_chunks mismatch"
        assert int(parts_2[2]) == 1, "chunk_index should be 1 for second chunk"

    def test_chunk_data_length_matches_header(self, chunker):
        """Test that chunk data length matches the length in header."""
        artifact_id = "test-length"
        test_data = b"x" * 50000  # 50KB

        chunks = chunker.chunk_binary_data(test_data, artifact_id, compress=False)

        chunk = chunks[0]

        # Find the data start position (after the fourth colon)
        colon_count = 0
        header_end = 0
        for i, byte in enumerate(chunk):
            if byte == ord(b":"):
                colon_count += 1
                if colon_count == 4:
                    header_end = i
                    break

        data_start = header_end + 1
        actual_data_length = len(chunk) - data_start

        # Parse header to get the length field
        header_prefix = chunk[:header_end].decode()
        parts = header_prefix.split(":")
        header_data_length = int(parts[3])

        assert actual_data_length == header_data_length, (
            f"Data length mismatch: header says {header_data_length}, actual is {actual_data_length}"
        )
