using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EngMastery.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddTypingAttemptCap : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "SameDayAttemptCap",
                table: "VocabCards",
                type: "INTEGER",
                nullable: false,
                defaultValue: 0);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "SameDayAttemptCap",
                table: "VocabCards");
        }
    }
}
