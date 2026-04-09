"""
Challenges services
"""

import logging
import shutil
import uuid
import math
import os

from typing import Optional
from fastapi import Request, UploadFile
from sqlalchemy import and_, or_, select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload, contains_eager
from sqlalchemy.orm.attributes import flag_modified

from src.exceptions.challenges import ChallengeAccessDeniedException, ChallengeContentFileException, ChallengeNotExistsException, ChallengeInvalidContentOrderException, ChallengeUnsupportedFileExtensionException
from src.exceptions.games import GameNotExistsException
from src.models.tags import Tag
from src.schemas.challenges import (
    ChallengeAddBlockRequestModel,
    ChallengeUpdateBlockRequestModel,
    ChallengeChangeBlocksOrderRequestModel,
    ChallengeResponseModel,
    ChallengeCreateRequestModel,
    ChallengeUpdateMainInfoRequestModel,
    ChallengeListResponseModel,
)
from src.models.challenges import Challenge
from src.models.games import Game
from src.utils.annotations.basic import SessionDep, UserContext
from src.utils.enums import ChallengeContentBlockType, UserRole

logger = logging.getLogger(__name__)

ALLOWED_PICTURES_MIME_TYPES = {
    "image/jpeg": [".jpg", ".jpeg"],
    "image/png": [".png"],
}


