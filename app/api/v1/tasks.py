from fastapi import APIRouter, BackgroundTasks, Depends, Query, status
from sqlalchemy.orm import Session

from app.dependencies.auth import get_current_user
from app.dependencies.database import get_db
from app.models.task import TaskPriority, TaskStatus
from app.models.user import User
from app.schemas.task import TaskCreate, TaskPaginationResponse, TaskResponse, TaskUpdate
from app.services.tasks import TaskService, background_audit_event

router = APIRouter(prefix="/tasks", tags=["Tasks"])


@router.post("", response_model=TaskResponse, status_code=status.HTTP_201_CREATED)
def create_task(
    task_in: TaskCreate,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> TaskResponse:
    """Create a new task belonging to the authenticated user."""
    service = TaskService(db)
    task = service.create_task(user=current_user, task_in=task_in)

    # Trigger lightweight asynchronous background audit log
    background_tasks.add_task(
        background_audit_event,
        action="TASK_CREATED",
        task_id=task.id,
        user_id=current_user.id,
        detail=f"Task '{task.title}' created.",
    )

    return TaskResponse.model_validate(task)


@router.get("", response_model=TaskPaginationResponse)
def list_tasks(
    status: TaskStatus | None = Query(None, description="Filter by task status"),
    priority: TaskPriority | None = Query(None, description="Filter by task priority"),
    search: str | None = Query(None, description="Search tasks by title"),
    sort_by: str = Query(
        "created_at",
        description="Field to sort by: created_at, updated_at, due_date, title, priority, status",
    ),
    sort_order: str = Query("desc", pattern="^(asc|desc)$", description="Sort order: asc or desc"),
    limit: int = Query(10, ge=1, le=100, description="Items per page"),
    offset: int = Query(0, ge=0, description="Page offset"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> TaskPaginationResponse:
    """
    List tasks owned by the authenticated user with filtering, pagination, search, and sorting.
    Cached via Redis when configured.
    """
    service = TaskService(db)
    return service.list_tasks(
        user=current_user,
        status=status,
        priority=priority,
        search=search,
        sort_by=sort_by,
        sort_order=sort_order,
        limit=limit,
        offset=offset,
    )


@router.get("/{task_id}", response_model=TaskResponse)
def get_task(
    task_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> TaskResponse:
    """Retrieve a single task by ID. Enforces ownership authorization."""
    service = TaskService(db)
    task = service.get_task(user=current_user, task_id=task_id)
    return TaskResponse.model_validate(task)


@router.patch("/{task_id}", response_model=TaskResponse)
def update_task(
    task_id: int,
    task_in: TaskUpdate,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> TaskResponse:
    """Partially update an existing task owned by the authenticated user."""
    service = TaskService(db)
    task = service.update_task(user=current_user, task_id=task_id, task_in=task_in)

    background_tasks.add_task(
        background_audit_event,
        action="TASK_UPDATED",
        task_id=task.id,
        user_id=current_user.id,
        detail=f"Task {task.id} updated.",
    )

    return TaskResponse.model_validate(task)


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_task(
    task_id: int,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    """Delete a task owned by the authenticated user."""
    service = TaskService(db)
    service.delete_task(user=current_user, task_id=task_id)

    background_tasks.add_task(
        background_audit_event,
        action="TASK_DELETED",
        task_id=task_id,
        user_id=current_user.id,
        detail=f"Task {task_id} deleted.",
    )
