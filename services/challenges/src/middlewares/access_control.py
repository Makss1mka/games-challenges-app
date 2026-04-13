"""
Tools for setting access
"""

from src.exceptions.users import UserAccessfailedException
from src.middlewares.auth import get_user_context
from fastapi import Request, HTTPException
from src.utils.enums import UserRole
from typing import List, Callable
from functools import wraps

import logging
import uuid

logger = logging.getLogger(__name__)


class AccessControl:   
    def __init__(
        self,
        allowed_roles: List[UserRole] = None,
        require_authentication: bool = True,
        allowed_statuses: List[str] = None,
        resource_owner_check: bool = False
    ):
        self.allowed_roles = allowed_roles or [UserRole.GUEST]
        self.require_authentication = require_authentication
        self.allowed_statuses = allowed_statuses or ["ACTIVE"]
        self.resource_owner_check = resource_owner_check
    
    def check_access(self, user_context, resource_owner_id: str = None) -> bool:
        if self.require_authentication and not user_context.is_authenticated:
            return False
        
        if user_context.user_role not in self.allowed_roles:
            return False
        
        if user_context.user_status and user_context.user_status.value not in self.allowed_statuses:
            return False
        
        if self.resource_owner_check and resource_owner_id:
            if user_context.user_id != resource_owner_id and not user_context.is_admin:
                return False
        
        return True


def require_access(
    allowed_roles: List[UserRole] = None,
    require_authentication: bool = True,
    allowed_statuses: List[str] = None,
    resource_owner_check: bool = False
):
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        async def wrapper(*args, **kwargs):
            request = None
            for arg in kwargs.values():
                if isinstance(arg, Request):
                    request = arg
                    break
            
            if not request:
                raise HTTPException(status_code=500, detail="Request not found")
            
            user_context = get_user_context(request)
            access_control = AccessControl(
                allowed_roles=allowed_roles,
                require_authentication=require_authentication,
                allowed_statuses=allowed_statuses,
                resource_owner_check=resource_owner_check
            )
            
            resource_owner_id = None
            if resource_owner_check and 'user_id' in kwargs:
                resource_owner_id = kwargs['user_id']
            
            if not access_control.check_access(user_context, resource_owner_id):
                raise UserAccessfailedException()
            
            return await func(*args, **kwargs)
        
        return wrapper
    return decorator


def check_resource_access(
    user_context,
    resource_status: str,
    resource_owner_id: uuid.UUID = None,
    allowed_statuses: List[str] = list()
) -> bool: 
    if len(allowed_statuses) == 0:
        allowed_statuses.append("ACTIVE")
    
    if user_context.is_admin:
        return True
    
    if resource_owner_id and user_context.user_id == resource_owner_id:
        return True
    
    return resource_status in allowed_statuses


def get_resource_access_response(resource_status: str) -> dict:
    status_messages = {
        "PRIVATE": "This resource is private",
        "BLOCKED": "This resource is blocked",
        "ON_MODERATE": "This resource is under moderation",
        "ON_APILATION": "This resource is under application"
    }
    
    return {
        "status": resource_status,
        "message": status_messages.get(resource_status, "Access denied")
    }


