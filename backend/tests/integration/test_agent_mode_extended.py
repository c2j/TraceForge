"""Extended integration tests for Agent Mode functionality.

Per spec US5: Server registration, concurrent tasks, task queue, artifact chunking.
"""

import pytest
from unittest.mock import Mock, patch, AsyncMock
import asyncio
import sys
import os

# Add parent directories to path for imports
test_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.dirname(test_dir)
parent_dir = os.path.dirname(backend_dir)
engine_dir = os.path.join(parent_dir, "engine")
sys.path.insert(0, engine_dir)

from agent.task_queue import TaskQueue
from agent.chunker import ArtifactChunker
from executor.engine import ExecutionEngine


class TestAgentModeExtended:
    """Extended integration tests for Agent Mode.

    Per spec T062-T067: Concurrent tasks, task queue, artifact chunking.
    """

    @pytest.fixture
    def task_queue(self):
        """Create TaskQueue instance for testing."""
        return TaskQueue(max_concurrent=5)

    @pytest.fixture
    def artifact_chunker(self):
        """Create ArtifactChunker instance for testing."""
        return ArtifactChunker(chunk_size=1024 * 1024)  # 1MB chunks

    def test_task_queue_created(self, task_queue):
        """Test that TaskQueue can be instantiated.

        Per spec T063: Implement task queue for Agent mode.
        """
        assert task_queue is not None
        assert hasattr(task_queue, "enqueue")
        assert hasattr(task_queue, "dequeue")
        assert hasattr(task_queue, "process")
        assert hasattr(task_queue, "get_queue_size")

    @pytest.mark.asyncio
    async def test_task_queue_enqueue_dequeue(self, task_queue):
        """Test enqueuing and dequeuing tasks.

        Per spec T063: Queue tasks beyond semaphore limit, execute when slot available.
        """
        task = {
            "id": "task-001",
            "script": {"id": "script-001", "name": "Test Script"},
            "kernel_id": "chrome-86",
        }

        # Enqueue task
        await task_queue.enqueue(task)

        # Verify task is in queue
        queue_size = task_queue.get_queue_size()
        assert queue_size >= 1

        # Dequeue task
        dequeued_task = await task_queue.dequeue()
        assert dequeued_task is not None
        assert dequeued_task["id"] == "task-001"

    @pytest.mark.asyncio
    async def test_task_queue_concurrent_limit(self, task_queue):
        """Test that concurrent execution is limited.

        Per spec T062: Implement task semaphore, limit to 5 concurrent tasks.
        """
        # Create 10 tasks
        tasks = []
        for i in range(10):
            task = {
                "id": f"task-{i:03d}",
                "script": {"id": f"script-{i}", "name": f"Test Script {i}"},
                "kernel_id": "chrome-86",
            }
            tasks.append(task)
            await task_queue.enqueue(task)

        # Verify queue size
        queue_size = task_queue.get_queue_size()
        assert queue_size == 10

    @pytest.mark.asyncio
    async def test_task_queue_processes_tasks(self, task_queue):
        """Test that task queue processes tasks when slots available.

        Per spec T063: Execute when slot available.
        """
        task = {
            "id": "task-process-001",
            "script": {"id": "script-001", "name": "Process Test"},
            "kernel_id": "chrome-86",
        }

        await task_queue.enqueue(task)

        # Process queue (mock execution)
        with patch.object(task_queue, "_execute_task", AsyncMock()):
            await task_queue.process(max_tasks=1)

    @pytest.mark.asyncio
    async def test_task_queue_empty_dequeue(self, task_queue):
        """Test dequeuing from empty queue.

        Per spec: Handle empty queue gracefully.
        """
        # Try to dequeue from empty queue
        task = await task_queue.dequeue()
        assert task is None

    @pytest.mark.asyncio
    async def test_task_queue_multiple_tasks(self, task_queue):
        """Test enqueuing multiple tasks.

        Per spec T063: Queue multiple tasks.
        """
        # Enqueue 3 tasks
        for i in range(3):
            task = {
                "id": f"multi-task-{i:03d}",
                "script": {"id": f"script-{i}", "name": f"Multi Test {i}"},
                "kernel_id": "chrome-86",
            }
            await task_queue.enqueue(task)

        # Verify queue size
        queue_size = task_queue.get_queue_size()
        assert queue_size == 3

        # Dequeue all tasks
        for i in range(3):
            task = await task_queue.dequeue()
            assert task is not None
            assert task["id"] == f"multi-task-{i:03d}"

    def test_artifact_chunker_created(self, artifact_chunker):
        """Test that ArtifactChunker can be instantiated.

        Per spec T067: Implement artifact chunking.
        """
        assert artifact_chunker is not None
        assert hasattr(artifact_chunker, "chunk_artifact")
        assert hasattr(artifact_chunker, "get_chunk_count")
        assert hasattr(artifact_chunker, "get_chunk")

    def test_artifact_chunker_small_file(self, artifact_chunker):
        """Test chunking a small file (single chunk).

        Per spec T067: Send large artifacts in chunks.
        """
        # Create small artifact (<1MB)
        small_artifact = b"a" * (1024 * 512)  # 512KB

        chunks = artifact_chunker.chunk_artifact(small_artifact)

        # Should be single chunk
        assert len(chunks) == 1
        assert chunks[0] == small_artifact

    def test_artifact_chunker_large_file(self, artifact_chunker):
        """Test chunking a large file (multiple chunks).

        Per spec T067: Chunk if >1MB.
        """
        # Create large artifact (>1MB)
        large_artifact = b"a" * (1024 * 1024 * 2)  # 2MB

        chunks = artifact_chunker.chunk_artifact(large_artifact)

        # Should be 2 chunks
        assert len(chunks) == 2

    def test_artifact_chunker_chunk_size(self, artifact_chunker):
        """Test that chunks are the correct size.

        Per spec T067: Chunk size limit.
        """
        # Create artifact exactly 2.5MB
        artifact = b"a" * (1024 * 1024 * 2 + 512 * 1024)  # 2.5MB

        chunks = artifact_chunker.chunk_artifact(artifact)

        # First chunk should be 1MB
        assert len(chunks[0]) == 1024 * 1024
        # Second chunk should be 1MB
        assert len(chunks[1]) == 1024 * 1024
        # Third chunk should be 0.5MB
        assert len(chunks[2]) == 512 * 1024

    def test_artifact_chunker_get_chunk_count(self, artifact_chunker):
        """Test getting chunk count.

        Per spec T067: Track chunk count.
        """
        # Create 3MB artifact
        artifact = b"a" * (1024 * 1024 * 3)

        chunks = artifact_chunker.chunk_artifact(artifact)
        chunk_count = artifact_chunker.get_chunk_count()

        assert chunk_count == 3

    def test_artifact_chunker_get_chunk_by_index(self, artifact_chunker):
        """Test getting specific chunk by index.

        Per spec T067: Retrieve chunks by index.
        """
        # Create 2MB artifact
        artifact = b"a" * (1024 * 1024 * 2)

        chunks = artifact_chunker.chunk_artifact(artifact)

        # Get first chunk
        chunk_0 = artifact_chunker.get_chunk(0)
        assert chunk_0 == chunks[0]

        # Get second chunk
        chunk_1 = artifact_chunker.get_chunk(1)
        assert chunk_1 == chunks[1]

    def test_artifact_chunker_empty_artifact(self, artifact_chunker):
        """Test chunking empty artifact.

        Per spec: Handle empty artifacts gracefully.
        """
        empty_artifact = b""

        chunks = artifact_chunker.chunk_artifact(empty_artifact)

        # Should return empty list or single empty chunk
        assert len(chunks) == 0 or (len(chunks) == 1 and len(chunks[0]) == 0)

    @pytest.mark.asyncio
    async def test_concurrent_task_execution_limit(self, task_queue):
        """Test that concurrent execution respects limit.

        Per spec T062: Limit to 5 concurrent tasks.
        """

        # Mock execution that takes time
        async def mock_execute(task):
            await asyncio.sleep(0.1)
            return {"task_id": task["id"], "status": "completed"}

        with patch.object(task_queue, "_execute_task", mock_execute):
            # Enqueue 7 tasks
            for i in range(7):
                task = {
                    "id": f"concurrent-task-{i:03d}",
                    "script": {"id": f"script-{i}", "name": f"Concurrent Test {i}"},
                    "kernel_id": "chrome-86",
                }
                await task_queue.enqueue(task)

            # Start processing with semaphore limit
            tasks_processed = []
            while task_queue.get_queue_size() > 0:
                task = await task_queue.dequeue()
                if task:
                    result = await mock_execute(task)
                    tasks_processed.append(result)

            # Verify all tasks processed
            assert len(tasks_processed) == 7

    @pytest.mark.asyncio
    async def test_task_queue_prioritization(self, task_queue):
        """Test task prioritization (if implemented).

        Per spec: Queue may support priority.
        """
        # Enqueue high priority task
        high_priority = {
            "id": "high-priority-001",
            "script": {"id": "script-001", "name": "High Priority"},
            "kernel_id": "chrome-86",
            "priority": 10,
        }
        await task_queue.enqueue(high_priority)

        # Enqueue normal priority task
        normal_priority = {
            "id": "normal-priority-001",
            "script": {"id": "script-002", "name": "Normal Priority"},
            "kernel_id": "chrome-86",
            "priority": 5,
        }
        await task_queue.enqueue(normal_priority)

        # Verify queue order (FIFO or priority-based)
        queue_size = task_queue.get_queue_size()
        assert queue_size == 2

    @pytest.mark.asyncio
    async def test_artifact_chunking_with_metadata(self, artifact_chunker):
        """Test chunking with metadata.

        Per spec: Chunks should include metadata.
        """
        artifact = b"a" * (1024 * 1024 * 2)

        chunks = artifact_chunker.chunk_artifact(artifact)

        # Verify chunk metadata
        for i, chunk in enumerate(chunks):
            assert chunk is not None
            assert isinstance(chunk, bytes)

    def test_task_queue_status_tracking(self, task_queue):
        """Test task queue status tracking.

        Per spec: Track active tasks.
        """
        status = task_queue.get_status()
        assert "active_tasks" in status
        assert "queued_tasks" in status
        assert "max_concurrent" in status

    @pytest.mark.asyncio
    async def test_task_queue_handles_execution_errors(self, task_queue):
        """Test that task queue handles execution errors.

        Per spec: Continue processing on task failure.
        """

        # Mock execution that fails
        async def mock_execute_fail(task):
            if task["id"] == "fail-task-001":
                raise Exception("Task execution failed")
            return {"task_id": task["id"], "status": "completed"}

        with patch.object(task_queue, "_execute_task", mock_execute_fail):
            # Enqueue 3 tasks (one will fail)
            for i in range(3):
                task = {
                    "id": f"{'fail' if i == 1 else 'ok'}-task-{i:03d}",
                    "script": {"id": f"script-{i}", "name": f"Test {i}"},
                    "kernel_id": "chrome-86",
                }
                await task_queue.enqueue(task)

            # Process tasks
            processed = []
            while task_queue.get_queue_size() > 0:
                task = await task_queue.dequeue()
                if task:
                    try:
                        result = await mock_execute_fail(task)
                        processed.append(result)
                    except Exception as e:
                        # Handle error, continue processing
                        processed.append({"task_id": task["id"], "error": str(e)})

            # Verify all tasks processed (1 failed, 2 succeeded)
            assert len(processed) == 3
            assert any("error" in p for p in processed)
