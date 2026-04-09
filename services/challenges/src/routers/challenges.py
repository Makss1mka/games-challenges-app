"""
Api router for challenges
"""

from pathlib import Path
from fastapi.responses import FileResponse
from src.exceptions.challenges import ChallengeAccessDeniedException, ChallengeFileIsDirectoryException, ChallengeFileNotFoundException, ChallengeInvalidFilePathException
from src.middlewares.access_control import require_access
from src.schemas.challenges import ChallengeChangeBlocksOrderRequestModel, ChallengeUpdateMainInfoRequestModel
from src.utils.annotations.services import (
    ChallengesServiceDep,
    ChallengeCreateRequestModelDep,
    ChallengeAddBlockRequestModelDep,
    ChallengeUpdateBlockRequestModelDep,
)
from src.utils.enums import UserRole
from src.utils.responses import CommonJSONResponse

from fastapi import APIRouter, File, Request, Response, UploadFile, Query
from typing import Optional
import logging
import uuid

logger = logging.getLogger(__name__)
challenges_router = APIRouter()



#
# BLOCKS
#

@challenges_router.post(
    "/{challenge_id}/blocks",
    response_class=CommonJSONResponse,
    status_code=201
)
@require_access(
    allowed_roles=[UserRole.USER, UserRole.ADMIN],
    require_authentication=True
)
async def add_block(
    challenge_id: uuid.UUID,
    schema: ChallengeAddBlockRequestModelDep,
    challenges_service: ChallengesServiceDep,
    req: Request
):
    return await challenges_service.add_block(challenge_id=challenge_id, schema=schema)


@challenges_router.patch(
    "/{challenge_id}/blocks/change_order",
    response_class=CommonJSONResponse,
)
@require_access(
    allowed_roles=[UserRole.USER, UserRole.ADMIN],
    require_authentication=True
)
async def blocks_change_order(
    challenge_id: uuid.UUID,
    schema: ChallengeChangeBlocksOrderRequestModel,
    challenges_service: ChallengesServiceDep,
    req: Request
):
    return await challenges_service.change_blocks_order(
        challenge_id=challenge_id,
        schema=schema,
    )


@challenges_router.post(
    "/{challenge_id}/set_card_picture",
    response_class=CommonJSONResponse,
)
@require_access(
    allowed_roles=[UserRole.USER, UserRole.ADMIN],
    require_authentication=True
)
async def set_card_picture(
    challenge_id: uuid.UUID,
    challenges_service: ChallengesServiceDep,
    req: Request,
    picture: UploadFile = File(),
):
    return await challenges_service.set_card_picture(
        challenge_id=challenge_id,
        picture=picture,
    )


@challenges_router.patch(
    "/{challenge_id}/blocks/{block_id}",
    response_class=CommonJSONResponse,
)
@require_access(
    allowed_roles=[UserRole.USER, UserRole.ADMIN],
    require_authentication=True
)
async def update_block(
    challenge_id: uuid.UUID,
    block_id: int,
    schema: ChallengeUpdateBlockRequestModelDep,
    challenges_service: ChallengesServiceDep,
    req: Request
):
    return await challenges_service.update_block(
        challenge_id=challenge_id,
        block_id=block_id,
        schema=schema
    )


@challenges_router.delete(
    "/{challenge_id}/blocks/{block_id}",
    response_class=CommonJSONResponse,
)
@require_access(
    allowed_roles=[UserRole.USER, UserRole.ADMIN],
    require_authentication=True
)
async def delete_block(
    challenge_id: uuid.UUID,
    block_id: int,
    challenges_service: ChallengesServiceDep,
    req: Request
):
    return await challenges_service.delete_block(
        challenge_id=challenge_id,
        block_id=block_id
    )


#
# CHALLENGES
#

@challenges_router.get(
    "/search",
    response_class=CommonJSONResponse,
    status_code=200
)
async def get_challenge(
    challenges_service: ChallengesServiceDep,
    req: Request,
    key_str: Optional[str] = Query(None),
    tags: Optional[list[str]] = Query(None),
    game_id: Optional[uuid.UUID] = Query(None),
    page_size: int = Query(10, ge=1, le=100),
    page_num: int = Query(1, ge=1),
):
    return await challenges_service.search_challenges(
        key_str=key_str,
        tags=tags,
        game_id=game_id,
        page_size=page_size,
        page_num=page_num
    )


@challenges_router.get(
    "/{challenge_id}",
    response_class=CommonJSONResponse,
    status_code=200
)
async def get_challenge(
    challenge_id: uuid.UUID,
    challenges_service: ChallengesServiceDep,
    req: Request
):
    return await challenges_service.get_challenge(challenge_id)


@challenges_router.post(
    "/",
    response_class=CommonJSONResponse,
    status_code=201
)
@require_access(
    allowed_roles=[UserRole.USER, UserRole.ADMIN],
    require_authentication=True
)
async def create_challenge(
    schema: ChallengeCreateRequestModelDep,
    challenges_service: ChallengesServiceDep,
    req: Request
):
    return await challenges_service.create_challenge(schema=schema)


@challenges_router.patch(
    "/{challenge_id}",
    response_class=CommonJSONResponse,
)
@require_access(
    allowed_roles=[UserRole.USER, UserRole.ADMIN],
    require_authentication=True
)
async def update_challenge_main_info(
    challenge_id: uuid.UUID,
    schema: ChallengeUpdateMainInfoRequestModel,
    challenges_service: ChallengesServiceDep,
    req: Request
):
    return await challenges_service.update_main_info(
        challenge_id=challenge_id,
        schema=schema
    )


@challenges_router.delete(
    "/{challenge_id}",
    response_class=CommonJSONResponse,
)
@require_access(
    allowed_roles=[UserRole.USER, UserRole.ADMIN],
    require_authentication=True
)
async def delete_challenge(
    challenge_id: uuid.UUID,
    challenges_service: ChallengesServiceDep,
    req: Request
):
    return await challenges_service.delete_challenge(challenge_id=challenge_id)


@challenges_router.get(
    "/file/{file_path:path}",
    response_class=CommonJSONResponse,
)
async def get_file(
    file_path: str,
):
    base_dir = Path("./challenges_pics").resolve()
    full_path = base_dir / file_path
    
    try:
        full_path = (base_dir / file_path).resolve()
        
        if not str(full_path).startswith(str(base_dir.resolve())):
            raise ChallengeAccessDeniedException()
    except Exception as e:
        logger.info(e)
        raise ChallengeInvalidFilePathException()
    
    if not full_path.exists():
        raise ChallengeFileNotFoundException()
    
    if not full_path.is_file():
        raise ChallengeFileIsDirectoryException()

    return FileResponse(full_path)

