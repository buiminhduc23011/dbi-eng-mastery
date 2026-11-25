using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EngMastery.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddTypingAltTermsAndRetry : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "AltTermsJson",
                table: "VocabCards",
                type: "TEXT",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<DateOnly>(
                name: "LastFailedTypingDate",
                table: "VocabCards",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "SameDayTypingAttempts",
                table: "VocabCards",
                type: "INTEGER",
                nullable: false,
                defaultValue: 0);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "AltTermsJson",
                table: "VocabCards");

            migrationBuilder.DropColumn(
                name: "LastFailedTypingDate",
                table: "VocabCards");

            migrationBuilder.DropColumn(
                name: "SameDayTypingAttempts",
                table: "VocabCards");
        }
    }
}