class ChallengesService:
    """
    Class contains buisness logic for challenges
    """

    def __init__(
        self, req: Request,
        session: AsyncSession,
        user: UserContext
    ):
        self._session = session
        self._user = user


    #
    # CHALLENGES
    #

    async def get_challenge(self, challenge_id: uuid.UUID) -> ChallengeResponseModel:
        """
        Find challenge by it id.
        Returns reponse model.
        """

        return ChallengeResponseModel.model_validate(
            await self._get_challenge(challenge_id)
        )


    async def create_challenge(self, schema: ChallengeCreateRequestModel) -> ChallengeResponseModel:
        """
        Creates challenge
        """

        game = await self._get_game(schema.game_id)

        schema.description.sort(key=lambda block: block.order)
        last_value = 0
        
        for block in schema.description:
            if last_value != block.order - 1:
                raise ChallengeInvalidContentOrderException()
            last_value += 1
        
        challenge_id = uuid.uuid4()

        try:
            dir_path = f"./challenges_pics/{challenge_id}/"
            os.makedirs(dir_path)

            card_picture_filename = "card_picture." + schema.card_picture_format

            with open(dir_path + card_picture_filename, "wb") as f:
                f.write(schema.card_picture)

            for block in schema.description:
                if block.type != ChallengeContentBlockType.PICTURE: continue

                filename = str(uuid.uuid4()) + "." + block.content.split(".")[1]
                block.content = str(challenge_id) + "/" + filename

                with open(dir_path + filename, "wb") as f:
                    f.write(block.picture)
        except Exception as e:
            raise ChallengeContentFileException()

        challenge = Challenge(
            id=challenge_id,
            game=game,
            name=schema.name,
            user_id=self._user.user_id,
            author_name=self._user.user_name,
            description=[block.model_dump(exclude={"picture"}) for block in schema.description],
            card_description=schema.card_description,
            card_picture_url=str(challenge_id) + "/" + card_picture_filename,
            tags=await self._add_tags(schema.tags),
        )
        
        self._session.add(challenge)
        await self._session.commit()

        return ChallengeResponseModel.model_validate(challenge)


    async def update_main_info(self, challenge_id: uuid.UUID, schema: ChallengeUpdateMainInfoRequestModel) -> ChallengeResponseModel:
        challenge = await self._get_challenge_with_owner_check(challenge_id)

        is_smth_changed = False

        if schema.card_description:
            challenge.card_description = schema.card_description
            is_smth_changed = True
        if schema.game_id:
            challenge.game_id = schema.game_id
            is_smth_changed = True
        if schema.name:
            challenge.name = schema.name
            is_smth_changed = True
        if schema.tags:
            challenge.tags = await self._add_tags(schema.tags)
            is_smth_changed = True

        if is_smth_changed:
            await self._session.commit()

        return ChallengeResponseModel.model_validate(challenge)


    async def delete_challenge(self, challenge_id: uuid.UUID) -> str:
        challenge = await self._get_challenge_with_owner_check(challenge_id)

        try:
            shutil.rmtree(f"./challenges_pics/{challenge_id}/")
        except FileNotFoundError as e:
            pass
        except Exception as e:
            raise 

        await self._session.delete(challenge)
        await self._session.commit()

        return "Challenge was successfully deleted"


    async def set_card_picture(self, challenge_id: uuid.UUID, picture: UploadFile) -> str:
        if picture.content_type not in ALLOWED_PICTURES_MIME_TYPES:
            raise ChallengeUnsupportedFileExtensionException()
        
        challenge = await self._get_challenge_with_owner_check(challenge_id)

        try:
            with open("./challenges_pics/" + challenge.card_picture_url, "wb") as f:
                f.write(await picture.read())
        except Exception as e:
            raise ChallengeContentFileException()

        return "Profile picture changed successfully"


    async def search_challenges(
        self, 
        key_str: Optional[str] = None, 
        tags: Optional[list[str]] = None, 
        game_id: Optional[uuid.UUID] = None,
        page_size: int = 10, 
        page_num: int = 1
    ) -> ChallengeListResponseModel:
        filters = []

        if key_str:
            search_pattern = f"%{key_str}%"
            filters.append(
                or_(
                    Challenge.name.ilike(search_pattern),
                    Challenge.author_name.ilike(search_pattern),
                    Game.name.ilike(search_pattern)
                )
            )

        if game_id:
            filters.append(Challenge.game_id == game_id)

        if tags:
            filters.append(Challenge.tags.any(Tag.name.in_(tags)))

        count_query = (
            select(func.count(Challenge.id))
            .select_from(Challenge)
            .join(Challenge.game)
            .where(and_(*filters) if filters else True)
        )
        
        total_count = (await self._session.execute(count_query)).scalar() or 0
        total_pages = math.ceil(total_count / page_size) if total_count > 0 else 1
        
        page_num = max(1, min(page_num, total_pages)) if total_pages > 0 else 1
        offset = (page_num - 1) * page_size

        if total_count > 0:
            data_query = (
                select(Challenge)
                .join(Challenge.game)
                .options(
                    contains_eager(Challenge.game),
                    joinedload(Challenge.tags)
                )
                .where(and_(*filters) if filters else True)
                .limit(page_size)
                .offset(offset)
                # .order_by(Challenge.name) 
            )

            result = await self._session.execute(data_query)
            
            challenges = result.unique().scalars().all()
        else:
            challenges = []

        return ChallengeListResponseModel(
            data=[ChallengeResponseModel.model_validate(c) for c in challenges],
            current_page=page_num,
            page_size=page_size,
            total_pages=total_pages
        )


    #
    # BLOCKS
    #

    async def add_block(self, challenge_id: uuid.UUID, schema: ChallengeAddBlockRequestModel) -> ChallengeResponseModel:
        challenge = await self._get_challenge_with_owner_check(challenge_id)

        if schema.block.order < 1 or schema.block.order > len(challenge.description) + 1:
            raise ChallengeInvalidContentOrderException()

        try:
            if schema.block.type == ChallengeContentBlockType.PICTURE:
                dir_path = f"./challenges_pics/{challenge_id}/"

                filename = str(uuid.uuid4()) + "." + schema.block.content.split(".")[1]
                schema.block.content = str(challenge_id) + "/" + filename

                with open(dir_path + filename, "wb") as f:
                    f.write(schema.block.picture)
        except Exception as e:
            raise ChallengeContentFileException()

        new_description = []

        for block in challenge.description:
            if block["order"] == schema.block.order:
                new_description.append(schema.block.model_dump(exclude={"picture"}))
                
            if block["order"] >= schema.block.order:
                block["order"] += 1

            new_description.append(block)
    
        challenge.description = new_description
        await self._session.commit()

        return ChallengeResponseModel.model_validate(challenge)


    async def update_block(self, challenge_id: uuid.UUID, block_id: int, schema: ChallengeUpdateBlockRequestModel) -> ChallengeResponseModel:
        challenge = await self._get_challenge_with_owner_check(challenge_id)

        schema.block.order = block_id
        if block_id < 1 or block_id > len(challenge.description):
            raise ChallengeInvalidContentOrderException()

        try:
            if challenge.description[block_id - 1]["type"] == ChallengeContentBlockType.PICTURE.value:
                os.remove("./challenges_pics/" + challenge.description[block_id - 1]["content"])

            if schema.block.type == ChallengeContentBlockType.PICTURE:
                dir_path = f"./challenges_pics/{challenge_id}/"

                filename = str(uuid.uuid4()) + "." + schema.block.content.split(".")[1]
                schema.block.content = str(challenge_id) + "/" + filename

                with open(dir_path + filename, "wb") as f:
                    f.write(schema.block.picture)
        except Exception as e:
            raise ChallengeContentFileException()
    
        challenge.description[block_id - 1] = schema.block.model_dump(exclude={"picture"})
        
        flag_modified(challenge, "description")
        await self._session.commit()

        return ChallengeResponseModel.model_validate(challenge)


    async def delete_block(self, challenge_id: uuid.UUID, block_id: int) -> ChallengeResponseModel:
        challenge = await self._get_challenge_with_owner_check(challenge_id)

        if block_id < 1 or block_id > len(challenge.description):
            raise ChallengeInvalidContentOrderException()

        try:
            if challenge.description[block_id - 1]["type"] == ChallengeContentBlockType.PICTURE.value:
                os.remove("./challenges_pics/" + challenge.description[block_id - 1]["content"])
        except Exception as e:
            raise ChallengeContentFileException()

        new_description = []

        for block in challenge.description:
            if block["order"] == block_id: continue

            if block["order"] >= block_id:
                block["order"] -= 1

            new_description.append(block)
    
        challenge.description = new_description
        await self._session.commit()

        return ChallengeResponseModel.model_validate(challenge)


    async def change_blocks_order(self, challenge_id: uuid.UUID, schema: ChallengeChangeBlocksOrderRequestModel) -> ChallengeResponseModel:
        challenge = await self._get_challenge_with_owner_check(challenge_id)

        if len(challenge.description) != len(schema.new_orders):
            raise ChallengeInvalidContentOrderException()

        pos_validation_check = [False for _ in range(len(challenge.description))]
        for pos in schema.new_orders:
            if (
                pos < 1
                or pos > len(challenge.description)
                or pos_validation_check[pos - 1]
            ):
                raise ChallengeInvalidContentOrderException()
            pos_validation_check[pos - 1] = True

        new_description = [
            challenge.description[pos - 1]
            for pos in schema.new_orders
        ]

        new_pos = 1
        for block in new_description:
            block["order"] = new_pos
            new_pos += 1 

        challenge.description = new_description
        await self._session.commit()

        return ChallengeResponseModel.model_validate(challenge)

    
    #
    # UTILS
    #

    async def _get_challenge(self, challenge_id: uuid.UUID) -> Challenge:
        """
        Finds challenge by id
        """

        challenge = (
            await self._session.execute(
                select(Challenge)
                .where(Challenge.id == challenge_id)
                .options(
                    joinedload(Challenge.game),
                    joinedload(Challenge.tags)
                )
            )
        ).scalar()

        if not challenge:
            raise ChallengeNotExistsException()

        return challenge

    
    async def _get_challenge_with_owner_check(self, challenge_id: uuid.UUID) -> Challenge:
        """
        Finds challenge by id and checks that current user is a owner (or admin)
        """

        challenge = (
            await self._session.execute(
                select(Challenge)
                .where(Challenge.id == challenge_id)
                .options(
                    joinedload(Challenge.game),
                    joinedload(Challenge.tags)
                )
            )
        ).scalar()

        if not challenge:
            raise ChallengeNotExistsException()

        logger.debug(f"User: {self._user.user_role} | {self._user.user_id} | {self._user.user_name} | {self._user.user_status}")
        if (
            self._user.user_role != UserRole.ADMIN
            and self._user.user_id != challenge.user_id
        ):
            raise ChallengeAccessDeniedException()

        return challenge
    

    async def _get_game(self, game_id: uuid.UUID) -> Game:
        """
        Finds game by id
        """

        game = (
            await self._session.execute(
                select(Game)
                .where(Game.id == game_id)
            )
        ).scalar()

        if not game:
            raise GameNotExistsException()

        return game


    async def _add_tags(self, tags_names: list[str]) -> list[Tag]:
        tags_objs = []
        new_tags = []

        for tag_name in set(tags_names):
            tag = (
                await self._session.execute(
                    select(Tag)
                    .where(Tag.name == tag_name)
                )
            ).scalar()

            if not tag:
                tag = Tag(name=tag_name)
                new_tags.append(tag)
            tags_objs.append(tag)

        self._session.add_all(new_tags)
        await self._session.flush()

        return tags_objs



async def get_challenges_service(req: Request, session: SessionDep, user: UserContext):
    return ChallengesService(req=req, session=session, user=user)
