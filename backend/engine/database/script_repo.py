"""Script repository for CRUD operations on Script entity."""

from typing import List, Optional, Union
from sqlalchemy.orm import Session
import json

from database.models import Script


class ScriptRepository:
    """Repository for Script CRUD operations."""

    def __init__(self, session: Session):
        """Initialize repository with database session."""
        self.session = session

    def create(self, script: Union[Script, dict]) -> Script:
        """Create a new script."""
        if isinstance(script, dict):
            script_obj = Script(
                id=script.get("id"),
                project_id=script.get("project_id"),
                script_json=json.dumps(script),
                synced_at=None,
            )
            script = script_obj
        self.session.add(script)
        self.session.commit()
        self.session.refresh(script)
        return script

    def get(self, script_id: str) -> Optional[dict]:
        """Get script by ID as dict for compatibility."""
        script = self.session.query(Script).filter(Script.id == script_id).first()
        if script:
            try:
                return json.loads(script.script_json)
            except:
                return {
                    "id": script.id,
                    "project_id": script.project_id,
                    "script_json": script.script_json,
                }
        return None

    def get_by_id(self, script_id: str) -> Optional[Script]:
        """Get script by ID."""
        return self.session.query(Script).filter(Script.id == script_id).first()

    def get_all(self) -> List[Script]:
        """Get all scripts."""
        return self.session.query(Script).all()

    def get_by_project_id(self, project_id: str) -> List[Script]:
        """Get all scripts for a project."""
        return self.session.query(Script).filter(Script.project_id == project_id).all()

    def update(self, script_id: str, script: Union[Script, dict]) -> Optional[dict]:
        """Update an existing script."""
        script_obj = self.get_by_id(script_id)
        if not script_obj:
            return None

        if isinstance(script, dict):
            script_obj.script_json = json.dumps(script)
            if "project_id" in script:
                script_obj.project_id = script["project_id"]
        else:
            script_obj = script

        self.session.commit()
        self.session.refresh(script_obj)

        try:
            return json.loads(script_obj.script_json)
        except:
            return {
                "id": script_obj.id,
                "project_id": script_obj.project_id,
                "script_json": script_obj.script_json,
            }

    def delete(self, script_id: str) -> bool:
        """Delete script by ID."""
        script = self.get_by_id(script_id)
        if script:
            self.session.delete(script)
            self.session.commit()
            return True
        return False

    def list(self) -> List[dict]:
        """List all scripts as dicts."""
        scripts = self.session.query(Script).all()
        result = []
        for script in scripts:
            try:
                result.append(json.loads(script.script_json))
            except:
                result.append(
                    {
                        "id": script.id,
                        "project_id": script.project_id,
                        "script_json": script.script_json,
                    }
                )
        return result
