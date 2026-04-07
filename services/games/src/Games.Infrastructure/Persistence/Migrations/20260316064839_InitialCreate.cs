using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Games.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.EnsureSchema(
                name: "games");

            migrationBuilder.CreateTable(
                name: "games",
                schema: "games",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Title = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: false),
                    Slug = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: false),
                    Description = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: true),
                    Developer = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: true),
                    Publisher = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: true),
                    ReleaseDate = table.Column<DateOnly>(type: "date", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_games", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "tags",
                schema: "games",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tags", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "user_library_items",
                schema: "games",
                columns: table => new
                {
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    GameId = table.Column<Guid>(type: "uuid", nullable: false),
                    Source = table.Column<int>(type: "integer", nullable: false),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    AddedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_user_library_items", x => new { x.UserId, x.GameId });
                    table.ForeignKey(
                        name: "FK_user_library_items_games_GameId",
                        column: x => x.GameId,
                        principalSchema: "games",
                        principalTable: "games",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "game_tags",
                schema: "games",
                columns: table => new
                {
                    GameId = table.Column<Guid>(type: "uuid", nullable: false),
                    TagId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_game_tags", x => new { x.GameId, x.TagId });
                    table.ForeignKey(
                        name: "FK_game_tags_games_GameId",
                        column: x => x.GameId,
                        principalSchema: "games",
                        principalTable: "games",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_game_tags_tags_TagId",
                        column: x => x.TagId,
                        principalSchema: "games",
                        principalTable: "tags",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_game_tags_TagId",
                schema: "games",
                table: "game_tags",
                column: "TagId");

            migrationBuilder.CreateIndex(
                name: "IX_games_Slug",
                schema: "games",
                table: "games",
                column: "Slug",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_games_Title",
                schema: "games",
                table: "games",
                column: "Title");

            migrationBuilder.CreateIndex(
                name: "IX_tags_Name",
                schema: "games",
                table: "tags",
                column: "Name",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_user_library_items_GameId",
                schema: "games",
                table: "user_library_items",
                column: "GameId");

            migrationBuilder.CreateIndex(
                name: "IX_user_library_items_Status",
                schema: "games",
                table: "user_library_items",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_user_library_items_UserId",
                schema: "games",
                table: "user_library_items",
                column: "UserId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "game_tags",
                schema: "games");

            migrationBuilder.DropTable(
                name: "user_library_items",
                schema: "games");

            migrationBuilder.DropTable(
                name: "tags",
                schema: "games");

            migrationBuilder.DropTable(
                name: "games",
                schema: "games");
        }
    }
}
