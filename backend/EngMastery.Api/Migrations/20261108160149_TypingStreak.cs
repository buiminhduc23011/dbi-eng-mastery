using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EngMastery.Api.Migrations
{
    /// <inheritdoc />
    public partial class TypingStreak : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "ConsecutiveTypingPasses",
                table: "VocabCards",
                type: "INTEGER",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<DateOnly>(
                name: "LastTypingPassDate",
                table: "VocabCards",
                type: "TEXT",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ConsecutiveTypingPasses",
                table: "VocabCards");

            migrationBuilder.DropColumn(
                name: "LastTypingPassDate",
                table: "VocabCards");
        }
    }
}
