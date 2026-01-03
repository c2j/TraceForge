"""Settings repository for key-value operations on Settings entity."""

from typing import Optional, Union, Any
from sqlalchemy.orm import Session
import json

from database.models import Settings


class SettingsRepository:
    """Repository for Settings CRUD operations."""

    def __init__(self, session: Session):
        """Initialize repository with database session."""
        self.session = session

    def get(self, key: str) -> Optional[Any]:
        """Get setting value by key."""
        settings = self.session.query(Settings).filter(Settings.key == key).first()
        if not settings:
            return None

        # Try to parse as JSON, return as-is if fails
        try:
            return json.loads(settings.value)
        except:
            return settings.value

    def set(self, key: str, value: Any) -> Settings:
        """Set a setting value (create or update)."""
        # Convert complex types to JSON
        if isinstance(value, (dict, list)):
            value_str = json.dumps(value)
        else:
            value_str = str(value)

        settings = self.session.query(Settings).filter(Settings.key == key).first()
        if settings:
            settings.value = value_str
        else:
            settings = Settings(key=key, value=value_str)
            self.session.add(settings)
        self.session.commit()
        return settings

    def get_all(self) -> dict:
        """Get all settings as a dictionary."""
        all_settings = self.session.query(Settings).all()
        result = {}
        for s in all_settings:
            try:
                result[s.key] = json.loads(s.value)
            except:
                result[s.key] = s.value
        return result

    def delete(self, key: str) -> bool:
        """Delete setting by key."""
        settings = self.session.query(Settings).filter(Settings.key == key).first()
        if settings:
            self.session.delete(settings)
            self.session.commit()
            return True
        return False
