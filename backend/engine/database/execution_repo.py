"""Execution repository for CRUD operations on Execution entity with cleanup logic."""

import json
from typing import List, Optional, Union
from sqlalchemy import desc, func
from sqlalchemy.orm import Session

from database.models import Execution


# Retention limits per spec
DESKTOP_MAX_EXECUTIONS = 100
AGENT_MAX_EXECUTIONS = 1000


class ExecutionRepository:
    """Repository for Execution CRUD operations with automatic cleanup."""

    def __init__(self, session: Session, agent_mode: bool = False):
        """Initialize repository with database session and mode."""
        self.session = session
        self.agent_mode = agent_mode
        self.max_executions = AGENT_MAX_EXECUTIONS if agent_mode else DESKTOP_MAX_EXECUTIONS

    def create(self, execution: Union[Execution, dict]) -> Execution:
        """Create a new execution after cleanup if needed."""
        self._cleanup_old_executions()
        if isinstance(execution, dict):
            artifacts_json = json.dumps(execution.get("artifacts", {}))
            # Map start_time/end_time to created_at/updated_at
            start_time = execution.get("start_time")
            end_time = execution.get("end_time")
            duration_ms = execution.get("duration_ms", 0)

            # Calculate duration_ms from timestamps if not provided
            if duration_ms == 0 and start_time and end_time:
                from datetime import datetime

                try:
                    start = datetime.fromisoformat(start_time.replace("Z", "+00:00"))
                    end = datetime.fromisoformat(end_time.replace("Z", "+00:00"))
                    duration_ms = int((end - start).total_seconds() * 1000)
                except:
                    pass

            execution_obj = Execution(
                id=execution.get("id"),
                script_id=execution.get("script_id"),
                kernel_id=execution.get("kernel_id"),
                status=execution.get("status"),
                duration_ms=duration_ms,
                trace_path=execution.get("trace_path"),
                artifacts=artifacts_json,
            )
            execution = execution_obj
        self.session.add(execution)
        self.session.commit()
        self.session.refresh(execution)
        return execution

    def get(self, execution_id: str) -> Optional[dict]:
        """Get execution by ID as dict for compatibility."""
        execution = self.session.query(Execution).filter(Execution.id == execution_id).first()
        if execution:
            result = {
                "id": execution.id,
                "script_id": execution.script_id,
                "kernel_id": execution.kernel_id,
                "status": execution.status,
                "duration_ms": execution.duration_ms,
                "trace_path": execution.trace_path,
                "created_at": execution.created_at.isoformat() if execution.created_at else None,
                "updated_at": execution.updated_at.isoformat() if execution.updated_at else None,
                # Add start_time and end_time for compatibility
                "start_time": execution.created_at.isoformat() if execution.created_at else None,
                "end_time": execution.updated_at.isoformat() if execution.updated_at else None,
            }
            if execution.artifacts:
                try:
                    result["artifacts"] = json.loads(execution.artifacts)
                except:
                    result["artifacts"] = execution.artifacts
            return result
        return None

    def get_by_id(self, execution_id: str) -> Optional[Execution]:
        """Get execution by ID."""
        return self.session.query(Execution).filter(Execution.id == execution_id).first()

    def get_all(self) -> List[Execution]:
        """Get all executions."""
        return self.session.query(Execution).all()

    def get_by_script_id(self, script_id: str) -> List[Execution]:
        """Get all executions for a script, ordered by created_at desc."""
        return (
            self.session.query(Execution)
            .filter(Execution.script_id == script_id)
            .order_by(desc(Execution.created_at))
            .all()
        )

    def update(self, execution_id: str, execution: Union[Execution, dict]) -> Optional[dict]:
        """Update an existing execution."""
        execution_obj = self.get_by_id(execution_id)
        if not execution_obj:
            return None

        if isinstance(execution, dict):
            for key, value in execution.items():
                if key == "id":
                    continue
                if key == "start_time":
                    # Map to created_at
                    from datetime import datetime

                    try:
                        execution_obj.created_at = datetime.fromisoformat(
                            value.replace("Z", "+00:00")
                        )
                    except:
                        pass
                elif key == "end_time":
                    # Map to updated_at
                    from datetime import datetime

                    try:
                        execution_obj.updated_at = datetime.fromisoformat(
                            value.replace("Z", "+00:00")
                        )
                    except:
                        pass
                elif key == "artifacts" and isinstance(value, dict):
                    setattr(execution_obj, key, json.dumps(value))
                elif hasattr(execution_obj, key):
                    setattr(execution_obj, key, value)
        else:
            execution_obj = execution

        self.session.commit()
        self.session.refresh(execution_obj)

        result = {
            "id": execution_obj.id,
            "script_id": execution_obj.script_id,
            "kernel_id": execution_obj.kernel_id,
            "status": execution_obj.status,
            "duration_ms": execution_obj.duration_ms,
            "trace_path": execution_obj.trace_path,
            "created_at": execution_obj.created_at.isoformat()
            if execution_obj.created_at
            else None,
            "updated_at": execution_obj.updated_at.isoformat()
            if execution_obj.updated_at
            else None,
            # Add start_time and end_time for compatibility
            "start_time": execution_obj.created_at.isoformat()
            if execution_obj.created_at
            else None,
            "end_time": execution_obj.updated_at.isoformat() if execution_obj.updated_at else None,
        }
        if execution_obj.artifacts:
            try:
                result["artifacts"] = json.loads(execution_obj.artifacts)
            except:
                result["artifacts"] = execution_obj.artifacts
        return result

    def delete(self, execution_id: str) -> bool:
        """Delete execution by ID."""
        execution = self.get_by_id(execution_id)
        if execution:
            self.session.delete(execution)
            self.session.commit()
            return True
        return False

    def get_count(self) -> int:
        """Get total count of executions."""
        return self.session.query(func.count(Execution.id)).scalar()

    def list_by_script(self, script_id: str) -> List[dict]:
        """List executions by script as dicts."""
        executions = self.get_by_script_id(script_id)
        result = []
        for execution in executions:
            item = {
                "id": execution.id,
                "script_id": execution.script_id,
                "kernel_id": execution.kernel_id,
                "status": execution.status,
                "duration_ms": execution.duration_ms,
                "trace_path": execution.trace_path,
                "created_at": execution.created_at.isoformat() if execution.created_at else None,
                "updated_at": execution.updated_at.isoformat() if execution.updated_at else None,
                # Add start_time and end_time for compatibility
                "start_time": execution.created_at.isoformat() if execution.created_at else None,
                "end_time": execution.updated_at.isoformat() if execution.updated_at else None,
            }
            if execution.artifacts:
                try:
                    item["artifacts"] = json.loads(execution.artifacts)
                except:
                    item["artifacts"] = execution.artifacts
            result.append(item)
        return result

    def _cleanup_old_executions(self) -> None:
        """Delete oldest executions when limit is exceeded.

        Per spec FR-032: Desktop mode retains 100 records
        Per spec FR-033: Agent mode retains 1000 records
        """
        current_count = self.get_count()
        if current_count > self.max_executions:
            # Get oldest executions to delete
            excess = current_count - self.max_executions
            old_executions = (
                self.session.query(Execution).order_by(Execution.created_at).limit(excess).all()
            )
            for execution in old_executions:
                self.session.delete(execution)
            self.session.commit()
