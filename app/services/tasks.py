import logging

from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundException
from app.models.task import Task, TaskPriority, TaskStatus
from app.models.user import User
from app.repositories.tasks import TaskRepository
from app.schemas.task import TaskCreate, TaskPaginationResponse, TaskResponse, TaskUpdate
from app.services.cache import cache_service

logger = logging.getLogger(__name__)


def background_audit_event(action: str, task_id: int, user_id: int, detail: str) -> None:
    """
    Simulated non-critical background audit task executed by FastAPI BackgroundTasks.
    Demonstrates background worker flow without heavyweight message broker requirements.
    """
    logger.info(
        "AUDIT EVENT: action=%s task_id=%d user_id=%d detail=%s",
        action,
        task_id,
        user_id,
        detail,
    )


class TaskService:
    def __init__(self, db: Session):
        self.db = db
        self.repo = TaskRepository(db)

    def create_task(self, user: User, task_in: TaskCreate) -> Task:
        data = task_in.model_dump()
        task = self.repo.create(owner_id=user.id, data=data)
        # Invalidate cached task listings for this user
        cache_service.invalidate_user_tasks(user.id)
        return task

    def get_task(self, user: User, task_id: int) -> Task:
        task = self.repo.get_by_id(task_id=task_id, owner_id=user.id)
        if not task:
            raise NotFoundException(f"Task with id {task_id} not found.")
        return task

    def list_tasks(
        self,
        user: User,
        status: TaskStatus | None = None,
        priority: TaskPriority | None = None,
        search: str | None = None,
        sort_by: str = "created_at",
        sort_order: str = "desc",
        limit: int = 10,
        offset: int = 0,
    ) -> TaskPaginationResponse:
        # Cache key incorporates user ID and all filter query parameters
        cache_key = (
            f"tasks:user:{user.id}:st={status}:pr={priority}:q={search}:"
            f"sb={sort_by}:so={sort_order}:l={limit}:o={offset}"
        )

        cached_data = cache_service.get(cache_key)
        if cached_data is not None:
            return TaskPaginationResponse(**cached_data)

        items, total = self.repo.list(
            owner_id=user.id,
            status=status,
            priority=priority,
            search=search,
            sort_by=sort_by,
            sort_order=sort_order,
            limit=limit,
            offset=offset,
        )

        response = TaskPaginationResponse(
            total=total,
            limit=limit,
            offset=offset,
            items=[TaskResponse.model_validate(item) for item in items],
        )

        cache_service.set(cache_key, response.model_dump())
        return response

    def update_task(self, user: User, task_id: int, task_in: TaskUpdate) -> Task:
        task = self.get_task(user, task_id)
        update_data = task_in.model_dump(exclude_unset=True)
        updated = self.repo.update(task, update_data)
        cache_service.invalidate_user_tasks(user.id)
        return updated

    def delete_task(self, user: User, task_id: int) -> None:
        task = self.get_task(user, task_id)
        self.repo.delete(task)
        cache_service.invalidate_user_tasks(user.id)
