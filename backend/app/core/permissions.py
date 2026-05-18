from enum import Enum
from fastapi import HTTPException, Depends
from app.core.deps import get_current_user

class Role(str, Enum):
    admin = "admin"
    manager = "manager"
    viewer = "viewer"
    accountant = "accountant"

# What each role can do
PERMISSIONS = {
    Role.admin: {"create", "read", "update", "delete", "manage_users", "view_audit"},
    Role.manager: {"create", "read", "update", "view_audit"},
    Role.viewer: {"read"},
    Role.accountant: {"read", "create_invoice", "update_invoice", "delete_invoice", "view_financials"},
}

def can(role: str, action: str) -> bool:
    return action in PERMISSIONS.get(Role(role), set())

def require_permission(action: str):
    def checker(current_user=Depends(get_current_user)):
        if not can(current_user.role, action):
            raise HTTPException(status_code=403, detail=f"Permission denied: requires '{action}'")
        return current_user
    return checker
