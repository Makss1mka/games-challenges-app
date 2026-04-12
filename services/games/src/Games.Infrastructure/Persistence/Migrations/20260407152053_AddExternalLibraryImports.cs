using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Games.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddExternalLibraryImports : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "game_external_mappings",
                schema: "games",
                columns: table => new
                {
                    Source = table.Column<int>(type: "integer", nullable: false),
                    ExternalGameId = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                    GameId = table.Column<Guid>(type: "uuid", nullable: false),
                    ExternalTitle = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: false),
                    LastSyncedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_game_external_mappings", x => new { x.Source, x.ExternalGameId });
                    table.ForeignKey(
                        name: "FK_game_external_mappings_games_GameId",
                        column: x => x.GameId,
                        principalSchema: "games",
                        principalTable: "games",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_game_external_mappings_GameId",
                schema: "games",
                table: "game_external_mappings",
                column: "GameId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "game_external_mappings",
                schema: "games");
        }
    }
}
