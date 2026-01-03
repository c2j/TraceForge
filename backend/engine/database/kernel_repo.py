"""Kernel repository for CRUD operations on Kernel entity."""

from typing import List, Optional, Union
from sqlalchemy.orm import Session

from database.models import Kernel


class KernelRepository:
    """Repository for Kernel CRUD operations."""

    def __init__(self, session: Session):
        """Initialize repository with database session."""
        self.session = session

    def create(self, kernel: Union[Kernel, dict]) -> Kernel:
        """Create a new kernel."""
        if isinstance(kernel, dict):
            # Map test dict fields to model fields
            kernel_kwargs = {
                "id": kernel.get("id"),
                "name": kernel.get("name"),
                "executable_path": kernel.get("executable_path") or kernel.get("browser_path"),
                "version": kernel.get("version"),
                "is_default_record": kernel.get("is_default_record", False),
                "is_default_agent": kernel.get("is_default_agent", False),
            }
            kernel = Kernel(**kernel_kwargs)
        self.session.add(kernel)
        self.session.commit()
        self.session.refresh(kernel)
        return kernel

    def get(self, kernel_id: str) -> Optional[dict]:
        """Get kernel by ID as dict for compatibility."""
        kernel = self.session.query(Kernel).filter(Kernel.id == kernel_id).first()
        if kernel:
            return {
                "id": kernel.id,
                "name": kernel.name,
                "type": "chrome",  # Default type for compatibility
                "browser_path": kernel.executable_path,
                "executable_path": kernel.executable_path,
                "version": kernel.version,
                "is_default_record": kernel.is_default_record,
                "is_default_agent": kernel.is_default_agent,
            }
        return None

    def get_by_id(self, kernel_id: str) -> Optional[Kernel]:
        """Get kernel by ID."""
        return self.session.query(Kernel).filter(Kernel.id == kernel_id).first()

    def get_all(self) -> List[Kernel]:
        """Get all kernels."""
        return self.session.query(Kernel).all()

    def get_default_record(self) -> Optional[Kernel]:
        """Get default recording kernel."""
        return self.session.query(Kernel).filter(Kernel.is_default_record == True).first()

    def get_default_agent(self) -> Optional[Kernel]:
        """Get default agent mode kernel."""
        return self.session.query(Kernel).filter(Kernel.is_default_agent == True).first()

    def update(self, kernel_id: str, kernel: Union[Kernel, dict]) -> Optional[dict]:
        """Update an existing kernel."""
        kernel_obj = self.get_by_id(kernel_id)
        if not kernel_obj:
            return None

        if isinstance(kernel, dict):
            for key, value in kernel.items():
                if key == "id":
                    continue
                if key == "browser_path":
                    kernel_obj.executable_path = value
                elif key == "type":
                    pass  # Not stored in model
                elif hasattr(kernel_obj, key):
                    setattr(kernel_obj, key, value)
        else:
            kernel_obj = kernel

        self.session.commit()
        self.session.refresh(kernel_obj)

        return {
            "id": kernel_obj.id,
            "name": kernel_obj.name,
            "type": "chrome",  # Default type for compatibility
            "browser_path": kernel_obj.executable_path,
            "executable_path": kernel_obj.executable_path,
            "version": kernel_obj.version,
            "is_default_record": kernel_obj.is_default_record,
            "is_default_agent": kernel_obj.is_default_agent,
        }

    def delete(self, kernel_id: str) -> bool:
        """Delete kernel by ID."""
        kernel = self.get_by_id(kernel_id)
        if kernel:
            self.session.delete(kernel)
            self.session.commit()
            return True
        return False

    def list(self) -> List[dict]:
        """List all kernels as dicts."""
        kernels = self.session.query(Kernel).all()
        return [
            {
                "id": k.id,
                "name": k.name,
                "type": "chrome",  # Default type for compatibility
                "browser_path": k.executable_path,
                "executable_path": k.executable_path,
                "version": k.version,
                "is_default_record": k.is_default_record,
                "is_default_agent": k.is_default_agent,
            }
            for k in kernels
        ]
