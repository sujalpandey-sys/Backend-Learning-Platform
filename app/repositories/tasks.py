from typing import Any

from sqlalchemy import asc, desc, func, select
from sqlalchemy.orm import Session

from app.core.exceptions import BadRequestException
from app.models.task import Task, TaskPriority, TaskStatus

# Allowlist for secure sorting to prevent SQL injection or attribute exposure
ALLOWED_SORT_FIELDS = {
    "created_at": Task.created_at,
    "updated_at": Task.updated_at,
    "due_date": Task.due_date,
    "title": Task.title,
    "priority": Task.priority,
    "status": Task.status,
}


class TaskRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, task_id: int, owner_id: int) -> Task | None:
        """Fetch task strictly filtered by owner_id to enforce row-level tenant boundary."""
        stmt = select(Task).where(Task.id == task_id, Task.owner_id == owner_id)
        return self.db.scalars(stmt).first()

    def list(
        self,
        owner_id: int,
        status: TaskStatus | None = None,
        priority: TaskPriority | None = None,
        search: str | None = None,
        sort_by: str = "created_at",
        sort_order: str = "desc",
        limit: int = 10,
        offset: int = 0,
    ) -> tuple[list[Task], int]:
        """
        List user tasks with filtering, search, strict sort validation, and pagination.
        Returns (tasks, total_count).
        """
        query = select(Task).where(Task.owner_id == owner_id)

        if status:
            query = query.where(Task.status == status)
        if priority:
            query = query.where(Task.priority == priority)
        if search:
            # Safe parameterized ILIKE / LIKE search
            query = query.where(Task.title.ilike(f"%{search.strip()}%"))

        # Calculate total matching count
        count_stmt = select(func.count()).select_from(query.subquery())
        total = self.db.scalar(count_stmt) or 0

        # Validate sorting against whitelist
        if sort_by not in ALLOWED_SORT_FIELDS:
            allowed = ", ".join(ALLOWED_SORT_FIELDS.keys())
            raise BadRequestException(f"Invalid sort field '{sort_by}'. Allowed fields: {allowed}")

        col = ALLOWED_SORT_FIELDS[sort_by]
        order_clause = desc(col) if sort_order.lower() == "desc" else asc(col)
        query = query.order_by(order_clause)

        # Pagination
        query = query.offset(offset).limit(limit)
        items = list(self.db.scalars(query).all())

        return items, total

    def create(self, owner_id: int, data: dict[str, Any]) -> Task:
        task = Task(owner_id=owner_id, **data)
        self.db.add(task)
        self.db.commit()
        self.db.refresh(task)
        return task

    def update(self, task: Task, update_data: dict[str, Any]) -> Task:
        for key, value in update_data.items():
            if value is not None:
                setattr(task, key, value)
        self.db.commit()
        self.db.refresh(task)
        return task

    def delete(self, task: Task) -> None:
        self.db.delete(task)
        self.db.commit()
