def test_create_task(client, user_a_headers):
    response = client.post(
        "/api/v1/tasks",
        headers=user_a_headers,
        json={
            "title": "Set up CI pipeline",
            "description": "Configure GitHub Actions workflow for test suite",
            "priority": "high",
            "status": "pending",
        },
    )
    assert response.status_code == 201
    data = response.json()
    assert data["title"] == "Set up CI pipeline"
    assert data["priority"] == "high"
    assert data["status"] == "pending"
    assert "id" in data
    assert "created_at" in data


def test_list_tasks_pagination_and_filter(client, user_a_headers):
    # Seed 3 tasks for user A
    for i in range(1, 4):
        client.post(
            "/api/v1/tasks",
            headers=user_a_headers,
            json={
                "title": f"Task item {i}",
                "priority": "urgent" if i == 1 else "low",
                "status": "completed" if i == 2 else "pending",
            },
        )

    # Test list pagination
    res = client.get("/api/v1/tasks?limit=2&offset=0", headers=user_a_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["total"] == 3
    assert len(data["items"]) == 2

    # Test filtering by status
    res_filter = client.get("/api/v1/tasks?status=completed", headers=user_a_headers)
    assert res_filter.status_code == 200
    filter_data = res_filter.json()
    assert filter_data["total"] == 1
    assert filter_data["items"][0]["title"] == "Task item 2"

    # Test title search
    res_search = client.get("/api/v1/tasks?search=item 3", headers=user_a_headers)
    assert res_search.status_code == 200
    search_data = res_search.json()
    assert search_data["total"] == 1
    assert search_data["items"][0]["title"] == "Task item 3"


def test_task_crud_lifecycle(client, user_a_headers):
    # 1. Create
    res = client.post(
        "/api/v1/tasks",
        headers=user_a_headers,
        json={"title": "Test CRUD", "priority": "low"},
    )
    task_id = res.json()["id"]

    # 2. Read single
    get_res = client.get(f"/api/v1/tasks/{task_id}", headers=user_a_headers)
    assert get_res.status_code == 200
    assert get_res.json()["title"] == "Test CRUD"

    # 3. Patch
    patch_res = client.patch(
        f"/api/v1/tasks/{task_id}",
        headers=user_a_headers,
        json={"status": "in_progress", "priority": "high"},
    )
    assert patch_res.status_code == 200
    assert patch_res.json()["status"] == "in_progress"
    assert patch_res.json()["priority"] == "high"

    # 4. Delete
    del_res = client.delete(f"/api/v1/tasks/{task_id}", headers=user_a_headers)
    assert del_res.status_code == 204

    # 5. Verify deleted
    verify_res = client.get(f"/api/v1/tasks/{task_id}", headers=user_a_headers)
    assert verify_res.status_code == 404


def test_cross_user_isolation(client, user_a_headers, user_b_headers):
    """
    Critical security test:
    User A creates a task.
    User B must NOT be able to read, update, or delete User A's task.
    """
    # User A creates a secret task
    res_a = client.post(
        "/api/v1/tasks",
        headers=user_a_headers,
        json={"title": "Confidential Task of User A"},
    )
    assert res_a.status_code == 201
    task_id = res_a.json()["id"]

    # User B attempts to read User A's task
    res_read = client.get(f"/api/v1/tasks/{task_id}", headers=user_b_headers)
    assert res_read.status_code == 404

    # User B attempts to modify User A's task
    res_update = client.patch(
        f"/api/v1/tasks/{task_id}",
        headers=user_b_headers,
        json={"title": "Hacked Title"},
    )
    assert res_update.status_code == 404

    # User B attempts to delete User A's task
    res_delete = client.delete(f"/api/v1/tasks/{task_id}", headers=user_b_headers)
    assert res_delete.status_code == 404

    # User B lists their own tasks; User A's task must not leak
    list_b = client.get("/api/v1/tasks", headers=user_b_headers)
    assert list_b.status_code == 200
    assert list_b.json()["total"] == 0
