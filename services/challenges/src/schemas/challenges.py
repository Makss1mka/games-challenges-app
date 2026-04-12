"""
Challenges schemas
"""

import json
from typing import Annotated, Literal, Optional
import logging
import uuid
from fastapi import File, Form, UploadFile
from pydantic import BaseModel, Field, field_serializer

from src.exceptions.challenges import ChallengeInvalidBodyDataException, ChallengePictureNotProvidedException
from src.schemas.games import GameResponseModel
from src.schemas.tags import TagResponseModel
from src.utils.enums import ChallengeStatusEnum, ChallengeContentBlockType

logger = logging.getLogger(__name__)


#
# CONTENT BLOCKS
#

class ContentBlock(BaseModel):
    type: ChallengeContentBlockType
    content: str
    order: int

    class Config:
        from_attributes = True


class TextContentBlock(ContentBlock):
    type: Literal[ChallengeContentBlockType.TEXT] = ChallengeContentBlockType.TEXT
    font_family: str = Field(default='Arial')
    font_size: str = Field(default='16px')
    font_weight: Literal['normal', 'bold', 'lighter'] = Field(default='normal')
    font_style: Literal['normal', 'italic'] = Field(default='normal')
    text_align: Literal['left', 'center', 'right', 'justify'] = Field(default='left')
    color: str = Field(default='#000000')
    line_height: str = Field(default='1.5')


class PictureContentBlock(ContentBlock):
    type: Literal[ChallengeContentBlockType.PICTURE] = ChallengeContentBlockType.PICTURE
    content: str = Field()
    alt_text: str = Field(default='')
    width: str = Field(default='auto')
    height: str = Field(default='auto')
    object_fit: Literal['contain', 'cover', 'fill', 'none'] = Field(default='contain')
    picture: Optional[bytes] = Field(None)


class LinkContentBlock(ContentBlock):
    type: Literal[ChallengeContentBlockType.LINK] = ChallengeContentBlockType.LINK
    content: str = Field()
    text: str = Field(default='')
    target: Literal['_self', '_blank', '_parent', '_top'] = Field(default='_blank')
    rel: str = Field(default='noopener noreferrer')


#
# REQUESTS
#

class ChallengeCreateRequestModel(BaseModel):
    game_id: uuid.UUID = Field(...)
    name: str = Field(..., min_length=1, max_length=50)
    description: list[
        Annotated[
            TextContentBlock | PictureContentBlock | LinkContentBlock, 
            Field(discriminator='type')
        ]
    ] = Field(default_factory=list)
    card_description: str = Field(..., min_length=1, max_length=250)
    card_picture_format: Optional[str] = Field(None, min_length=1, max_length=250)
    card_picture: Optional[bytes] = Field(None)
    tags: list[str] = Field(default_factory=list)

    class Config:
        from_attributes = True
        json_schema_extra = {
            "example": {
                "name": "challenge",
                "game_id": "441801ed-3163-4e8a-9693-2055b25529cb",
                "card_description": "Short text description",
                "description": [
                    {
                        "type": "text",
                        "content": "aboba",
                        "order": 1,
                        "font_family": "Arial",
                        "font_size": "16px",
                        "color": "#000000"
                    },
                    {
                        "type": "picture",
                        "content": "1",
                        "order": 2,
                        "alt_text": "Description"
                    },
                    {
                        "type": "link",
                        "content": "https://youtube.com",
                        "order": 3,
                        "text": "Go to youtube"
                    }
                ]
            }
        }

async def get_challenge_create_request_model_from_forms(
    name: str = Form(),
    game_id: uuid.UUID = Form(),
    description: str = Form(),
    tags: str = Form(),
    card_description: str = Form(),
    card_picture: UploadFile = File(),
    images: list[UploadFile] = File(),
) -> ChallengeCreateRequestModel:
    parsed_description = json.loads(description)
    images_map = {img.filename: img for img in images}

    for block in parsed_description:
        if block.get("type") == ChallengeContentBlockType.PICTURE:
            file_name = block.get("content")
            
            if file_name in images_map:
                block["picture"] = await images_map[file_name].read()
            else:
                raise ChallengePictureNotProvidedException()

    return ChallengeCreateRequestModel(
        name=name,
        game_id=game_id,
        description=parsed_description,
        tags=json.loads(tags),
        card_description=card_description,
        card_picture=await card_picture.read(),
        card_picture_format=card_picture.filename.split(".")[1],
    )


class ChallengeAddBlockRequestModel(BaseModel):
    block: Annotated[
        TextContentBlock | PictureContentBlock | LinkContentBlock, 
        Field(discriminator='type')
    ] = Field()

    class Config:
        from_attributes = True

async def get_challenge_add_block_request_model_from_forms(
    block: str = Form(),
    image: Optional[UploadFile] = File(None),
) -> ChallengeAddBlockRequestModel:
    parsed_block = json.loads(block)

    if parsed_block.get("type") == ChallengeContentBlockType.PICTURE:
        if not image:
            raise ChallengePictureNotProvidedException()
        parsed_block["picture"] = await image.read()

    return ChallengeAddBlockRequestModel(
        block=parsed_block
    )


class ChallengeUpdateBlockRequestModel(BaseModel):
    block: Annotated[
        TextContentBlock | PictureContentBlock | LinkContentBlock, 
        Field(discriminator='type')
    ] = Field()

    class Config:
        from_attributes = True

async def get_challenge_update_block_request_model_from_forms(
    block: str = Form(),
    image: Optional[UploadFile] = File(None),
) -> ChallengeUpdateBlockRequestModel:
    parsed_block = json.loads(block)

    if parsed_block.get("type") == ChallengeContentBlockType.PICTURE:
        if not image:
            raise ChallengePictureNotProvidedException()
        parsed_block["picture"] = await image.read()

    return ChallengeUpdateBlockRequestModel(
        block=parsed_block
    )


class ChallengeUpdateMainInfoRequestModel(BaseModel):
    game_id: Optional[uuid.UUID] = Field(None)
    name: Optional[str] = Field(None, min_length=1, max_length=50)
    card_description: Optional[str] = Field(None, min_length=1, max_length=250)
    tags: Optional[list[str]] = Field(None)

    class Config:
        from_attributes = True
        json_schema_extra = {
            "example": {
                "game_id": "441801ed-3163-4e8a-9693-2055b25529cb",
                "name": "new name"
            }
        }


class ChallengeChangeBlocksOrderRequestModel(BaseModel):
    new_orders: list[int] = Field(...)


#
# RESPONSES
#

class ChallengeResponseModel(BaseModel):
    id: uuid.UUID = Field(...)
    author_id: uuid.UUID = Field(..., alias="user_id")

    name: str = Field(..., min_length=1, max_length=50)
    description: list[
        Annotated[
            TextContentBlock | PictureContentBlock | LinkContentBlock, 
            Field(discriminator='type')
        ]
    ] = Field(...)

    card_description: str = Field(..., min_length=1, max_length=250)
    card_picture_url: str = Field(..., min_length=1, max_length=250)

    tags: list[TagResponseModel] = Field(...)
    game: GameResponseModel = Field(...)

    status: ChallengeStatusEnum = Field(...)

    likes_count: int = Field(...)
    dislikes_count: int = Field(...)
    comments_count: int = Field(...)

    class Config:
        from_attributes = True

    @field_serializer('tags')
    def serialize_tags(self, tags: list[TagResponseModel]) -> list[str]:
        return [tag.name for tag in tags]

class ChallengeListResponseModel(BaseModel):
    data: list[ChallengeResponseModel]
    current_page: int
    page_size: int
    total_pages: int

