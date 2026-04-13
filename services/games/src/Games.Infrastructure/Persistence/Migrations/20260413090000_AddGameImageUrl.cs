using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Games.Infrastructure.Persistence.Migrations
{
    public partial class AddGameImageUrl : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ImageUrl",
                schema: "games",
                table: "games",
                type: "character varying(1024)",
                maxLength: 1024,
                nullable: true);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ImageUrl",
                schema: "games",
                table: "games");
        }
    }
}
