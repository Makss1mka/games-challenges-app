"""
Services annotations
"""

from typing import Annotated

from fastapi import Depends

from src.services.challenges import ChallengesService, get_challenges_service
from src.schemas.challenges import (
    ChallengeCreateRequestModel,
    ChallengeAddBlockRequestModel,
    ChallengeUpdateBlockRequestModel,
    ChallengeUpdateMainInfoRequestModel,
    get_challenge_create_request_model_from_forms,
    get_challenge_add_block_request_model_from_forms,
    get_challenge_update_block_request_model_from_forms,
)

ChallengesServiceDep = Annotated[ChallengesService, Depends(get_challenges_service)]
ChallengeCreateRequestModelDep = Annotated[ChallengeCreateRequestModel, Depends(get_challenge_create_request_model_from_forms)]
ChallengeAddBlockRequestModelDep = Annotated[ChallengeAddBlockRequestModel, Depends(get_challenge_add_block_request_model_from_forms)]
ChallengeUpdateBlockRequestModelDep = Annotated[ChallengeUpdateBlockRequestModel, Depends(get_challenge_update_block_request_model_from_forms)]
