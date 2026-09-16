import requests
import json
import sys

BASE_URL = 'http://127.0.0.1:8000'

def test_full_application():
    print("=== Starting FlowVibe End-to-End System Tests ===")
    session = requests.Session()

    # 1. Test Static & HTML Pages
    pages = [
        '/',
        '/login.html',
        '/register.html',
        '/dashboard.html',
        '/project.html',
        '/profile.html',
        '/css/style.css',
        '/css/responsive.css',
        '/js/api.js',
        '/js/auth.js',
        '/js/dashboard.js',
        '/js/project.js',
        '/js/tasks.js',
        '/js/comments.js',
        '/js/websocket.js',
        '/js/firebase-config.js',
        '/js/firebase-auth.js'
    ]
    for page in pages:
        res = session.get(f"{BASE_URL}{page}")
        assert res.status_code == 200, f"Page {page} returned status {res.status_code}"
        print(f"  [PASS] GET {page} [200 OK]")

    # 2. Test Open Unauthenticated Data Access & Proper Auth Separation
    anon_session = requests.Session()
    anon_user_res = anon_session.get(f"{BASE_URL}/api/auth/user/")
    assert anon_user_res.status_code == 401, f"Expected 401 for unauthenticated /api/auth/user/, got {anon_user_res.status_code}"
    print(f"  [PASS] Unauthenticated access to /api/auth/user/ correctly returned 401 Unauthorized (Prevents redirect loop)")

    anon_projects_res = anon_session.get(f"{BASE_URL}/api/projects/")
    assert anon_projects_res.status_code == 200
    print(f"  [PASS] Unauthenticated access to /api/projects/ succeeded [200 OK] (Open data access)")

    # Test Firebase dynamic configuration loaded from .env
    fb_config_res = session.get(f"{BASE_URL}/api/auth/firebase/config/")
    assert fb_config_res.status_code == 200
    fb_cfg = fb_config_res.json()
    assert fb_cfg.get('projectId') == 'flowvibe-cae1c', f"Expected projectId 'flowvibe-cae1c', got {fb_cfg.get('projectId')}"
    assert fb_cfg.get('apiKey') == 'AIzaSyB7VHSug5M9r5wJY2Pv5RImIlFKFYLerbU'
    print(f"  [PASS] Firebase config loaded dynamically from .env: {fb_cfg['projectId']}")

    # 3. Get CSRF Token
    csrf_res = session.get(f"{BASE_URL}/api/auth/csrf/")
    assert csrf_res.status_code == 200
    csrf_data = csrf_res.json()
    csrf_token = csrf_data.get('csrfToken') or session.cookies.get('csrftoken')
    assert csrf_token, "Failed to get CSRF token"
    session.headers.update({'X-CSRFToken': csrf_token, 'Referer': BASE_URL})
    print(f"  [PASS] CSRF Token Acquired")

    # 4. Test Optional Authentication Login (graceful support)
    login_res = session.post(f"{BASE_URL}/api/auth/login/", json={
        'username': 'flowvibe',
        'password': 'password123'
    })
    assert login_res.status_code == 200, f"Login failed: {login_res.text}"
    user_data = login_res.json()
    assert 'username' in user_data
    session.headers.update({'X-CSRFToken': session.cookies.get('csrftoken')})
    print(f"  [PASS] Authenticated user '{user_data['username']}' (Session established)")

    # 5. Fetch Current User Profile & Stats
    user_res = session.get(f"{BASE_URL}/api/auth/user/")
    assert user_res.status_code == 200
    user_info = user_res.json()
    assert 'stats' in user_info
    print(f"  [PASS] Retrieved user profile with productivity stats: {user_info['stats']}")

    # 6. List Projects
    projects_res = session.get(f"{BASE_URL}/api/projects/")
    assert projects_res.status_code == 200
    projects = projects_res.json()
    assert isinstance(projects, list)
    print(f"  [PASS] Retrieved {len(projects)} projects for user")

    # 7. Create New Project
    new_proj_res = session.post(f"{BASE_URL}/api/projects/", json={
        'name': 'E2E Verification Project',
        'description': 'Created by automated end-to-end integration test runner'
    })
    assert new_proj_res.status_code == 201, f"Project creation failed: {new_proj_res.text}"
    new_proj = new_proj_res.json()
    proj_id = new_proj['id']
    print(f"  [PASS] Created new Project ID {proj_id}: '{new_proj['name']}'")

    # 8. Register a real collaborator & Add to Project
    requests.post(f"{BASE_URL}/api/auth/register/", json={
        'username': 'collaborator',
        'email': 'collaborator@flowvibe.io',
        'password': 'StrongPassword123!',
        'first_name': 'Team',
        'last_name': 'Collaborator'
    })
    add_mem_res = session.post(f"{BASE_URL}/api/projects/{proj_id}/members/", json={
        'username_or_email': 'collaborator'
    })
    assert add_mem_res.status_code == 200
    print(f"  [PASS] Added member 'collaborator' to project {proj_id}")

    # 8. Create Task
    task_res = session.post(f"{BASE_URL}/api/projects/{proj_id}/tasks/", json={
        'title': 'Setup E2E Automated Validation',
        'description': 'Verify all REST endpoints, WebSocket routing, and UI templates',
        'priority': 'HIGH',
        'status': 'TODO'
    })
    assert task_res.status_code == 201, f"Task creation failed: {task_res.text}"
    task = task_res.json()
    task_id = task['id']
    print(f"  [PASS] Created Task ID {task_id}: '{task['title']}' with status 'TODO'")

    # 9. Update Task Status (Kanban Move -> IN_PROGRESS -> DONE)
    move_res1 = session.patch(f"{BASE_URL}/api/tasks/{task_id}/status/", json={
        'status': 'IN_PROGRESS'
    })
    assert move_res1.status_code == 200
    assert move_res1.json()['status'] == 'IN_PROGRESS'

    move_res2 = session.patch(f"{BASE_URL}/api/tasks/{task_id}/status/", json={
        'status': 'DONE'
    })
    assert move_res2.status_code == 200
    assert move_res2.json()['status'] == 'DONE'
    print(f"  [PASS] Kanban task status transitions verified: TODO -> IN_PROGRESS -> DONE")

    # 10. Post Task Comment
    comment_res = session.post(f"{BASE_URL}/api/comments/task/{task_id}/", json={
        'content': 'All tests passed successfully on live server!'
    })
    assert comment_res.status_code == 201
    comment = comment_res.json()
    comment_id = comment['id']
    print(f"  [PASS] Created Comment ID {comment_id} on Task {task_id}")

    # 11. Edit Task Comment
    edit_com_res = session.patch(f"{BASE_URL}/api/comments/{comment_id}/", json={
        'content': 'All tests passed with 100% success rate!'
    })
    assert edit_com_res.status_code == 200
    assert edit_com_res.json()['content'] == 'All tests passed with 100% success rate!'
    print(f"  [PASS] Edited Comment ID {comment_id}")

    # 12. Fetch Project Analytics & Stats
    stats_res = session.get(f"{BASE_URL}/api/projects/{proj_id}/stats/")
    assert stats_res.status_code == 200
    stats = stats_res.json()
    assert stats['status_counts']['done'] == 1
    assert stats['progress_percent'] == 100
    print(f"  [PASS] Project Stats Analytics verified: {stats['progress_percent']}% complete")

    # 13. Delete Test Project
    del_res = session.delete(f"{BASE_URL}/api/projects/{proj_id}/")
    assert del_res.status_code == 204
    print(f"  [PASS] Cleaned up test project ID {proj_id}")

    # 14. Test Logout and Confirm Session is Terminated
    logout_res = session.post(f"{BASE_URL}/api/auth/logout/")
    assert logout_res.status_code == 200
    post_logout_user_res = session.get(f"{BASE_URL}/api/auth/user/")
    assert post_logout_user_res.status_code == 401, f"Expected 401 after logout, got {post_logout_user_res.status_code}"
    print(f"  [PASS] Logout terminated session properly; /api/auth/user/ returned 401 Unauthorized")

    print("\n=======================================================")
    print("  ALL 14 END-TO-END VERIFICATION CHECKS PASSED! [PASS]")
    print("=======================================================")

if __name__ == '__main__':
    test_full_application()
