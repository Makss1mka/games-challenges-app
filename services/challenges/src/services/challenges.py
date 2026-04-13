"""
Challenges services
"""

import logging
import shutil
import uuid
import math
import os
import httpx

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
    ChallengeCommentResponseModel,
    ChallengeCommentUpdateRequestModel,
    ChallengeCommentsListResponseModel,
    ChallengeReactionResponseModel,
)
from src.models.challenges import Challenge
from src.models.comments import ChallengeComment
from src.models.reactions import ChallengeLike, ChallengeDislike
from src.models.games import Game
from src.utils.annotations.basic import SessionDep, UserContext
from src.utils.enums import ChallengeContentBlockType, UserRole

logger = logging.getLogger(__name__)

ALLOWED_PICTURES_MIME_TYPES = {
    "image/jpeg": [".jpg", ".jpeg"],
    "image/png": [".png"],
}

GAMES_API_URL = os.environ.get("GAMES_API_URL", "http://games-api:8080")


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

        card_picture_url = schema.card_picture_url
        if schema.card_picture:
            try:
                dir_path = f"./challenges_pics/{challenge_id}/"
                os.makedirs(dir_path, exist_ok=True)

                card_picture_filename = "card_picture." + (schema.card_picture_format or "png")

                with open(dir_path + card_picture_filename, "wb") as f:
                    f.write(schema.card_picture)

                card_picture_url = str(challenge_id) + "/" + card_picture_filename

                for block in schema.description:
                    if block.type != ChallengeContentBlockType.PICTURE:
                        continue
                    if isinstance(block.content, str) and block.content.startswith(("http://", "https://")):
                        continue

                    filename = str(uuid.uuid4()) + "." + block.content.split(".")[1]
                    block.content = str(challenge_id) + "/" + filename

                    with open(dir_path + filename, "wb") as f:
                        f.write(block.picture)
            except Exception as e:
                raise ChallengeContentFileException()
        else:
            if not card_picture_url:
                raise ChallengeContentFileException()

        challenge = Challenge(
            id=challenge_id,
            game=game,
            name=schema.name,
            user_id=self._user.user_id,
            author_name=self._user.user_name,
            description=[block.model_dump(exclude={"picture"}) for block in schema.description],
            card_description=schema.card_description,
            card_picture_url=card_picture_url,
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


    async def add_comment(
        self,
        challenge_id: uuid.UUID,
        message: str,
        screenshots: Optional[list[UploadFile]] = None
    ) -> ChallengeCommentResponseModel:
        if not self._user.user_id:
            raise ChallengeAccessDeniedException()

        challenge = await self._get_challenge(challenge_id)

        attachments: list[str] = []
        if screenshots:
            dir_path = f"./challenges_pics/{challenge_id}/comments/{uuid.uuid4()}/"
            os.makedirs(dir_path, exist_ok=True)
            for file in screenshots:
                if not file.filename:
                    continue
                file_name = os.path.basename(file.filename)
                file_path = os.path.join(dir_path, file_name)
                with open(file_path, "wb") as handle:
                    handle.write(await file.read())
                relative_path = file_path.replace("./challenges_pics/", "")
                attachments.append(relative_path)

        comment = ChallengeComment(
            challenge_id=challenge_id,
            user_id=self._user.user_id,
            author_name=self._user.user_name or "User",
            message=message,
            attachments=attachments
        )

        challenge.comments_count += 1
        self._session.add(comment)
        await self._session.commit()

        return ChallengeCommentResponseModel.model_validate(comment)


    async def update_comment(
        self,
        challenge_id: uuid.UUID,
        comment_id: uuid.UUID,
        schema: ChallengeCommentUpdateRequestModel
    ) -> ChallengeCommentResponseModel:
        if not self._user.user_id:
            raise ChallengeAccessDeniedException()

        comment = (
            await self._session.execute(
                select(ChallengeComment)
                .where(
                    ChallengeComment.id == comment_id,
                    ChallengeComment.challenge_id == challenge_id
                )
            )
        ).scalar()

        if not comment:
            raise ChallengeNotExistsException()

        if self._user.user_role != UserRole.ADMIN and comment.user_id != self._user.user_id:
            raise ChallengeAccessDeniedException()

        comment.message = schema.message
        await self._session.commit()

        return ChallengeCommentResponseModel.model_validate(comment)


    async def delete_comment(
        self,
        challenge_id: uuid.UUID,
        comment_id: uuid.UUID
    ) -> str:
        if not self._user.user_id:
            raise ChallengeAccessDeniedException()

        comment = (
            await self._session.execute(
                select(ChallengeComment)
                .where(
                    ChallengeComment.id == comment_id,
                    ChallengeComment.challenge_id == challenge_id
                )
            )
        ).scalar()

        if not comment:
            raise ChallengeNotExistsException()

        if self._user.user_role != UserRole.ADMIN and comment.user_id != self._user.user_id:
            raise ChallengeAccessDeniedException()

        try:
            if comment.attachments:
                for path in comment.attachments:
                    try:
                        os.remove(os.path.join("./challenges_pics", path))
                    except FileNotFoundError:
                        pass
        except Exception:
            raise ChallengeContentFileException()

        await self._session.delete(comment)
        await self._session.commit()

        return "Comment was successfully deleted"


    async def list_comments(
        self,
        challenge_id: uuid.UUID,
        page_size: int = 10,
        page_num: int = 1
    ) -> ChallengeCommentsListResponseModel:
        count_query = (
            select(func.count(ChallengeComment.id))
            .where(ChallengeComment.challenge_id == challenge_id)
        )
        total_count = (await self._session.execute(count_query)).scalar() or 0
        total_pages = math.ceil(total_count / page_size) if total_count > 0 else 1
        page_num = max(1, min(page_num, total_pages)) if total_pages > 0 else 1
        offset = (page_num - 1) * page_size

        data_query = (
            select(ChallengeComment)
            .where(ChallengeComment.challenge_id == challenge_id)
            .order_by(ChallengeComment.created_at.desc())
            .limit(page_size)
            .offset(offset)
        )
        result = await self._session.execute(data_query)
        comments = result.scalars().all()

        return ChallengeCommentsListResponseModel(
            data=[ChallengeCommentResponseModel.model_validate(c) for c in comments],
            current_page=page_num,
            page_size=page_size,
            total_pages=total_pages
        )


    async def react_to_challenge(self, challenge_id: uuid.UUID, reaction: str) -> ChallengeReactionResponseModel:
        if not self._user.user_id:
            raise ChallengeAccessDeniedException()

        challenge = await self._get_challenge(challenge_id)
        user_id = self._user.user_id

        if reaction == "like":
            existing_like = await self._session.execute(
                select(ChallengeLike).where(
                    ChallengeLike.challenge_id == challenge_id,
                    ChallengeLike.user_id == user_id
                )
            )
            like = existing_like.scalar()
            existing_dislike = await self._session.execute(
                select(ChallengeDislike).where(
                    ChallengeDislike.challenge_id == challenge_id,
                    ChallengeDislike.user_id == user_id
                )
            )
            dislike = existing_dislike.scalar()

            if like:
                await self._session.delete(like)
                challenge.likes_count = max(0, challenge.likes_count - 1)
            else:
                if dislike:
                    await self._session.delete(dislike)
                    challenge.dislikes_count = max(0, challenge.dislikes_count - 1)
                self._session.add(ChallengeLike(challenge_id=challenge_id, user_id=user_id))
                challenge.likes_count += 1

        if reaction == "dislike":
            existing_dislike = await self._session.execute(
                select(ChallengeDislike).where(
                    ChallengeDislike.challenge_id == challenge_id,
                    ChallengeDislike.user_id == user_id
                )
            )
            dislike = existing_dislike.scalar()
            existing_like = await self._session.execute(
                select(ChallengeLike).where(
                    ChallengeLike.challenge_id == challenge_id,
                    ChallengeLike.user_id == user_id
                )
            )
            like = existing_like.scalar()

            if dislike:
                await self._session.delete(dislike)
                challenge.dislikes_count = max(0, challenge.dislikes_count - 1)
            else:
                if like:
                    await self._session.delete(like)
                    challenge.likes_count = max(0, challenge.likes_count - 1)
                self._session.add(ChallengeDislike(challenge_id=challenge_id, user_id=user_id))
                challenge.dislikes_count += 1

        await self._session.commit()
        return ChallengeReactionResponseModel(
            likes_count=challenge.likes_count,
            dislikes_count=challenge.dislikes_count
        )


    async def search_challenges(
        self, 
        key_str: Optional[str] = None, 
        tags: Optional[list[str]] = None, 
        game_id: Optional[uuid.UUID] = None,
        user_id: Optional[uuid.UUID] = None,
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

        if user_id:
            filters.append(Challenge.user_id == user_id)

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
            fetched = await self._fetch_game_from_catalog(game_id)
            if not fetched:
                raise GameNotExistsException()

            author_name = fetched.get("title") or str(game_id)
            game = Game(
                id=game_id,
                name=fetched.get("title") or str(game_id),
                author_name=author_name,
            )
            self._session.add(game)
            await self._session.commit()

        return game

    async def _fetch_game_from_catalog(self, game_id: uuid.UUID) -> Optional[dict]:
        url = f"{GAMES_API_URL.rstrip('/')}/api/games/{game_id}"
        try:
            async with httpx.AsyncClient(timeout=5) as client:
                response = await client.get(url)
                if response.status_code == 404:
                    return None
                response.raise_for_status()
                return response.json()
        except Exception:
            return None


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
